const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const logger = require('../utils/logger');
const Helpers = require('../utils/helpers');
const CloudflareService = require('./CloudflareService');
const SMSService = require('./SMSService');
const AdsPowerService = require('./AdsPowerService');

puppeteer.use(StealthPlugin());

class FacebookBotService {
  constructor() {
    this.browser = null;
    this.page = null;
    this.timeout = process.env.TIMEOUT || 30000;
    this.adsPowerProfileId = null;
  }

  async launch(options = {}) {
    try {
      const useAdsPower = AdsPowerService.isEnabled();

      if (useAdsPower) {
        return await this.launchWithAdsPower(options);
      } else {
        return await this.launchWithPuppeteer(options);
      }
    } catch (error) {
      logger.error(`Erro ao iniciar navegador: ${error.message}`);
      throw error;
    }
  }

  async launchWithAdsPower(options = {}) {
    try {
      logger.info('🌐 Iniciando com AdsPower...');

      // Primeiro, tentar encontrar browsers já abertos
      logger.info('🔍 Procurando browsers abertos no AdsPower...');
      const openedBrowsers = await this.detectOpenedAdsPowerBrowsers();

      if (openedBrowsers.length > 0) {
        logger.info(`✅ ${openedBrowsers.length} browser(s) aberto(s) detectado(s)`);
        const wsUrl = openedBrowsers[0].ws_debugger_url;
        this.adsPowerProfileId = openedBrowsers[0].profile_id;

        logger.info(`🔗 Conectando Puppeteer ao AdsPower...`);
        this.browser = await AdsPowerService.connectToPuppeteer(wsUrl);
        this.page = await this.browser.newPage();

        await this.page.setDefaultTimeout(this.timeout);
        await this.page.setDefaultNavigationTimeout(this.timeout);
        await this.page.setUserAgent(Helpers.randomUserAgent());

        logger.info('✅ Navegador AdsPower conectado com sucesso');
        return;
      }

      // Se não há browsers abertos, tentar abrir um
      logger.info('Nenhum browser aberto. Tentando abrir um...');

      const profiles = await AdsPowerService.listProfiles();
      if (profiles.length === 0) {
        throw new Error('Nenhum perfil AdsPower disponível');
      }

      const profileId = profiles[0].profile_id;
      this.adsPowerProfileId = profileId;

      logger.info(`🔓 Abrindo perfil AdsPower: ${profileId}`);
      const result = await AdsPowerService.openProfile(profileId);

      logger.info(`🔗 Conectando Puppeteer ao AdsPower...`);
      this.browser = await AdsPowerService.connectToPuppeteer(result.wsUrl);
      this.page = await this.browser.newPage();

      await this.page.setDefaultTimeout(this.timeout);
      await this.page.setDefaultNavigationTimeout(this.timeout);
      await this.page.setUserAgent(Helpers.randomUserAgent());

      logger.info('✅ Navegador AdsPower iniciado com sucesso');
    } catch (error) {
      logger.error(`Erro ao iniciar AdsPower: ${error.message}`);
      throw error;
    }
  }

  async detectOpenedAdsPowerBrowsers() {
    try {
      const { execSync } = require('child_process');

      const output = execSync('npx ads get-opened-browser', {
        encoding: 'utf8',
        stdio: ['pipe', 'pipe', 'pipe']
      }).toString();

      const cleanOutput = output.replace(/\x1b\[[0-9;]*m/g, '');
      const lastIdx = cleanOutput.lastIndexOf('}');

      if (lastIdx === -1) return [];

      let startIdx = lastIdx;
      let braceCount = 1;
      for (let i = lastIdx - 1; i >= 0; i--) {
        if (cleanOutput[i] === '}') braceCount++;
        if (cleanOutput[i] === '{') braceCount--;
        if (braceCount === 0) {
          startIdx = i;
          break;
        }
      }

      const data = JSON.parse(cleanOutput.substring(startIdx, lastIdx + 1));
      return data.list || [];
    } catch (error) {
      logger.warn(`Erro ao detectar browsers abertos: ${error.message}`);
      return [];
    }
  }

  async launchWithPuppeteer(options = {}) {
    try {
      logger.info('🌐 Iniciando navegador Puppeteer...');

      const launchOptions = {
        headless: process.env.HEADLESS !== 'false',
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-web-resources',
          '--disable-extensions'
        ],
        ...options
      };

      if (options.proxy) {
        launchOptions.args.push(`--proxy-server=${options.proxy}`);
      }

      this.browser = await puppeteer.launch(launchOptions);
      this.page = await this.browser.newPage();

      await this.page.setDefaultTimeout(this.timeout);
      await this.page.setDefaultNavigationTimeout(this.timeout);
      await this.page.setUserAgent(Helpers.randomUserAgent());

      logger.info('✅ Navegador Puppeteer iniciado com sucesso');
    } catch (error) {
      logger.error(`Erro ao iniciar Puppeteer: ${error.message}`);
      throw error;
    }
  }

  async close() {
    try {
      if (this.browser) {
        await this.browser.close();
        logger.info('✅ Navegador fechado');
      }

      if (this.adsPowerProfileId && AdsPowerService.isEnabled()) {
        logger.info(`🔒 Fechando perfil AdsPower: ${this.adsPowerProfileId}`);
        await AdsPowerService.closeProfile(this.adsPowerProfileId);
      }
    } catch (error) {
      logger.error(`Erro ao fechar navegador: ${error.message}`);
    }
  }

  async login(email, password) {
    try {
      logger.info(`Fazendo login com: ${email}`);

      await this.page.goto('https://www.facebook.com', { waitUntil: 'networkidle2' });
      await Helpers.randomDelay();

      // Preencher email/UID
      await this.page.type('input[name="email"]', email, { delay: 50 });
      await Helpers.randomDelay(300, 800);

      // Preencher senha
      await this.page.type('input[name="pass"]', password, { delay: 50 });
      await Helpers.randomDelay(300, 800);

      // Clique no botão login
      await this.page.click('button[name="login"]');
      await this.page.waitForNavigation({ waitUntil: 'networkidle2' });

      logger.info('Login realizado com sucesso');
      return true;
    } catch (error) {
      logger.error(`Erro ao fazer login: ${error.message}`);
      throw error;
    }
  }

  async handle2FA(twoFAUrl) {
    try {
      logger.info('Processando autenticação 2FA...');

      // Abrir aba do autenticador
      await this.page.goto(twoFAUrl, { waitUntil: 'networkidle2' });
      await Helpers.randomDelay();

      // Extrair código 2FA (implementação específica do site)
      const code = await this.page.evaluate(() => {
        const codeElement = document.querySelector('[class*="code"]') ||
                           document.querySelector('[class*="totp"]');
        return codeElement ? codeElement.innerText.trim() : null;
      });

      if (!code) {
        logger.warn('Não foi possível extrair código 2FA automaticamente');
        return null;
      }

      logger.info(`Código 2FA extraído: ${code}`);
      return code;
    } catch (error) {
      logger.error(`Erro ao processar 2FA: ${error.message}`);
      throw error;
    }
  }

  async enterCode2FA(code) {
    try {
      logger.info('Inserindo código 2FA...');

      // Tentar diferentes seletores possíveis
      const selectors = [
        'input[aria-label*="code"]',
        'input[placeholder*="code"]',
        'input[type="text"]',
        '#auth_code'
      ];

      for (const selector of selectors) {
        const element = await this.page.$(selector);
        if (element) {
          await this.page.type(selector, code, { delay: 100 });
          await Helpers.randomDelay();
          await this.page.click('button[type="submit"]');
          await this.page.waitForNavigation({ waitUntil: 'networkidle2' });
          logger.info('Código 2FA enviado');
          return true;
        }
      }

      logger.warn('Não foi possível encontrar campo de código 2FA');
      return false;
    } catch (error) {
      logger.error(`Erro ao inserir código 2FA: ${error.message}`);
      throw error;
    }
  }

  async handleModals() {
    try {
      logger.info('Processando modals...');

      // Array de padrões de botões para modals
      const modalPatterns = [
        'button:contains("Permitir")',
        'button:contains("Allow All")',
        'button:contains("Confiar neste dispositivo")',
        'button:contains("Trust this device")',
        'button:contains("Concordo")',
        'button:contains("Agree")',
        'button[aria-label*="allow"]',
        'button[aria-label*="trust"]',
        'button[aria-label*="agree"]'
      ];

      // Encontrar e clicar em botões de modals
      const buttons = await this.page.$$('button');
      for (const btn of buttons) {
        const text = await btn.evaluate(el => el.innerText);
        if (/allow|permitir|confiar|trust|concordo|agree|continuar|continue/i.test(text)) {
          await btn.click();
          await Helpers.randomDelay(500, 1500);
        }
      }

      logger.info('Modals processados');
      return true;
    } catch (error) {
      logger.error(`Erro ao processar modals: ${error.message}`);
      throw error;
    }
  }

  async setLanguageToPortuguese() {
    try {
      logger.info('Configurando idioma para Português Brasileiro...');

      // Ir para configurações de idioma & região
      await this.page.goto('https://www.facebook.com/settings/?tab=language_and_region', { waitUntil: 'networkidle2' });
      await Helpers.randomDelay(2000);

      logger.info('   🔍 Procurando por "Idioma da conta"...');

      // Clicar em "Idioma da conta" para abrir as opções
      const accountLanguageClicked = await this.page.evaluate(() => {
        const spans = Array.from(document.querySelectorAll('span'));
        const accountLanguageSpan = spans.find(span =>
          span.textContent?.trim() === 'Idioma da conta'
        );

        if (accountLanguageSpan) {
          // Procurar pelo elemento clicável pai
          let clickableParent = accountLanguageSpan.parentElement;
          let depth = 0;
          while (clickableParent && depth < 10) {
            const role = clickableParent.getAttribute('role');
            const classes = clickableParent.className;

            if (role === 'button' || classes?.includes('x1qjc9v5') ||
                (clickableParent.tagName === 'DIV' && clickableParent.offsetHeight > 30)) {
              clickableParent.click();
              return true;
            }

            clickableParent = clickableParent.parentElement;
            depth++;
          }
        }
        return false;
      });

      if (accountLanguageClicked) {
        logger.info('   ✅ "Idioma da conta" clicado');
        await Helpers.randomDelay(2000);
      } else {
        logger.warn('   ⚠️ "Idioma da conta" não encontrado');
      }

      // Procurar por "Brasil (português)" ou "Brasil português"
      logger.info('   🔍 Procurando por opção de Brasil...');

      const brazilSelected = await this.page.evaluate(() => {
        const spans = Array.from(document.querySelectorAll('span'));
        const brazilSpan = spans.find(span => {
          const text = span.textContent?.trim() || '';
          return text.includes('Brasil') && (text.includes('português') || text.includes('Portuguese'));
        });

        if (brazilSpan) {
          // Procurar pelo elemento clicável pai (radio button, button, etc)
          let clickableParent = brazilSpan.parentElement;
          let depth = 0;
          while (clickableParent && depth < 10) {
            const role = clickableParent.getAttribute('role');
            if (role === 'radio' || role === 'button' || (clickableParent.offsetHeight > 20 && clickableParent.onclick)) {
              clickableParent.click();
              return true;
            }
            clickableParent = clickableParent.parentElement;
            depth++;
          }
        }
        return false;
      });

      if (brazilSelected) {
        logger.info('   ✅ Brasil selecionado');
        await Helpers.randomDelay(1000);
      } else {
        logger.warn('   ⚠️ Não conseguiu selecionar Brasil');
      }

      logger.info('✅ Idioma configurado para Português Brasileiro');
      return true;
    } catch (error) {
      logger.error(`Erro ao configurar idioma: ${error.message}`);
      throw error;
    }
  }

  async createBusinessPortfolio(businessName, cnpjInfo) {
    try {
      logger.info(`Criando portfolio de negócio: ${businessName}`);

      const url = 'https://business.facebook.com/business/loginpage/?login_options[0]=FB&login_options[1]=IG&login_options[2]=SSO&config_ref=biz_login_tool_flavor_mbs&create_business_portfolio_for_bm=1';

      await this.page.goto(url, { waitUntil: 'networkidle2' });
      await Helpers.randomDelay();

      // Aguardar e preencher modal
      await this.page.waitForSelector('input[name="business_name"]', { timeout: 10000 });

      // Preencher nome da empresa
      await this.page.type('input[name="business_name"]', businessName, { delay: 50 });
      await Helpers.randomDelay();

      // Preencher nome da pessoa
      const personNameSelectors = ['input[name="person_name"]', 'input[name="name"]'];
      for (const selector of personNameSelectors) {
        if (await this.page.$(selector)) {
          await this.page.type(selector, cnpjInfo.personName, { delay: 50 });
          break;
        }
      }
      await Helpers.randomDelay();

      // Preencher email
      await this.page.type('input[name="email"]', cnpjInfo.email, { delay: 50 });
      await Helpers.randomDelay();

      // Clicar em próximo/continuar
      const nextBtn = await this.page.$('button[aria-label*="Continue"]') ||
                     await this.page.$('button:contains("Continuar")') ||
                     await this.page.$('button[type="submit"]');
      if (nextBtn) {
        await nextBtn.click();
        await this.page.waitForNavigation({ waitUntil: 'networkidle2' });
      }

      logger.info('Portfolio de negócio criado com sucesso');
      return true;
    } catch (error) {
      logger.error(`Erro ao criar portfolio: ${error.message}`);
      throw error;
    }
  }

  async configureDomain(domainName, isWorkerDomain = false) {
    try {
      const displayName = isWorkerDomain ? `Worker: ${domainName}` : `Domínio: ${domainName}`;
      logger.info(`Configurando ${displayName}`);

      const sanitizedDomain = isWorkerDomain ? domainName : Helpers.sanitizeDomain(domainName);

      // Ir para configurações de domínio
      const businessId = await this.extractBusinessId();
      if (!businessId) {
        throw new Error('Não foi possível extrair ID da empresa');
      }

      const domainUrl = `https://business.facebook.com/latest/settings/domains?business_id=${businessId}`;
      await this.page.goto(domainUrl, { waitUntil: 'networkidle2' });
      await Helpers.randomDelay();

      // Clicar em Adicionar Domínio
      const addBtn = await this.page.$('button:contains("Adicionar")') ||
                    await this.page.$('button[aria-label*="Add"]');
      if (addBtn) {
        await addBtn.click();
        await Helpers.randomDelay(1000);
      }

      // Preencher nome do domínio
      await this.page.type('input[placeholder*="domain"]', sanitizedDomain, { delay: 50 });
      await Helpers.randomDelay();

      // Clicar próximo
      const nextBtn = await this.page.$('button:contains("Avançar")') ||
                     await this.page.$('button:contains("Next")');
      if (nextBtn) {
        await nextBtn.click();
        await Helpers.randomDelay(2000);
      }

      logger.info('Domínio configurado com sucesso');
      return sanitizedDomain;
    } catch (error) {
      logger.error(`Erro ao configurar domínio: ${error.message}`);
      throw error;
    }
  }

  async verifyDomain(businessId, domainName) {
    try {
      logger.info(`Verificando domínio: ${domainName}`);

      const url = `https://business.facebook.com/latest/settings/domains?business_id=${businessId}`;
      await this.page.goto(url, { waitUntil: 'networkidle2' });
      await Helpers.randomDelay();

      // Procurar e clicar em "Verificar Domínio"
      const verifyButtons = await this.page.$$('button');
      for (const btn of verifyButtons) {
        const text = await btn.evaluate(el => el.innerText);
        if (/verific|verify/i.test(text)) {
          await btn.click();
          await Helpers.randomDelay(2000);
          break;
        }
      }

      logger.info('Domínio verificado');
      return true;
    } catch (error) {
      logger.error(`Erro ao verificar domínio: ${error.message}`);
      throw error;
    }
  }

  async createWhatsAppAccount(businessId, accountName) {
    try {
      logger.info(`Criando conta WhatsApp: ${accountName}`);

      const url = `https://business.facebook.com/latest/settings/whatsapp_account?business_id=${businessId}`;
      await this.page.goto(url, { waitUntil: 'networkidle2' });
      await Helpers.randomDelay();

      // Clicar em Adicionar
      const addBtn = await this.page.$('button:contains("Adicionar")') ||
                    await this.page.$('button[aria-label*="Add"]');
      if (addBtn) {
        await addBtn.click();
        await Helpers.randomDelay(1000);
      }

      // Preencher nome
      await this.page.type('input[name*="name"]', accountName, { delay: 50 });
      await Helpers.randomDelay();

      // Selecionar categoria "Outro"
      const categorySelects = await this.page.$$('select');
      if (categorySelects.length > 0) {
        await categorySelects[0].evaluate((el) => {
          const option = Array.from(el.options).find(o => /outro|other/i.test(o.textContent));
          if (option) el.value = option.value;
        });
      }

      logger.info('Conta WhatsApp criada com sucesso');
      return true;
    } catch (error) {
      logger.error(`Erro ao criar conta WhatsApp: ${error.message}`);
      throw error;
    }
  }

  async extractBusinessId() {
    try {
      const businessId = await this.page.evaluate(() => {
        // Procurar em URLs
        const url = window.location.href;
        const match = url.match(/business_id=(\d+)/);
        if (match) return match[1];

        // Procurar em dados da página
        const scriptTags = document.querySelectorAll('script');
        for (const tag of scriptTags) {
          const content = tag.innerText;
          const match = content.match(/"business_id":"(\d+)"/);
          if (match) return match[1];
        }

        return null;
      });

      return businessId;
    } catch (error) {
      logger.error(`Erro ao extrair Business ID: ${error.message}`);
      return null;
    }
  }

  async screenshot(filename) {
    try {
      await this.page.screenshot({ path: filename });
      logger.info(`Screenshot salvo: ${filename}`);
    } catch (error) {
      logger.error(`Erro ao tirar screenshot: ${error.message}`);
    }
  }
}

module.exports = FacebookBotService;
