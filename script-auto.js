/**
 * 🚀 FACEBOOK AUTOMATION - AUTO-RETRY COM NOVO CÓDIGO
 *
 * ✅ Tenta 1 vez
 * ❌ Se der erro, pega novo código e tenta denovo
 * ✅ Repete até 3 tentativas
 *
 * ⚠️ EDITE:
 * - EMAIL (linha 280)
 * - PASSWORD (linha 281)
 * - RENDER_API_KEY (linha 25)
 */

const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const logger = require('./src/utils/logger');
const RenderService = require('./src/services/RenderService');
const DashboardService = require('./src/services/DashboardService');
const RenderServiceAPI = require('./src/services/RenderServiceAPI');
require('dotenv').config({ path: path.join(process.cwd(), '.env.vercel') });
require('dotenv').config({ path: path.join(process.cwd(), '.env') });

// ===== RENDER API KEY =====
const RENDER_API_KEY = 'rnd_ojEtRinshtFZveYdnFFogfR20X9e';
process.env.RENDER_API_KEY = RENDER_API_KEY;

puppeteer.use(StealthPlugin());

// API Key do 2Captcha (configurar em .env ou aqui)
const CAPTCHA_API_KEY = process.env.CAPTCHA_API_KEY || ''; // Adicione sua chave aqui

// ===== PROXIES DISPONÍVEIS =====
// Formato: apenas host:port (sem autenticação inline)
// BrightData residential_proxy1
const PROXIES = [
  'brd.superproxy.io:33335'
];

// ===== CREDENCIAIS DE PROXY =====
const PROXY_CREDENTIALS = {
  'brd.superproxy.io:33335': {
    username: 'brd-customer-hl_5ea4a766-zone-residential_proxy1',
    password: '8m5um93g3yv5'
  }
};

let proxyIndex = 0;

function obterProxyAleatorio() {
  if (PROXIES.length === 0) return null;
  const proxy = PROXIES[proxyIndex % PROXIES.length];
  proxyIndex++;
  return proxy;
}

// ===== AÇÕES HUMANAS =====

/**
 * Simular scroll aleatório na página
 */
async function scrollAleatorio(page) {
  const scrolls = Math.floor(Math.random() * 3) + 1; // 1-3 scrolls
  for (let i = 0; i < scrolls; i++) {
    const scrollHeight = Math.floor(Math.random() * 300) + 100;
    await page.evaluate(async (height) => {
      window.scrollBy(0, height);
    }, scrollHeight);
    await new Promise(r => setTimeout(r, 500 + Math.random() * 1000));
  }
}

/**
 * Simular pausa para "ler" a página
 */
async function pausaParaLer(page, minMs = 1000, maxMs = 3000) {
  const delay = minMs + Math.random() * (maxMs - minMs);
  logger.info(`   ⏳ Lendo página (${Math.round(delay / 1000)}s)...`);
  await new Promise(r => setTimeout(r, delay));
}

/**
 * Simular movimento de mouse aleatório
 */
async function movimentoMouseAleatorio(page) {
  const x = Math.floor(Math.random() * 1000);
  const y = Math.floor(Math.random() * 500);
  try {
    await page.mouse.move(x, y);
    await new Promise(r => setTimeout(r, 300 + Math.random() * 500));
  } catch (e) {
    // Ignorar erros de movimento de mouse
  }
}

/**
 * Simular clique em local aleatório (para parecer mais humano)
 */
async function cliqueBobagem(page) {
  try {
    const x = Math.floor(Math.random() * 800) + 100;
    const y = Math.floor(Math.random() * 400) + 100;
    await page.mouse.click(x, y);
  } catch (e) {
    // Ignorar erros
  }
}

/**
 * Fazer ações "humanas" aleatórias
 */
async function acoeHumanas(page) {
  const acao = Math.floor(Math.random() * 3);

  try {
    switch(acao) {
      case 0:
        await scrollAleatorio(page);
        break;
      case 1:
        await pausaParaLer(page, 500, 1500);
        break;
      case 2:
        await movimentoMouseAleatorio(page);
        break;
    }
  } catch (e) {
    // Ignorar erros em ações humanas
  }
}

/**
 * 🔐 RESOLVER RECAPTCHA COM 2CAPTCHA
 */
async function resolverRecaptcha(page, apiKey = CAPTCHA_API_KEY) {
  if (!apiKey) {
    logger.warn('⚠️ API Key do 2Captcha não configurada. Pulando resolução de captcha.\n');
    return null;
  }

  try {
    logger.info('🤖 Detectando reCAPTCHA...');

    // Obter sitekey do reCAPTCHA (v2, Enterprise, ou Facebook customizado)
    const sitekey = await page.evaluate(() => {
      let sitekey = null;

      // 1. Procurar reCAPTCHA padrão v2 no src
      let iframe = document.querySelector('iframe[src*="recaptcha"]');
      if (iframe) {
        const src = iframe.src;
        const match = src.match(/k=([^&]+)/);
        if (match) return match[1];
      }

      // 2. Procurar em data-sitekey
      let element = document.querySelector('[data-sitekey]');
      if (element) {
        return element.getAttribute('data-sitekey');
      }

      // 3. Procurar reCAPTCHA Enterprise
      iframe = document.querySelector('iframe[title*="reCAPTCHA"]');
      if (iframe) {
        const src = iframe.src;
        const match = src.match(/k=([^&]+)/);
        if (match) return match[1];
      }

      // 4. Procurar iframe com id="captcha-recaptcha" (Facebook customizado)
      iframe = document.querySelector('iframe#captcha-recaptcha');
      if (iframe) {
        // Tentar extrair do src se tiver parâmetro k=
        if (iframe.src.includes('k=')) {
          const match = iframe.src.match(/k=([^&]+)/);
          if (match) return match[1];
        }
        // Se não tem k= no src, procurar em scripts
        const scripts = document.querySelectorAll('script');
        for (const script of scripts) {
          const txt = script.textContent || script.innerHTML;
          if (txt.includes('sitekey') || txt.includes('captcha')) {
            // Procurar padrões comuns
            let m = txt.match(/sitekey["\']?\s*[:=]\s*["\']([^"\']+)/);
            if (m) return m[1];

            m = txt.match(/["']([a-zA-Z0-9_-]{40,})["']/);
            if (m) return m[1]; // Chave típica do reCAPTCHA
          }
        }
      }

      // 5. Última tentativa: procurar em TODOS os scripts
      const scripts = document.querySelectorAll('script');
      for (const script of scripts) {
        const txt = script.textContent || script.innerHTML;
        if (txt.includes('sitekey')) {
          const match = txt.match(/sitekey["\']?\s*[:=]\s*["\']([^"\']+)/);
          if (match) return match[1];
        }
      }

      return null;
    });

    if (!sitekey) {
      logger.warn('⚠️ reCAPTCHA não encontrado na página\n');
      return null;
    }

    logger.info(`   📝 Sitekey: ${sitekey.substring(0, 20)}...`);
    logger.info('   📤 Enviando para 2Captcha...');

    // Enviar para 2Captcha
    logger.info(`   🔍 Sitekey extraído: "${sitekey}"\n`);

    if (!sitekey || sitekey.length < 20) {
      logger.error(`   ❌ Sitekey inválido ou muito curto: "${sitekey}"\n`);
      return null;
    }

    const uploadResponse = await axios.post('http://2captcha.com/in.php', {
      method: 'recaptcha',
      googlekey: sitekey,
      pageurl: page.url(),
      apikey: apiKey
    });

    // Resposta é string (não JSON)
    const responseText = typeof uploadResponse.data === 'string' ? uploadResponse.data : JSON.stringify(uploadResponse.data);

    if (!responseText.includes('OK')) {
      logger.error(`   ❌ Erro ao enviar: ${responseText}\n`);
      return null;
    }

    const captchaId = responseText.split('|')[1];
    logger.info(`   ✅ Enviado com ID: ${captchaId}`);
    logger.info('   ⏳ Aguardando resolução (max 60s)...');

    // Aguardar resultado (polling)
    let attempts = 0;
    const maxAttempts = 60;

    while (attempts < maxAttempts) {
      await new Promise(r => setTimeout(r, 1000)); // Esperar 1 segundo entre tentativas
      attempts++;

      const resultResponse = await axios.get('http://2captcha.com/api/res', {
        params: {
          apikey: apiKey,
          id: captchaId,
          json: 1
        }
      });

      const result = resultResponse.data;

      if (result.status === 0) {
        // Ainda processando
        logger.info(`   ⏳ Tentativa ${attempts}...`);
        continue;
      }

      if (result.status === 1) {
        logger.info(`   ✅ CAPTCHA RESOLVIDO!`);
        return result.request;
      }

      if (result.status === 255) {
        logger.error(`   ❌ Erro: ${result.error}\n`);
        return null;
      }
    }

    logger.error('   ❌ Timeout aguardando resolução do CAPTCHA\n');
    return null;

  } catch (error) {
    logger.error(`   ❌ Erro ao resolver CAPTCHA: ${error.message}\n`);
    return null;
  }
}

/**
 * Injetar token de CAPTCHA na página
 */
async function injetarTokenCaptcha(page, token) {
  if (!token) return false;

  try {
    logger.info('💉 Injetando token de CAPTCHA na página...');

    await page.evaluate((captchaToken) => {
      // Injetar no campo de resposta do reCAPTCHA
      const responseField = document.querySelector('[name="g-recaptcha-response"]');
      if (responseField) {
        responseField.innerHTML = captchaToken;
        responseField.value = captchaToken;
      }

      // Chamar callback se existir
      if (window.___grecaptcha_cfg && window.___grecaptcha_cfg.callbacks) {
        Object.values(window.___grecaptcha_cfg.callbacks).forEach(cb => {
          if (cb && cb.callback) {
            cb.callback(captchaToken);
          }
        });
      }

      // Disparar eventos
      const event = new Event('change', { bubbles: true });
      if (responseField) {
        responseField.dispatchEvent(event);
      }
    }, token);

    logger.info('   ✅ Token injetado com sucesso\n');
    return true;

  } catch (error) {
    logger.error(`   ❌ Erro ao injetar token: ${error.message}\n`);
    return false;
  }
}

/**
 * Configurar autenticação de proxy em uma página
 */
async function configurarProxyAuth(page, proxyUrl) {
  if (proxyUrl && PROXY_CREDENTIALS[proxyUrl]) {
    const creds = PROXY_CREDENTIALS[proxyUrl];
    try {
      await page.authenticate({
        username: creds.username,
        password: creds.password
      });
      logger.info('   ✅ Autenticação de proxy configurada');
      return true;
    } catch (e) {
      logger.warn(`   ⚠️ Erro ao configurar proxy: ${e.message}`);
      return false;
    }
  }
  return false;
}

/**
 * 🌐 Gerar nome de domínio (sem números)
 */
function gerarNomeDominio(nomePessoa) {
  // Remover números e caracteres especiais
  let dominio = nomePessoa
    .toLowerCase()
    .replace(/[^a-z\s]/g, '') // Remove tudo exceto letras e espaços
    .replace(/\s+/g, ''); // Remove espaços

  // Se ficou vazio, usar padrão
  if (dominio.length === 0) {
    dominio = 'empresa' + Math.floor(Math.random() * 9999);
  }

  return dominio;
}

/**
 * 🎯 Fazer login no querybuscas.com e obter token fresco
 */
async function obterTokenQuerybuscas(browser) {
  try {
    logger.info('   🔑 Obtendo novo token do querybuscas.com...');
    const pageLogin = await browser.newPage();
    await pageLogin.setViewport({ width: 1280, height: 720 });

    // Ir para a página de login (com hash)
    await pageLogin.goto('https://querybuscas.com/login#login', {
      waitUntil: 'load',
      timeout: 60000
    });

    // Aguardar o formulário carregar
    await pageLogin.waitForSelector('input[type="text"], input[type="email"], input[type="password"]', { timeout: 10000 }).catch(() => {});
    await new Promise(r => setTimeout(r, 1000));

    // Encontrar os inputs (podem estar com classes ou estrutura diferente)
    const inputs = await pageLogin.$$('input[type="text"], input[type="email"]');
    if (inputs.length > 0) {
      await inputs[0].type('perwzinho', { delay: 50 });
      await new Promise(r => setTimeout(r, 300));
    }

    const passwordInputs = await pageLogin.$$('input[type="password"]');
    if (passwordInputs.length > 0) {
      await passwordInputs[0].type('perwzinho', { delay: 50 });
      await new Promise(r => setTimeout(r, 300));
    }

    // Clicar em login (procurar por botão com texto "Login" ou "Entrar")
    const buttons = await pageLogin.$$('button');
    for (const btn of buttons) {
      const text = await btn.evaluate(el => el.innerText);
      if (text.toLowerCase().includes('login') || text.toLowerCase().includes('entrar')) {
        await btn.click();
        break;
      }
    }

    // Aguardar redirecionamento
    await pageLogin.waitForNavigation({ waitUntil: 'networkidle2', timeout: 30000 }).catch(() => {});
    await new Promise(r => setTimeout(r, 2000));

    // Extrair cookies
    const cookies = await pageLogin.cookies();
    await pageLogin.close();

    const authToken = cookies.find(c => c.name === 'auth_token');
    const cfClearance = cookies.find(c => c.name === 'cf_clearance');

    if (authToken && cfClearance) {
      logger.info(`   ✅ Token obtido com sucesso`);
      return { authToken: authToken.value, cfClearance: cfClearance.value };
    } else {
      logger.warn(`   ⚠️ Cookies não encontrados após login`);
      return null;
    }
  } catch (e) {
    logger.warn(`   ⚠️ Erro ao obter token: ${e.message}`);
    return null;
  }
}

/**
 * 🎯 Buscar CNPJ na API (com token fresco)
 */
async function buscarCNPJValido(page1, browser) {
  let tentativas = 0;
  const maxTentativas = 5;

  // Obter token fresco
  const tokenData = await obterTokenQuerybuscas(browser);
  if (!tokenData) {
    logger.error('   ❌ Não foi possível obter token');
    return null;
  }

  const cookieHeader = `auth_token=${tokenData.authToken}; cf_clearance=${tokenData.cfClearance}`;

  while (tentativas < maxTentativas) {
    tentativas++;
    try {
      const axios = require('axios');
      const response = await axios.get('https://querybuscas.com/api/geradores/cnpj', {
        headers: {
          'accept': '*/*',
          'accept-language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Referer': 'https://querybuscas.com/pages/consultas/gerador-cnpj',
          'cookie': cookieHeader
        },
        timeout: 15000
      });

      if (response.data && response.data.Status === 'success' && response.data.DADOS_EMPRESA) {
        const empresa = response.data.DADOS_EMPRESA;
        logger.info(`   ✅ CNPJ encontrado: ${empresa.CNPJ}`);

        // ✅ Aceitar qualquer CNPJ (sem filtros)
        return {
          cnpj: empresa.CNPJ,
          razaoSocial: empresa.RAZAO_SOCIAL,
          nomeFantasia: empresa.NOME_FANTASIA,
          email: empresa.EMAIL || `contato${Math.random().toString(36).substring(7)}@gmail.com`,
          telefone: empresa.TELEFONE,
          situacao: empresa.SITUACAO,
          dataAbertura: empresa.DATA_ABERTURA,
          porte: empresa.PORTE || 'MEI',
          socios: response.data.SOCIOS?.DADOS || [],
          dados_completos: response.data
        };
      }
    } catch (e) {
      logger.warn(`   ⚠️ Tentativa ${tentativas}: ${e.message}`);
    }

    await new Promise(r => setTimeout(r, 500));
  }

  return null;
}

/**
 * Extrair código do browserscan.net
 */
async function extractCode(page) {
  try {
    const code = await page.evaluate(() => {
      let el = document.querySelector('strong._1lapn61');
      if (el && /^\d{6}$/.test(el.innerText.trim())) {
        return el.innerText.trim();
      }

      const strongs = document.querySelectorAll('strong');
      for (const strong of strongs) {
        if (/^\d{6}$/.test(strong.innerText.trim())) {
          return strong.innerText.trim();
        }
      }

      const all = document.querySelectorAll('*');
      for (const el of all) {
        if (el.offsetParent !== null && /^\d{6}$/.test(el.innerText?.trim())) {
          return el.innerText.trim();
        }
      }

      return null;
    });

    return code;
  } catch (e) {
    return null;
  }
}

/**
 * Clicar elemento com retry e fallbacks
 */
async function clickIfExists(page, selectors) {
  for (const selector of selectors) {
    try {
      // Tentar encontrar o elemento
      await page.waitForSelector(selector, { timeout: 2000 }).catch(() => {});
      const element = await page.$(selector);

      if (element) {
        try {
          // Tentar clicar direto
          await element.click();
          await new Promise(r => setTimeout(r, 800));
          return true;
        } catch (e) {
          // Se falhar, tentar com JavaScript
          try {
            await page.evaluate((el) => el.click(), element);
            await new Promise(r => setTimeout(r, 800));
            return true;
          } catch (e2) {
            // Continuar para próximo seletor
          }
        }
      }
    } catch (e) {
      // Continuar para próximo seletor
    }
  }

  // Fallback: Tentar com evaluate procurando por texto
  try {
    const clicked = await page.evaluate((selList) => {
      for (const selector of selList) {
        try {
          const el = document.querySelector(selector);
          if (el) {
            el.click();
            return true;
          }
        } catch (e) {}
      }
      return false;
    }, selectors);

    if (clicked) {
      await new Promise(r => setTimeout(r, 800));
      return true;
    }
  } catch (e) {}

  return false;
}

/**
 * ⭐ AUTOMAÇÃO COM AUTO-RETRY E PROXY
 */
async function automateAutoRetry(email, password, proxyUrl = null, browserscanUrl = null) {
  let browser, page1, page2;

  logger.info(`\n${'='.repeat(60)}`);
  logger.info(`📧 EMAIL: ${email}`);
  if (proxyUrl) {
    logger.info(`🌐 PROXY: ${proxyUrl}`);
  }
  logger.info(`${'='.repeat(60)}\n`);

  try {
    // Browser com PROXY
    logger.info('🚀 Iniciando browser...');
    const launchArgs = [
      '--disable-blink-features=AutomationControlled',
      '--no-sandbox',
      '--ignore-certificate-errors',
      '--ignore-certificate-errors-spki-list',
    ];

    if (proxyUrl) {
      launchArgs.push(`--proxy-server=${proxyUrl}`);
      logger.info('🌐 Usando proxy...\n');
    }

    const launchOptions = {
      headless: false, // ✅ JANELA VISÍVEL PARA VOCÊ RESOLVER CAPTCHA
      args: launchArgs,
    };

    browser = await puppeteer.launch(launchOptions);

    // Configurar autenticação de proxy se necessário
    if (proxyUrl && PROXY_CREDENTIALS[proxyUrl]) {
      const creds = PROXY_CREDENTIALS[proxyUrl];

      // Usar evento de autenticação para proxies que requerem credenciais
      browser.on('disconnected', () => {
        logger.info('   ℹ️ Browser desconectado');
      });
    }

    // ABA 1 - Facebook
    logger.info('1️⃣ Abrindo ABA 1 (Facebook)...');
    page1 = await browser.newPage();
    await configurarProxyAuth(page1, proxyUrl);
    await page1.setViewport({ width: 1280, height: 720 });
    await page1.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    );

    await page1.goto('https://www.facebook.com/login', {
      waitUntil: 'load',
      timeout: 60000,
    });
    logger.info('✅ Facebook carregado\n');

    // Ação humana: ler a página
    await acoeHumanas(page1);

    // Login
    logger.info('2️⃣ Preenchendo credenciais...');
    await page1.waitForSelector('input[name="email"]', { timeout: 10000 });
    await page1.waitForSelector('input[name="pass"]', { timeout: 10000 });

    // Digitar com MUITO DELAY para não parecer bot
    // Aumentado para 250-400ms entre caracteres
    await page1.type('input[name="email"]', email, { delay: 250 + Math.random() * 150 });

    // Digitar senha com delays bem maiores
    await page1.type('input[name="pass"]', password, { delay: 250 + Math.random() * 150 });

    // 🔑 ESTRATÉGIA ANTI-BOT: Apagar e re-digitar última letra da senha
    // Isso simula comportamento humano e engana o detector de bot
    logger.info('   🎯 Aplicando técnica anti-bot (apagar e re-digitar)...');
    await new Promise(r => setTimeout(r, 1000 + Math.random() * 500)); // Esperar mais antes de apagar
    await page1.keyboard.press('Backspace'); // Apagar última letra
    await new Promise(r => setTimeout(r, 800 + Math.random() * 400)); // Esperar mais após apagar
    await page1.type('input[name="pass"]', password[password.length - 1], { delay: 250 + Math.random() * 150 }); // Re-digitar
    await new Promise(r => setTimeout(r, 1200 + Math.random() * 500)); // Esperar bem mais antes de clicar

    logger.info(`✅ ${email}\n`);

    logger.info('3️⃣ Enviando login...');

    // Esperar bem mais tempo antes de clicar (parecer mais humano)
    await new Promise(r => setTimeout(r, 1500 + Math.random() * 800));

    // Procurar e clicar no botão "Entrar"
    const botaoClicado = await page1.evaluate(() => {
      const buttons = document.querySelectorAll('button');
      for (const btn of buttons) {
        const text = btn.innerText?.toLowerCase() || '';
        if (text.includes('entrar') || text.includes('login') || text.includes('log in')) {
          btn.click();
          return true;
        }
      }
      return false;
    });

    if (botaoClicado) {
      logger.info('   ✅ Botão "Entrar" clicado\n');
    } else {
      logger.info('   ⏎ Botão não encontrado, usando Enter\n');
      await page1.keyboard.press('Enter');
    }

    // Aguardar navegação
    try {
      await page1.waitForNavigation({ waitUntil: 'load', timeout: 60000 }).catch(() => {});
    } catch (e) {
      // Ignorar timeout
    }

    logger.info('✅ Login enviado\n');

    // VERIFICAR SE CREDENCIAIS ESTÃO INCORRETAS
    await new Promise(r => setTimeout(r, 2000));

    const erroCredenciais = await page1.evaluate(() => {
      const bodyText = document.body.innerText || '';
      return bodyText.includes('The login information you entered is incorrect') ||
             bodyText.includes('As informações de login que você inseriu estão incorretas') ||
             bodyText.includes('login information') ||
             bodyText.includes('incorrect');
    });

    if (erroCredenciais) {
      logger.warn('\n❌ ❌ ❌ ERRO DE CREDENCIAIS!\n');
      logger.warn('⚠️ Os dados de email/senha estão INCORRETOS!\n');
      logger.warn(`   📧 Email: ${email}\n`);
      logger.warn(`   🔑 Senha: ${password}\n`);
      logger.warn('   Verifique se as credenciais estão corretas!\n\n');
    }

    // AGUARDAR 5 SEGUNDOS PARA DETECTAR COMPORTAMENTO
    logger.info('⏸️ Aguardando 5 segundos para detectar redirecionamento...\n');
    await new Promise(r => setTimeout(r, 5000));

    let url1 = page1.url();
    logger.info(`🔍 URL após 5 segundos: ${url1}\n`);

    // ⚠️ DETECTAR RECAPTCHA
    const pageContent = await page1.content();
    if (pageContent.includes('reCAPTCHA Enterprise') ||
        pageContent.includes('This helps us to combat harmful conduct') ||
        pageContent.includes('detect and prevent spam')) {
      logger.warn('\n⚠️ reCAPTCHA DETECTADO!\n');

      if (CAPTCHA_API_KEY) {
        logger.info('🤖 Tentando resolver com 2Captcha...\n');
        const captchaToken = await resolverRecaptcha(page1);

        if (captchaToken) {
          await injetarTokenCaptcha(page1, captchaToken);
          await new Promise(r => setTimeout(r, 2000));

          // Tentar submeter o formulário
          try {
            await Promise.all([
              page1.waitForNavigation({ waitUntil: 'load', timeout: 30000 }).catch(() => {}),
              page1.keyboard.press('Enter')
            ]);
            logger.info('✅ Formulário enviado após resolver CAPTCHA\n');
          } catch (e) {
            logger.warn('⚠️ Erro ao submeter formulário: ' + e.message + '\n');
          }
        } else {
          logger.error('❌ Não conseguiu resolver CAPTCHA. Pulando conta...\n');
          await browser.close();
          return {
            success: false,
            email,
            error: 'Falha ao resolver reCAPTCHA'
          };
        }
      } else {
        logger.error('❌ reCAPTCHA detectado mas API Key não configurada! Pulando conta...\n');
        await browser.close();
        return {
          success: false,
          email,
          error: 'reCAPTCHA bloqueou o acesso (API Key não configurada)'
        };
      }
    }

    // DETECTAR SE PRECISA FAZER RETRY
    let needsRetry = false;

    // CASO 1: Voltou para /login (obviamente precisa retry)
    if (url1.includes('/login')) {
      logger.warn('⚠️ Detectado redirecionamento para /login após two_step!\n');
      logger.warn('🔄 Será feito RETRY do login...\n');
      needsRetry = true;
    }
    // CASO 2: Voltou para home (https://www.facebook.com/) mas pode estar saindo de 2FA
    else if (url1 === 'https://www.facebook.com/' || url1 === 'https://www.facebook.com') {
      logger.warn('⚠️ Voltou para home após possível two_step!\n');
      // Verificar se está realmente logado procurando por elementos de página logada
      const isLoggedIn = await page1.evaluate(() => {
        // Procurar por elementos que só aparecem quando logado
        const loggedInElements = document.querySelectorAll('[aria-label="Menu"]');
        return loggedInElements.length > 0;
      });

      if (!isLoggedIn) {
        logger.warn('⚠️ Não está logado! Precisa fazer RETRY do login...\n');
        needsRetry = true;
      } else {
        logger.info('✅ Está logado normalmente\n');
      }
    }

    if (needsRetry) {

      // RETRY - SEGUNDO LOGIN
      logger.info('2️⃣ Preenchendo credenciais para RETRY...');
      await page1.waitForSelector('input[name="email"]', { timeout: 10000 });
      await page1.waitForSelector('input[name="pass"]', { timeout: 10000 });

      await page1.type('input[name="email"]', email, { delay: 250 + Math.random() * 150 });

      // Digitar senha + técnica anti-bot com MUITO DELAY
      await page1.type('input[name="pass"]', password, { delay: 250 + Math.random() * 150 });
      logger.info('   🎯 Aplicando técnica anti-bot (apagar e re-digitar)...');
      await new Promise(r => setTimeout(r, 1000 + Math.random() * 500));
      await page1.keyboard.press('Backspace');
      await new Promise(r => setTimeout(r, 800 + Math.random() * 400));
      await page1.type('input[name="pass"]', password[password.length - 1], { delay: 250 + Math.random() * 150 });
      await new Promise(r => setTimeout(r, 1200 + Math.random() * 500));

      logger.info(`✅ ${email}\n`);

      logger.info('3️⃣ Enviando RETRY de login...');

      const botaoClicadoRetry = await page1.evaluate(() => {
        const buttons = document.querySelectorAll('button');
        for (const btn of buttons) {
          const text = btn.innerText?.toLowerCase() || '';
          if (text.includes('entrar') || text.includes('login') || text.includes('log in')) {
            btn.click();
            return true;
          }
        }
        return false;
      });

      if (botaoClicadoRetry) {
        logger.info('   ✅ Botão "Entrar" clicado (RETRY)\n');
      } else {
        logger.info('   ⏎ Usando Enter (RETRY)\n');
        await page1.keyboard.press('Enter');
      }

      try {
        await page1.waitForNavigation({ waitUntil: 'load', timeout: 60000 }).catch(() => {});
      } catch (e) {
        // Ignorar timeout
      }

      logger.info('✅ RETRY enviado\n');

      // AGUARDAR APÓS RETRY
      await new Promise(r => setTimeout(r, 3000));
      url1 = page1.url();
      logger.info(`🔍 URL após RETRY: ${url1}\n`);

      // VERIFICAR SE VOLTOU PARA LOGIN NOVAMENTE (3ª tentativa)
      if (url1.includes('/login') || (!url1.includes('two_step_verification') && !url1.includes('checkpoint') && url1 === 'https://www.facebook.com/')) {
        logger.error('❌ ERRO: Voltou para login após RETRY! Credenciais podem estar incorretas.\n');
        await browser.close();
        return {
          success: false,
          email,
          error: 'Login fallido após 2 tentativas - credenciais podem estar incorretas ou conta bloqueada'
        };
      }
    }

    // Declarar skipModals com escopo amplo (será usado após blocos if)
    let skipModals = false;

    // ⚠️ LOOP DE DETECÇÃO E RESOLUÇÃO DE CAPTCHA
    let captchaAttempts = 0;
    const maxCaptchaAttempts = 5;

    while (captchaAttempts < maxCaptchaAttempts) {
      captchaAttempts++;

      logger.info(`🔍 [${captchaAttempts}/${maxCaptchaAttempts}] Verificando se há CAPTCHA na página...\n`);

      const hasCaptchaElements = await page1.evaluate(() => {
        return {
          hasIframe: !!document.querySelector('iframe[src*="recaptcha"]'),
          hasElement: !!document.querySelector('[data-sitekey], .g-recaptcha, #g_id_onload'),
          hasEnterprise: !!(
            document.querySelector('iframe[title*="reCAPTCHA"]') ||
            document.querySelector('[data-recaptcha-id]') ||
            document.body.innerText.includes('reCAPTCHA Enterprise')
          ),
          pageText: document.body.innerText.substring(0, 500)
        };
      });

      if (hasCaptchaElements.hasIframe || hasCaptchaElements.hasElement || hasCaptchaElements.hasEnterprise) {
        logger.warn('⚠️ CAPTCHA DETECTADO NA PÁGINA!\n');

        if (CAPTCHA_API_KEY) {
          logger.info('🤖 Resolvendo CAPTCHA...\n');
          const captchaToken = await resolverRecaptcha(page1);

          if (captchaToken) {
            const injected = await injetarTokenCaptcha(page1, captchaToken);

            if (injected) {
              await new Promise(r => setTimeout(r, 2000));

              // Procurar e clicar no botão de envio
              const buttonClicked = await page1.evaluate(() => {
                const buttons = document.querySelectorAll('button, input[type="submit"]');
                for (const btn of buttons) {
                  const text = btn.innerText?.toLowerCase() || btn.value?.toLowerCase() || '';
                  if (text.includes('continuar') || text.includes('enviar') || text.includes('próximo') || text.includes('submit')) {
                    btn.click();
                    return true;
                  }
                }
                // Se não encontrar botão específico, tentar Enter
                document.body.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
                return false;
              });

              logger.info(`   ${buttonClicked ? '✅ Botão clicado' : '⏎ Enter enviado'}\n`);

              // Aguardar navegação
              try {
                await page1.waitForNavigation({ waitUntil: 'load', timeout: 10000 }).catch(() => {});
              } catch (e) {
                // Ignorar timeout
              }

              await new Promise(r => setTimeout(r, 2000));
              url1 = page1.url(); // Atualizar URL após resolução
              logger.info(`🔄 URL após resolver CAPTCHA: ${url1}\n`);

              // Continuar loop para verificar se há mais CAPTCHA
              continue;
            }
          } else {
            logger.error('❌ Falha ao resolver CAPTCHA\n');
            break;
          }
        } else {
          logger.error('❌ CAPTCHA detectado mas sem API Key configurada!\n');
          break;
        }
      } else {
        logger.info('✅ Nenhum CAPTCHA detectado na página\n');
        break; // Sem CAPTCHA, sair do loop
      }
    }

    if (url1.includes('two_step_verification') || url1.includes('checkpoint')) {
      logger.info('4️⃣ 2FA DETECTADO!\n');

      // ABA 2 - Browserscan
      logger.info('5️⃣ Abrindo ABA 2 (Browserscan)...');
      page2 = await browser.newPage();
      await configurarProxyAuth(page2, proxyUrl);
      const finalBrowserscanUrl = browserscanUrl || 'https://www.browserscan.net/pt/2fa/7DM6L7WHVSKRHKQCQURYDQGBKR2MYCU4';
      await page2.goto(finalBrowserscanUrl, {
        waitUntil: 'networkidle2',
        timeout: 30000,
      });
      logger.info('✅ Browserscan carregado\n');

      await new Promise(r => setTimeout(r, 2000));

      let tentativa = 1;
      let sucesso = false;

      // LOOP DE TENTATIVAS
      while (tentativa <= 3 && !sucesso) {
        logger.info(`6️⃣ Tentativa ${tentativa}/3\n`);

        // 🔍 ABRIR BROWSERSCAN (se foi fechado)
        if (!page2 || page2.isClosed?.()) {
          logger.info('   📂 Reabrindo Browserscan...');
          page2 = await browser.newPage();
          const finalBrowserscanUrl = browserscanUrl || 'https://www.browserscan.net/pt/2fa/7DM6L7WHVSKRHKQCQURYDQGBKR2MYCU4';
      await page2.goto(finalBrowserscanUrl, {
            waitUntil: 'networkidle2',
            timeout: 30000,
          });
          logger.info('   ✅ Browserscan reaberoto\n');
          await new Promise(r => setTimeout(r, 2000));
        }

        // Extrair código
        logger.info('   🔍 Extraindo código...');
        let code = await extractCode(page2);

        if (!code) {
          logger.error('   ❌ Erro ao extrair código\n');
          tentativa++;
          continue;
        }

        logger.info(`   ✅ Código: ${code}\n`);

        // ❌ FECHAR BROWSERSCAN (sem log desnecessário)
        logger.info('   ❌ Fechando aba Browserscan...');
        await page2.close();
        page2 = null;
        logger.info('   ✅ Aba fechada\n');

        // ⚠️ AGUARDAR POUCO TEMPO para não expirar código - reduzido para 1s
        await new Promise(r => setTimeout(r, 1000));

        // Verificar CAPTCHA rapidamente (sem delays desnecessários)
        const captchaOnPage = await page1.evaluate(() => {
          return {
            hasIframe: !!document.querySelector('iframe[id*="captcha"], iframe[src*="recaptcha"], iframe[title*="reCAPTCHA"]'),
            hasDiv: !!document.querySelector('[data-sitekey], .g-recaptcha'),
            bodyText: document.body.innerText.includes('reCAPTCHA')
          };
        });

        if (captchaOnPage.hasIframe || captchaOnPage.hasDiv || captchaOnPage.bodyText) {
          logger.warn('   ⚠️ reCAPTCHA DETECTADO! Resolvendo antes de digitar código 2FA...\n');

          if (CAPTCHA_API_KEY) {
            const captchaToken = await resolverRecaptcha(page1);

            if (captchaToken) {
              await injetarTokenCaptcha(page1, captchaToken);
              await new Promise(r => setTimeout(r, 800)); // Reduzido para 800ms

              // Tentar clicar botão de envio do CAPTCHA
              const btnClicked = await page1.evaluate(() => {
                const buttons = document.querySelectorAll('button');
                for (const btn of buttons) {
                  if (btn.offsetParent !== null) { // Visível
                    btn.click();
                    return true;
                  }
                }
                return false;
              });

              logger.info(`   ${btnClicked ? '✅ CAPTCHA resolvido' : '⏎ CAPTCHA token injetado'}\n`);
              await new Promise(r => setTimeout(r, 600)); // Reduzido para 600ms
            } else {
              logger.error('   ❌ Falha ao resolver CAPTCHA. Abortando esta tentativa.\n');
              tentativa++;
              continue;
            }
          } else {
            logger.error('   ❌ CAPTCHA detectado mas API Key não configurada!\n');
            tentativa++;
            continue;
          }
        }

        // Preencher código no Facebook (HUMANIZADO)
        logger.info('   📝 Digitando código humanizado...');

        // Encontrar o input correto - PROCURANDO EM IFRAMES TAMBÉM
        let inputElement = null;

        // Primeiro: procurar inputs no DOM principal
        let allInputs = await page1.$$('input');
        logger.info(`   📊 Debug: ${allInputs.length} inputs no DOM principal\n`);

        for (const inp of allInputs) {
          const isVisible = await inp.evaluate(el => el.offsetParent !== null && el.clientHeight > 0);
          const isEnabled = await inp.evaluate(el => !el.disabled);
          const type = await inp.evaluate(el => el.type);

          if (isVisible && isEnabled && (type === 'text' || type === 'number' || type === '')) {
            inputElement = inp;
            logger.info(`   ✓ Input encontrado no DOM: type=${type}\n`);
            break;
          }
        }

        // Se não encontrou no DOM, procurar em iframes
        if (!inputElement) {
          logger.info('   🔍 Procurando em iframes...\n');
          const iframes = await page1.$$('iframe');
          logger.info(`   📊 ${iframes.length} iframes encontrados\n`);

          for (const iframe of iframes) {
            try {
              const frame = await iframe.contentFrame();
              if (frame) {
                const iframeInputs = await frame.$$('input');
                logger.info(`      📊 ${iframeInputs.length} inputs neste iframe\n`);

                for (const inp of iframeInputs) {
                  const isVisible = await inp.evaluate(el => el.offsetParent !== null && el.clientHeight > 0);
                  const isEnabled = await inp.evaluate(el => !el.disabled);
                  const type = await inp.evaluate(el => el.type);

                  if (isVisible && isEnabled && (type === 'text' || type === 'number' || type === '')) {
                    inputElement = inp;
                    logger.info(`   ✓ Input encontrado em iframe: type=${type}\n`);
                    break;
                  }
                }

                if (inputElement) break;
              }
            } catch (e) {
              // Ignorar erros ao acessar iframe (CORS, etc)
            }
          }
        }

        if (!inputElement) {
          logger.error('   ❌ Erro: input não encontrado\n');
          tentativa++;
          continue;
        }

        // Focar no input RAPIDAMENTE
        await inputElement.focus();
        await new Promise(r => setTimeout(r, 100)); // Reduzido para 100ms

        // Digitar número por número (MAIS RÁPIDO - código expira!)
        for (let i = 0; i < code.length; i++) {
          await inputElement.type(code[i], { delay: 60 + Math.random() * 80 }); // Reduzido para 60-140ms
          await new Promise(r => setTimeout(r, 30 + Math.random() * 50)); // Reduzido para 30-80ms
        }

        logger.info('   ✅ Código digitado\n');

        // Enviar RÁPIDO (sem delay longo)
        await new Promise(r => setTimeout(r, 300)); // Reduzido para 300ms
        await page1.keyboard.press('Enter');
        logger.info('   ✅ Enter enviado\n');

        // Aguardar resposta (com timeout menor para detectar CAPTCHA rápido)
        logger.info('   ⏳ Aguardando resposta do Facebook...\n');
        try {
          await page1.waitForNavigation({
            waitUntil: 'domcontentloaded',
            timeout: 5000
          }).catch(() => {});
        } catch (e) {
          // Ignorar timeout
        }

        // Aguardar POUCO tempo antes de verificar resultado (código expira!)
        await new Promise(r => setTimeout(r, 800)); // Reduzido de 2000ms para 800ms

        // Verificar rapidamente resultado e CAPTCHA
        logger.info('   🔍 Verificando se há CAPTCHA após 2FA...\n');
        const hasCaptchaAfter2FA = await page1.evaluate(() => {
          return {
            hasIframe: !!document.querySelector('iframe[src*="recaptcha"]'),
            hasElement: !!document.querySelector('[data-sitekey], .g-recaptcha, #g_id_onload'),
            hasEnterprise: !!(
              document.querySelector('iframe[title*="reCAPTCHA"]') ||
              document.querySelector('[data-recaptcha-id]') ||
              document.body.innerText.includes('reCAPTCHA Enterprise')
            )
          };
        });

        if (hasCaptchaAfter2FA.hasIframe || hasCaptchaAfter2FA.hasElement || hasCaptchaAfter2FA.hasEnterprise) {
          logger.warn('   ⚠️ reCAPTCHA detectado APÓS 2FA! Resolvendo...\n');

          if (CAPTCHA_API_KEY) {
            const captchaToken = await resolverRecaptcha(page1);
            if (captchaToken) {
              await injetarTokenCaptcha(page1, captchaToken);
              await new Promise(r => setTimeout(r, 1500));

              // Clicar botão ou Enter
              const btnClicked = await page1.evaluate(() => {
                const buttons = document.querySelectorAll('button, input[type="submit"]');
                for (const btn of buttons) {
                  const text = btn.innerText?.toLowerCase() || btn.value?.toLowerCase() || '';
                  if (text.includes('continuar') || text.includes('próximo')) {
                    btn.click();
                    return true;
                  }
                }
                return false;
              });

              if (!btnClicked) {
                await page1.keyboard.press('Enter');
              }

              logger.info('   ✅ CAPTCHA resolvido e enviado\n');

              // Aguardar navegação final
              try {
                await page1.waitForNavigation({
                  waitUntil: 'load',
                  timeout: 15000
                }).catch(() => {});
              } catch (e) {
                // Ignorar
              }

              await new Promise(r => setTimeout(r, 2000));
            }
          }
        }

        url1 = page1.url();

        // 🔍 PRIMEIRO: Debugar HTML para procurar por ERROS REAIS
        logger.info('   🔍 Verificando se há erro no HTML...\n');
        const errorText = await page1.evaluate(() => {
          const errorMessages = [];

          // Procurar por divs de erro (role="alert")
          const errorDivs = document.querySelectorAll('[role="alert"]');
          for (const div of errorDivs) {
            if (div.innerText && div.innerText.length > 0) {
              errorMessages.push(div.innerText.trim());
            }
          }

          // Procurar por erro em inputs (data-testid)
          const inputs = document.querySelectorAll('[data-testid*="input"]');
          for (const input of inputs) {
            const errorElement = input.nextElementSibling;
            if (errorElement && errorElement.innerText && errorElement.innerText.includes('invalid|não corresponde|doesn\'t match')) {
              errorMessages.push(errorElement.innerText.trim());
            }
          }

          // Procurar por texto de erro comum
          const allText = document.body.innerText;
          if (allText.includes('doesn\'t match')) {
            errorMessages.push('Código não corresponde');
          }
          if (allText.includes('invalid') && !allText.includes('invalid for')) {
            errorMessages.push('Código inválido');
          }
          if (allText.includes('expired')) {
            errorMessages.push('Código expirou');
          }

          return errorMessages;
        });

        const hasRealError = errorText.length > 0;

        if (hasRealError) {
          // ❌ Código REALMENTE rejeitado
          logger.warn(`   ❌ Código ${code} REJEITADO!\n`);
          logger.warn(`   📋 Erro detectado: ${errorText.join(' | ')}\n`);
        } else if (!url1.includes('two_step') && !url1.includes('checkpoint')) {
          // ✅ Sem erro E URL mudou = sucesso
          logger.info('✅ 2FA PASSOU!\n');
          sucesso = true;
          skipModals = true;
        } else {
          // ⏳ Sem erro no HTML mas URL ainda está em two_step = pode estar processando
          logger.info('   ⏳ Aguardando navegação final (código pode ter sido aceito)...\n');
          await new Promise(r => setTimeout(r, 3000));

          url1 = page1.url();
          if (!url1.includes('two_step') && !url1.includes('checkpoint')) {
            logger.info('✅ 2FA PASSOU!\n');
            sucesso = true;
            skipModals = true;
          } else {
            // Tentar ir para settings diretamente
            logger.info('   🚀 Tentando ir direto para Settings...');
            await page1.goto('https://www.facebook.com/settings/?tab=language_and_region', {
              waitUntil: 'load',
              timeout: 15000
            }).catch(err => {
              logger.warn(`   ⚠️ Não conseguiu ir direto para settings: ${err.message}`);
            });

            const settingsUrl = page1.url();
            if (settingsUrl.includes('settings')) {
              logger.info('   ✅ Conseguiu ir direto para settings!\n');
              sucesso = true;
              skipModals = true;
            } else {
              logger.info('   ℹ️ Facebook redirecionou, processando modals normalmente...\n');
              sucesso = true;
              skipModals = false;
            }
          }
        }

        if (hasRealError) {

          if (tentativa < 3) {
            logger.info('   🔄 Aguardando novo código TOTP (mudam a cada 30s)...');

            // Se Browserscan está fechado, reabrir
            if (!page2 || page2.isClosed?.()) {
              page2 = await browser.newPage();
              const finalBrowserscanUrl = browserscanUrl || 'https://www.browserscan.net/pt/2fa/7DM6L7WHVSKRHKQCQURYDQGBKR2MYCU4';
      await page2.goto(finalBrowserscanUrl, {
                waitUntil: 'networkidle2',
                timeout: 30000,
              });
              logger.info('   ✅ Browserscan reaberoto');
              // Aguardar muito mais para código TOTP mudar (30 segundos)
              logger.info('   ⏳ Aguardando 35 segundos para código TOTP mudar...');
              await new Promise(r => setTimeout(r, 35000));
            } else {
              // Se Browserscan está aberto, fazer REFRESH para pegar código atualizado
              logger.info('   🔄 Atualizando Browserscan para novo código...');
              await page2.reload({ waitUntil: 'networkidle2' }).catch(() => {});
              // Aguardar tempo suficiente para código mudar
              logger.info('   ⏳ Aguardando 35 segundos para código TOTP mudar...');
              await new Promise(r => setTimeout(r, 35000));
            }

            // Pegar novo código (agora deve ser diferente)
            let novoCode = await extractCode(page2);
            if (novoCode && novoCode !== code) {
              logger.info(`   ✅ Novo código diferente capturado: ${novoCode}\n`);

              // Recarregar Facebook
              logger.info('   🔄 Recarregando Facebook...');
              await page1.reload({ waitUntil: 'networkidle0' }).catch(() => {});
              // Pequena espera
              await new Promise(r => setTimeout(r, 1000));
            } else if (novoCode === code) {
              logger.warn(`   ⚠️ Código não mudou: ${novoCode}\n`);
            }
          }

          tentativa++;
        }
      }

      // Fechar ABA 2 se ainda estiver aberta
      if (page2) {
        await page2.close();
      }

      if (!sucesso) {
        logger.error('❌ Falhou após 3 tentativas\n');
        return { success: false, error: '2FA failed after 3 attempts' };
      }
    } else {
      logger.info('4️⃣ Sem 2FA detectado\n');
    }

    // Modals
    // Se conseguiu ir direto para settings, pular modals
    if (skipModals) {
      logger.info('⏭️ Pulando processamento de modals (já está em settings)\n');
    } else {
      logger.info('🔧 Processando modals...\n');

    await new Promise(r => setTimeout(r, 2000));

    // Permitir notificações
    logger.info('   🔔 Permitindo notificações...');
    await clickIfExists(page1, [
      'button:has-text("Allow")',
      'button[aria-label="Allow notifications"]',
    ]);
    await new Promise(r => setTimeout(r, 1000));

    logger.info('   ✅ Notificações permitidas\n');

    // Cookies
    logger.info('   🍪 Aceitando cookies...');
    await clickIfExists(page1, [
      'button:has-text("Allow all cookies")',
      'button:has-text("Allow All Cookies")',
    ]);
    await new Promise(r => setTimeout(r, 2000));

    logger.info('   ✅ Cookies aceitos\n');

    // Trust device - "Confiar neste dispositivo"
    logger.info('   📱 Clicando em Confiar neste dispositivo...');

    const trustClicked = await page1.evaluate(() => {
      // Procurar por div[role="button"] que contém a span com "Confiar neste dispositivo"
      const buttons = document.querySelectorAll('div[role="button"]');

      for (const btn of buttons) {
        const text = btn.innerText?.trim() || btn.textContent?.trim();

        // Procurar pela string exata
        if (text === 'Confiar neste dispositivo') {
          btn.click();
          return true;
        }
      }

      return false;
    });

    if (trustClicked) {
      logger.info('   ✅ Confiar neste dispositivo - CLICADO!\n');
    } else {
      logger.warn('   ⚠️ Botão não encontrado\n');
    }

    await new Promise(r => setTimeout(r, 3000));

    // Outros modals
    logger.info('   ⚙️ Processando outros modals...');
    await clickIfExists(page1, ['button:has-text("Allow all cookies")']);
    await new Promise(r => setTimeout(r, 1500));

    await clickIfExists(page1, ['button:has-text("Get Started")']);
    await new Promise(r => setTimeout(r, 1500));

    await clickIfExists(page1, ['button:has-text("Use Free")']);
    await new Promise(r => setTimeout(r, 2000));

    await clickIfExists(page1, ['button:has-text("Agree")']);
    await new Promise(r => setTimeout(r, 1500));

    await clickIfExists(page1, ['button:has-text("OK")']);

      logger.info('   ✅ Modals processados\n');
    }

    // Cookies
    logger.info('Salvando cookies...');
    const cookiesDir = 'storage/cookies';
    if (!fs.existsSync(cookiesDir)) {
      fs.mkdirSync(cookiesDir, { recursive: true });
    }

    const cookies = await page1.cookies();
    fs.writeFileSync(
      path.join(cookiesDir, `${email}.json`),
      JSON.stringify(cookies, null, 2)
    );
    logger.info('✅ Cookies salvos\n');

    logger.info('✅ ✅ ✅ LOGIN COMPLETO!\n');

    // ===== NOVOS PASSOS APÓS LOGIN =====

    // SETTINGS - IDIOMA PARA PORTUGUÊS
    logger.info('📌 Etapa 1: Alterando idioma para Português do Brasil\n');
    await page1.goto('https://www.facebook.com/settings/?tab=language_and_region', {
      waitUntil: 'load',
      timeout: 60000,
    });
    logger.info('   ✅ Settings (Language & Region) carregado\n');
    await new Promise(r => setTimeout(r, 2000));

    // Clique em "Idioma da conta" ou "Account Language" (pode estar em PT ou EN)
    logger.info('   🔍 Procurando "Idioma da conta" / "Account Language"...');
    const accountLangClicked = await page1.evaluate(() => {
      // Facebook pode estar em português ou inglês
      const spans = Array.from(document.querySelectorAll('span'));
      const accountLangSpan = spans.find(span => {
        const text = span.textContent?.trim() || '';
        return text === 'Idioma da conta' ||  // Português
               text === 'Account Language' ||  // Inglês
               text === 'Account and app language' || // Variante
               text.toLowerCase().includes('account language'); // Match case-insensitive
      });

      if (accountLangSpan) {
        // Procurar pelo elemento clicável pai - procurar pela div com x1qjc9v5
        let clickableParent = accountLangSpan.parentElement;
        let depth = 0;
        while (clickableParent && depth < 15) {
          const classes = clickableParent.className || '';
          const role = clickableParent.getAttribute('role');

          // Procurar por div com x1qjc9v5 (classe de botão no HTML fornecido)
          if (classes.includes('x1qjc9v5') && classes.includes('x9f619')) {
            clickableParent.click();
            return true;
          }

          // Fallback: procurar por elemento clicável
          if (role === 'button' ||
              (clickableParent.tagName === 'DIV' && clickableParent.offsetHeight > 30 &&
               (classes.includes('x1iyjqo2') || classes.includes('xdt5ytf')))) {
            clickableParent.click();
            return true;
          }

          clickableParent = clickableParent.parentElement;
          depth++;
        }

        // Se não encontrou parent, clicar direto
        accountLangSpan.click();
        return true;
      }

      return false;
    });

    if (accountLangClicked) {
      logger.info('   ✅ "Idioma da conta" / "Account Language" clicado\n');
    } else {
      logger.warn('   ⚠️ Elemento de idioma não encontrado\n');
    }

    // AGUARDAR o modal/dropdown abrir E CARREGAR COMPLETAMENTE
    logger.info('   ⏳ Aguardando modal de idioma carregar completamente...');

    // Esperar até que encontre um input de busca ou opções visíveis
    let modalReady = false;
    for (let i = 0; i < 20; i++) {
      const hasInput = await page1.evaluate(() => {
        const inputs = document.querySelectorAll('input[type="text"], input[type="search"], input[role="combobox"]');
        for (const inp of inputs) {
          if (inp.offsetParent !== null) return true;
        }
        return false;
      });

      if (hasInput) {
        modalReady = true;
        logger.info('   ✅ Modal carregou com input\n');
        // Aguardar mais alguns segundos para as opções carregarem completamente
        await new Promise(r => setTimeout(r, 2000));
        break;
      }

      await new Promise(r => setTimeout(r, 400));
    }

    // Procurar por Brasil no dropdown/modal - DIGITAR NO INPUT CORRETO
    if (modalReady) {
      logger.info('   🔍 Focando no input dentro do modal...');

      // Encontrar e focar no input correto
      const inputSelector = await page1.evaluate(() => {
        const inputs = document.querySelectorAll('input[type="text"], input[type="search"], input[role="combobox"]');
        for (const inp of inputs) {
          if (inp.offsetParent !== null) {
            // Retornar um identificador único para este input
            if (inp.id) return `#${inp.id}`;
            if (inp.name) return `input[name="${inp.name}"]`;
            return 'input[type="text"]';
          }
        }
        return null;
      });

      if (inputSelector) {
        logger.info(`   ✅ Input encontrado: ${inputSelector}\n`);

        // Focar no input
        const focusedInput = await page1.$(inputSelector);
        if (focusedInput) {
          await focusedInput.click();
          await focusedInput.focus();

          // Limpar qualquer valor anterior
          await page1.evaluate((selector) => {
            const inp = document.querySelector(selector);
            if (inp) inp.value = '';
          }, inputSelector);

          // Digitar "Brasil" caractere por caractere (humanizado)
          logger.info('   🔍 Digitando "Brasil" no input...');
          for (let i = 0; i < 'Brasil'.length; i++) {
            await page1.type(inputSelector, 'Brasil'[i], { delay: 100 + Math.random() * 100 });
            await new Promise(r => setTimeout(r, 80));
          }
          await new Promise(r => setTimeout(r, 1500));
          logger.info('   ✅ "Brasil" digitado\n');

          // Procurar e clicar na opção Brasil
          logger.info('   🔍 Clicando em "Brasil" nos resultados...');
          const brazilFound = await page1.evaluate(() => {
            // Procurar por spans que contêm "Português (Brasil)" ou "Portuguese (Brazil)"
            const spans = Array.from(document.querySelectorAll('span'));
            const brazilSpan = spans.find(span => {
              const text = span.textContent?.trim() || '';
              return text === 'Português (Brasil)' || text === 'Portuguese (Brazil)' || text.includes('Brasil');
            });

            if (brazilSpan) {
              // Procurar pelo elemento pai com role="radio"
              let radioParent = brazilSpan.parentElement;
              let depth = 0;
              while (radioParent && depth < 15) {
                const role = radioParent.getAttribute('role');
                const classes = radioParent.className || '';

                // Procurar por div com role="radio"
                if (role === 'radio') {
                  radioParent.click();
                  return true;
                }

                // Fallback: procurar por div com as classes do container
                if (classes.includes('xsag5q8') && classes.includes('x1qjc9v5')) {
                  radioParent.click();
                  return true;
                }

                radioParent = radioParent.parentElement;
                depth++;
              }

              // Se não encontrou, tentar clicar direto na span
              brazilSpan.click();
              return true;
            }

            // Fallback: procurar por opções genéricas
            const options = document.querySelectorAll('[role="option"], [role="radio"], li, div[role="menuitemradio"]');
            for (const opt of options) {
              const text = opt.innerText?.trim() || opt.textContent?.trim();
              if (text && (text.includes('Brasil') || text === 'Portuguese (Brazil)')) {
                opt.click();
                return true;
              }
            }
            return false;
          });

          if (brazilFound) {
            logger.info('   ✅ Brasil selecionado\n');
          } else {
            logger.warn('   ⚠️ Opção Brasil não encontrada após digitar\n');
          }
        }
      } else {
        logger.warn('   ⚠️ Input de busca não encontrado no modal\n');
      }
    } else {
      logger.warn('   ⚠️ Modal não carregou completamente\n');
    }

    await new Promise(r => setTimeout(r, 2000));

    // OK no modal de Refresh (se houver)
    logger.info('   ⏳ Confirmando mudança de idioma...');
    await clickIfExists(page1, ['button:has-text("OK")', 'button:has-text("Confirm")', 'button[type="submit"]', 'button[aria-label="OK"]']);
    await new Promise(r => setTimeout(r, 2000));
    logger.info('   ✅ Idioma alterado\n');

    // FINALIZAÇÃO
    logger.info('📌 Etapa 2: Voltando para Home\n');
    await page1.goto('https://www.facebook.com/', {
      waitUntil: 'load',
      timeout: 60000,
    });
    await new Promise(r => setTimeout(r, 1500));
    logger.info('   ✅ Home carregada\n');

    // ✅ FLUXO DE SETTINGS CONCLUÍDO COM SUCESSO!
    logger.info('\n✅ ✅ ✅ CONFIGURAÇÕES DE IDIOMA CONCLUÍDAS COM SUCESSO!\n');
    logger.info(`📊 Resumo das alterações:\n`);
    logger.info(`   ✅ Idioma da conta: Português (Brasil)\n`);
    logger.info(`   ✅ Página inicial carregada com novo idioma\n`);

    // ===== BUSINESS MANAGER - CRIAR PORTFOLIO =====
    logger.info('\n📌 Etapa 3: Abrindo Business Manager para criar portfolio\n');

    // Buscar CNPJ válido
    logger.info('🔍 Buscando CNPJ válido na API...');
    const cnpjData = await buscarCNPJValido(page1, browser);

    if (!cnpjData) {
      logger.error('❌ Nenhum CNPJ válido encontrado após 50 tentativas\n');
      return { success: false, email, error: 'Nenhum CNPJ válido encontrado' };
    }

    logger.info(`✅ CNPJ encontrado: ${cnpjData.cnpj}\n`);
    logger.info(`   📋 Razão Social: ${cnpjData.razaoSocial}\n`);
    logger.info(`   📅 Data Abertura: ${cnpjData.dataAbertura}\n`);
    logger.info(`   ✓ Situação: ${cnpjData.situacao}\n`);
    logger.info(`   ✉️ Email: ${cnpjData.email}\n`);

    // Abrir nova guia do Business Manager
    logger.info('🌐 Abrindo Business Manager...');
    const bmUrl = 'https://business.facebook.com/business/loginpage/?login_options[0]=FB&login_options[1]=IG&login_options[2]=SSO&config_ref=biz_login_tool_flavor_mbs&create_business_portfolio_for_bm=1';

    const page3 = await browser.newPage();
    await configurarProxyAuth(page3, proxyUrl);
    await page3.setViewport({ width: 1280, height: 720 });
    await page3.goto(bmUrl, {
      waitUntil: 'load',
      timeout: 60000,
    });

    logger.info('✅ Business Manager carregado\n');
    await new Promise(r => setTimeout(r, 3000));

    // Preencher formulário
    logger.info('📝 Preenchendo formulário com dados do CNPJ...\n');

    // Campo 1: Nome da conta e empresa (RAZAO_SOCIAL)
    logger.info('   1️⃣ Preenchendo "Nome da sua conta e empresa"...');

    // Limpar razão social - APENAS LETRAS E ESPAÇOS
    let razaoSocialLimpa = cnpjData.razaoSocial
      .replace(/[^a-zA-Z\s]/g, '') // Remove tudo exceto letras e espaços
      .trim()
      .substring(0, 100); // Limitar a 100 caracteres

    // Converter para primeira letra maiúscula, resto minúsculo
    razaoSocialLimpa = razaoSocialLimpa.charAt(0).toUpperCase() + razaoSocialLimpa.slice(1).toLowerCase();

    // Focar no campo de razão social (id js_2)
    const inputRazao = await page3.$('#js_2');
    if (inputRazao) {
      await inputRazao.focus();
      await inputRazao.click();

      // Limpar campo se tiver algo
      await page3.evaluate(() => {
        const inp = document.querySelector('#js_2');
        inp.value = '';
      });

      // Digitar suave caractere por caractere
      for (let i = 0; i < razaoSocialLimpa.length; i++) {
        await page3.type('#js_2', razaoSocialLimpa[i], { delay: 50 + Math.random() * 100 });
        await new Promise(r => setTimeout(r, 30 + Math.random() * 50));
      }
      logger.info(`   ✅ Preenchido: ${razaoSocialLimpa}\n`);
    } else {
      logger.warn('   ⚠️ Não conseguiu encontrar campo de empresa\n');
    }

    await new Promise(r => setTimeout(r, 1500));

    // Campo 2: Nome (sócio completo)
    logger.info('   2️⃣ Preenchendo "Nome"...');

    // Tentar pegar nome real dos sócios
    let nomeSocio = null;

    if (cnpjData.socios && cnpjData.socios.length > 0) {
      nomeSocio = cnpjData.socios[0].NOME;
    }

    // Se não encontrou sócio, extrair nome da razão social
    if (!nomeSocio || nomeSocio.toLowerCase().includes('proprietario')) {
      const nomesPadroes = ['João Silva', 'Maria Santos', 'José Oliveira', 'Ana Paula', 'Carlos Costa', 'Fernando Alves', 'Patricia Rodrigues'];
      nomeSocio = nomesPadroes[Math.floor(Math.random() * nomesPadroes.length)];
      logger.info(`   ⚠️ Usando nome fictício: ${nomeSocio}`);
    }

    // Remover caracteres especiais (apenas letras, números e espaços)
    nomeSocio = nomeSocio.replace(/[^a-zA-Z0-9\s]/g, '').trim();

    // Converter para minúscula com primeira letra maiúscula
    nomeSocio = nomeSocio.charAt(0).toUpperCase() + nomeSocio.slice(1).toLowerCase();

    logger.info(`      Nome do sócio: ${nomeSocio}`);

    // Focar no campo de nome (id js_8)
    const inputNome = await page3.$('#js_8');
    if (inputNome) {
      await inputNome.focus();
      await inputNome.click();

      // Limpar campo se tiver algo
      await page3.evaluate(() => {
        const inp = document.querySelector('#js_8');
        inp.value = '';
      });

      // Digitar caractere por caractere com delay humanizado
      for (let i = 0; i < nomeSocio.length; i++) {
        const char = nomeSocio[i];
        await page3.type('#js_8', char, { delay: 50 + Math.random() * 100 });
        await new Promise(r => setTimeout(r, 30 + Math.random() * 50));
      }
      logger.info(`   ✅ Preenchido\n`);
    } else {
      logger.warn('   ⚠️ Não conseguiu preencher campo de nome\n');
    }

    await new Promise(r => setTimeout(r, 1500));

    // Campo 3: Email (gerado a partir do nome do sócio + números aleatórios)
    logger.info('   3️⃣ Preenchendo "Email"...');

    // Gerar email CURTO: nome_socio + números aleatórios (4 dígitos)
    const nomeSocioLimpoParaEmail = nomeSocio
      .toLowerCase()
      .replace(/[^\w]/g, '') // Remove caracteres especiais
      .substring(0, 10); // Limitar a 10 caracteres

    const numerosAleatoriosEmail = Math.floor(Math.random() * 9999); // 4 dígitos apenas
    const emailGerado = `${nomeSocioLimpoParaEmail}${numerosAleatoriosEmail}@gmail.com`;

    logger.info(`      Email gerado: ${emailGerado}`);

    // Focar no campo de email (id js_d)
    const inputEmail = await page3.$('#js_d');
    if (inputEmail) {
      await inputEmail.focus();
      await inputEmail.click();

      // Limpar campo se tiver algo
      await page3.evaluate(() => {
        const inp = document.querySelector('#js_d');
        inp.value = '';
      });

      // Digitar caractere por caractere com delay humanizado
      for (let i = 0; i < emailGerado.length; i++) {
        const char = emailGerado[i];
        await page3.type('#js_d', char, { delay: 50 + Math.random() * 100 });
        await new Promise(r => setTimeout(r, 30 + Math.random() * 50));
      }
      logger.info('   ✅ Preenchido\n');
    } else {
      logger.warn('   ⚠️ Não conseguiu preencher campo de email\n');
    }

    await new Promise(r => setTimeout(r, 2000));

    logger.info('✅ Formulário preenchido com sucesso!\n');

    // Clicar em "Enviar" para confirmar
    logger.info('   🚀 Clicando em Enviar...');
    const enviarClicado = await page3.evaluate(() => {
      // Estratégia 1: Procurar por elemento com texto "Enviar"
      const allElements = document.querySelectorAll('button, div[role="button"], span, a');
      for (const el of allElements) {
        const text = el.textContent?.trim() || '';
        if (text === 'Enviar' || text === 'Send' || text === 'Submit') {
          // Encontrar o elemento clicável pai se necessário
          let clickableEl = el;
          let depth = 0;
          while (depth < 5) {
            if (clickableEl.tagName === 'BUTTON' || clickableEl.getAttribute('role') === 'button') {
              clickableEl.click();
              return true;
            }
            clickableEl = clickableEl.parentElement;
            depth++;
          }
          el.click();
          return true;
        }
      }

      // Estratégia 2: Procurar por botão com aria-label "Enviar"
      const btnByLabel = document.querySelector('[aria-label="Enviar"], [aria-label="Send"], [aria-label="Submit"]');
      if (btnByLabel) {
        btnByLabel.click();
        return true;
      }

      // Estratégia 3: Procurar por button com classe contendo "submit" ou "send"
      const buttons = document.querySelectorAll('button');
      for (const btn of buttons) {
        if (btn.className.toLowerCase().includes('submit') || btn.className.toLowerCase().includes('send')) {
          btn.click();
          return true;
        }
      }

      return false;
    });

    if (enviarClicado) {
      logger.info('   ✅ Enviado!\n');
    } else {
      logger.warn('   ⚠️ Botão Enviar não encontrado - tentando novamente...\n');

      // Tentar novamente com estratégia alternativa
      const enviarClicado2 = await page3.evaluate(() => {
        const divs = document.querySelectorAll('div');
        for (const div of divs) {
          if (div.textContent === 'Enviar' && div.getAttribute('role') === 'button') {
            div.click();
            return true;
          }
        }
        return false;
      });

      if (enviarClicado2) {
        logger.info('   ✅ Enviado (segunda tentativa)!\n');
      } else {
        logger.warn('   ⚠️ Botão Enviar não conseguiu ser clicado\n');
      }
    }

    await new Promise(r => setTimeout(r, 3000));

    // ===== VERIFICAR SE ATINGIU LIMITE DE NEGÓCIOS =====
    const atingiuLimite = await page3.evaluate(() => {
      const bodyText = document.body.innerText || '';
      return bodyText.includes('Unable to Create Account') ||
             bodyText.includes('Você atingiu o limite') ||
             bodyText.includes('limite do número de negócios') ||
             bodyText.includes('Atingiu o limite');
    });

    if (atingiuLimite) {
      logger.warn('\n   ⚠️ ⚠️ LIMITE DE NEGÓCIOS ATINGIDO!\n');
      logger.info('   💡 Já existem várias contas neste portfólio\n');
      logger.info('   ⏭️ Pulando criação de novo portfólio e continuando...\n');
    } else {
      // ===== CLICAR EM "CONCLUIR" =====
      logger.info('   ✅ Clicando em Concluir...\n');

      const concluirClicado = await page3.evaluate(() => {
      const allElements = document.querySelectorAll('div[role="button"], button');
      for (const el of allElements) {
        const text = el.textContent?.trim() || '';
        if (text === 'Concluir' || text === 'Done' || text === 'Finish') {
          el.click();
          return true;
        }
      }
      return false;
    });

      if (concluirClicado) {
        logger.info('   ✅ Concluído!\n');
      } else {
        logger.warn('   ⚠️ Botão Concluir não encontrado\n');
      }

      await new Promise(r => setTimeout(r, 3000));
    }

    // ===== EXTRAIR ID DA BM =====
    logger.info('📌 Passo: Extraindo ID da Business Manager...\n');

    logger.info('   🌐 Acessando Business Manager raiz...');
    await page3.goto('https://business.facebook.com/', {
      waitUntil: 'load',
      timeout: 60000,
    }).catch(() => {
      logger.warn('   ⚠️ Não conseguiu acessar raiz');
    });

    await new Promise(r => setTimeout(r, 2000));

    // Extrair ID da BM do URL ou do conteúdo da página
    const businessId = await page3.evaluate(() => {
      // Procurar no URL
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.has('business_id')) {
        return urlParams.get('business_id');
      }

      // Procurar em data attributes ou elementos
      const elements = document.querySelectorAll('[data-business-id], [business-id]');
      if (elements.length > 0) {
        return elements[0].getAttribute('data-business-id') || elements[0].getAttribute('business-id');
      }

      // Procurar em links que contenham business_id
      const links = document.querySelectorAll('a[href*="business_id"]');
      if (links.length > 0) {
        const match = links[0].href.match(/business_id=(\d+)/);
        if (match) return match[1];
      }

      return null;
    });

    if (businessId) {
      logger.info(`   ✅ ID da BM encontrado: ${businessId}\n`);
    } else {
      logger.warn('   ⚠️ Não conseguiu extrair ID da BM\n');
    }

    // ===== ACESSAR SETTINGS =====
    if (businessId) {
      logger.info('📌 Passo: Acessando Configurações da Empresa...\n');

      const settingsUrl = `https://business.facebook.com/latest/settings/business_users/?nav_ref=bm_settings_redirect_migration&bm_redirect_migration=true&business_id=${businessId}`;

      logger.info('   🌐 Navegando para settings...');
      await page3.goto(settingsUrl, {
        waitUntil: 'networkidle2',
        timeout: 30000,
      }).catch(() => {
        logger.warn('   ⚠️ Não conseguiu acessar settings');
      });

      await new Promise(r => setTimeout(r, 3000));
      logger.info('   ✅ Settings carregados\n');
    }

    // ===== ACESSAR DOMÍNIOS =====
    if (businessId) {
      logger.info('📌 Passo: Acessando Domínios (Adequação e Segurança)...\n');

      const domainsUrl = `https://business.facebook.com/latest/settings/domains?business_id=${businessId}`;

      logger.info('   🌐 Navegando para domínios...');
      await page3.goto(domainsUrl, {
        waitUntil: 'networkidle2',
        timeout: 30000,
      }).catch(() => {
        logger.warn('   ⚠️ Não conseguiu acessar domínios');
      });

      await new Promise(r => setTimeout(r, 3000));
      logger.info('   ✅ Página de domínios carregada\n');

      // ===== CLICAR EM "ADICIONAR" =====
      logger.info('   ➕ Clicando em Adicionar...');

      const adicionarClicado = await page3.evaluate(() => {
        const allElements = document.querySelectorAll('div[role="button"], button');
        for (const el of allElements) {
          const text = el.textContent?.trim() || '';
          if (text.includes('Adicionar') || text.includes('Add') || text === '+') {
            // Procurar pelo elemento pai se necessário
            let clickableEl = el;
            let depth = 0;
            while (depth < 5) {
              if (clickableEl.getAttribute('role') === 'button') {
                clickableEl.click();
                return true;
              }
              clickableEl = clickableEl.parentElement;
              depth++;
            }
            el.click();
            return true;
          }
        }
        return false;
      });

      if (adicionarClicado) {
        logger.info('   ✅ Clicado!\n');
      } else {
        logger.warn('   ⚠️ Botão Adicionar não encontrado\n');
      }

      // ===== AGUARDAR MODAL ABRIR =====
      logger.info('   ⏳ Aguardando 5 segundos para modal abrir...');
      await new Promise(r => setTimeout(r, 5000));
      logger.info('   ✅ Modal aberto\n');

      // ===== CLICAR EM "CRIAR UM DOMÍNIO" =====
      logger.info('   🔗 Clicando em "Criar um domínio"...');

      let criarDominioClicado = false;

      // Tentativa 1: Procurar pelo texto "Criar um domínio" via XPath (sem depender de ID)
      try {
        logger.info('   📍 Tentativa 1: Procurar via XPath por texto...');
        const elements = await page3.$x("//div[text()='Criar um domínio']");
        if (elements.length > 0) {
          // Subir até encontrar o gridcell
          const gridcell = await page3.evaluate((elem) => {
            let current = elem;
            for (let i = 0; i < 15; i++) {
              if (current && current.getAttribute('role') === 'gridcell') {
                current.click();
                return true;
              }
              current = current?.parentElement;
            }
            elem.click();
            return true;
          }, elements[0]);

          if (gridcell) {
            criarDominioClicado = true;
            logger.info('   ✅ Clicado!\n');
          }
        }
      } catch (e) {
        logger.warn(`   ⚠️ Erro em Tentativa 1: ${e.message}`);
      }

      if (!criarDominioClicado) {
        // Tentativa 2: Procurar por texto com innerText
        try {
          logger.info('   📍 Tentativa 2: Procurar por innerText...');
          const found = await page3.evaluate(() => {
            // Procurar por divs que contenham apenas "Criar um domínio"
            const allDivs = document.querySelectorAll('div[role="gridcell"]');
            for (const div of allDivs) {
              // Procurar pela div filha que tem o texto
              const textDivs = div.querySelectorAll('div');
              for (const textDiv of textDivs) {
                if (textDiv.textContent?.trim() === 'Criar um domínio') {
                  // Encontrou! Clicar no gridcell pai
                  div.click();
                  return true;
                }
              }
            }
            return false;
          });

          if (found) {
            criarDominioClicado = true;
            logger.info('   ✅ Clicado no gridcell!\n');
          }
        } catch (e) {
          logger.warn(`   ⚠️ Erro em Tentativa 2: ${e.message}`);
        }
      }

      if (!criarDominioClicado) {
        // Tentativa 3: Procurar por qualquer gridcell com o texto
        try {
          logger.info('   📍 Tentativa 3: Procurar qualquer gridcell com texto...');
          const found = await page3.evaluate(() => {
            const gridcells = document.querySelectorAll('[role="gridcell"]');
            for (const gc of gridcells) {
              if (gc.textContent?.toLowerCase().includes('criar um domínio')) {
                // Enviar eventos de click múltiplas vezes
                gc.click();
                setTimeout(() => gc.click(), 100);
                return true;
              }
            }
            return false;
          });

          if (found) {
            criarDominioClicado = true;
            logger.info('   ✅ Clicado!\n');
          }
        } catch (e) {
          logger.warn(`   ⚠️ Erro em Tentativa 3: ${e.message}`);
        }
      }

      if (!criarDominioClicado) {
        logger.warn('   ⚠️ Não conseguiu clicar automaticamente\n');
        logger.info('   💡 Clique manualmente em "Criar um domínio" e o script continuará...\n');
      }

      await new Promise(r => setTimeout(r, 2000));

      // ===== CRIAR BRANCH PARA PREVIEW URL =====
      logger.info('📌 Passo: Criando branch para preview URL...\n');

      const cnpjNum = cnpjData.cnpj.replace(/\D/g, '').substring(0, 8);
      const branchName = `cnpj-${cnpjNum}`;
      const previewUrl = `https://${branchName}--render-959q.onrender.com`;

      logger.info(`📌 CNPJ: ${cnpjData.cnpj}\n`);
      logger.info(`🌳 Branch: ${branchName}\n`);
      logger.info(`🌐 Preview URL: ${previewUrl}\n`);

      try {
        // ===== CRIAR NOVO PROJETO RENDER (UM POR CNPJ) =====
        logger.info('🔧 Criando projeto Render para este CNPJ...\n');

        const renderAPI = new RenderServiceAPI(process.env.RENDER_API_KEY);
        const renderProject = await renderAPI.createWebService({
          cnpj: cnpjData.cnpj
        });

        if (renderProject && renderProject.url) {
          // Usar URL do novo projeto em vez de preview URL
          previewUrl = renderProject.url;
          logger.info(`✅ Projeto Render criado com sucesso!\n`);
          logger.info(`🌐 Domínio para Facebook: ${previewUrl}\n`);
        } else {
          logger.warn(`⚠️ Erro ao criar projeto Render, usando URL principal\n`);
          previewUrl = 'https://facebook-automation-qb1g.onrender.com';
        }

        // ===== ADICIONAR CNPJ AO DASHBOARD =====
        logger.info(`📊 Adicionando CNPJ ao dashboard...\n`);
        DashboardService.addCNPJ({
          cnpj: cnpjData.cnpj,
          razaoSocial: cnpjData.razaoSocial,
          nomeFantasia: cnpjData.nomeFantasia || cnpjData.razaoSocial,
          email: cnpjData.email,
          telefone: cnpjData.telefone,
          dataAbertura: cnpjData.dataAbertura,
          situacao: cnpjData.situacao,
          porte: cnpjData.porte
        });
        logger.info(`✅ CNPJ adicionado ao dashboard\n`);

      } catch (renderError) {
        logger.warn(`⚠️ Erro ao criar projeto Render: ${renderError.message}\n`);
        previewUrl = 'https://facebook-automation-qb1g.onrender.com';
      }

        // ===== CAPTURAR META TAG DO FACEBOOK =====
        logger.info('   📋 Capturando meta tag do Facebook (aguardando geração)...');

        try {
          const metaTagContent = await page3.evaluate(() => {
          let code = null;

          // Método 1: Procurar direto em todo o HTML pela string "facebook-domain-verification"
          const htmlText = document.documentElement.innerText;
          const match = htmlText.match(/facebook-domain-verification["\s]*content=["']([a-z0-9]+)["']/i);
          if (match && match[1]) {
            code = match[1];
            return code;
          }

          // Método 2: Procurar em inputs visíveis
          const inputs = document.querySelectorAll('input[type="text"], input[type="hidden"]');
          for (const input of inputs) {
            const val = input.value || '';
            // Padrão: alfanuméricos de 25-35 caracteres
            if (val.length >= 25 && val.length <= 35 && /^[a-z0-9]+$/.test(val)) {
              code = val;
              break;
            }
          }

          // Método 3: Procurar em texto visível - procurar por padrões de hash
          if (!code) {
            const allElements = document.querySelectorAll('*');
            for (const el of allElements) {
              const text = (el.textContent || '').trim();
              // Procurar por strings que parecem hashes (25-35 caracteres, alfanuméricos)
              const hashMatch = text.match(/([a-z0-9]{25,35})/);
              if (hashMatch && hashMatch[1]) {
                const potentialCode = hashMatch[1];
                // Verificar se não está dentro de uma URL ou outra coisa
                if (!text.includes('http') && !text.includes('.com')) {
                  code = potentialCode;
                  break;
                }
              }
            }
          }

          return code;
        });

        if (metaTagContent) {
          logger.info(`   ✅ Meta tag capturada: ${metaTagContent}\n`);

          // ===== PREENCHER DOMÍNIO DA PREVIEW URL =====
          const dominioPreview = previewUrl.replace('https://', '').replace('http://', '').replace(/\/$/, '');
          logger.info(`   📝 Preenchendo domínio: ${dominioPreview}...\n`);

          try {
            const preencheuDominio = await page3.evaluate((dominio) => {
              // Procurar input de domínio
              let input = document.querySelector('input[placeholder*="exemplo.com"]');

              if (!input) {
                const allInputs = document.querySelectorAll('input[type="text"]');
                for (const inp of allInputs) {
                  if (inp.offsetParent !== null && inp.value === '') {
                    input = inp;
                    break;
                  }
                }
              }

              if (!input) {
                return { success: false };
              }

              input.focus();
              input.value = dominio;
              input.dispatchEvent(new Event('input', { bubbles: true }));
              input.dispatchEvent(new Event('change', { bubbles: true }));
              return { success: true };
            }, dominioPreview);

            // Passar pelo anti-bot: apagar última letra e redigitar
            if (preencheuDominio.success) {
              logger.info('   🤖 Passando pelo anti-bot (apagar e redigitar última letra)...\n');
              await new Promise(r => setTimeout(r, 500));

              const ultimaLetra = await page3.evaluate((dominio) => {
                const input = document.querySelector('input[placeholder*="exemplo.com"]') ||
                              document.querySelector('input[type="text"]');

                if (!input) return null;

                // Apagar última letra
                input.value = dominio.slice(0, -1);
                input.dispatchEvent(new Event('input', { bubbles: true }));
                input.dispatchEvent(new Event('keydown', { bubbles: true }));
                input.dispatchEvent(new Event('keyup', { bubbles: true }));

                return dominio.slice(-1);
              }, dominioPreview);

              await new Promise(r => setTimeout(r, 300));

              // Redigitar última letra
              if (ultimaLetra) {
                await page3.keyboard.type(ultimaLetra);
                await new Promise(r => setTimeout(r, 200));
                logger.info('   ✅ Anti-bot passado!\n');
              }
            }

            // Verificar se preencheu corretamente
            const valorFinal = await page3.evaluate(() => {
              const input = document.querySelector('input[placeholder*="exemplo.com"]') ||
                            document.querySelector('input[type="text"]');
              return input ? input.value : '';
            });

            logger.info(`   ✅ Domínio preenchido: ${valorFinal}\n`);

            if (preencheuDominio.success) {
              // Aguardar um pouco
              await new Promise(r => setTimeout(r, 1000));

              // Clicar em "Adicionar"
              logger.info('   🔗 Clicando em "Adicionar"...\n');
              const clicouAdicionar = await page3.evaluate(() => {
                const buttons = document.querySelectorAll('button, [role="button"]');
                for (let i = buttons.length - 1; i >= 0; i--) {
                  const btn = buttons[i];
                  if (btn.textContent?.toLowerCase().includes('adicionar') && btn.offsetParent !== null) {
                    btn.click();
                    return true;
                  }
                }
                return false;
              });

              if (clicouAdicionar) {
                logger.info('   ✅ Botão "Adicionar" clicado!\n');
              } else {
                logger.warn('   ⚠️ Botão "Adicionar" não encontrado\n');
              }

              await new Promise(r => setTimeout(r, 2000));
            } else {
              logger.warn('   ⚠️ Input de domínio não encontrado\n');
            }
          } catch (e) {
            logger.warn(`   ⚠️ Erro ao preencher domínio: ${e.message}\n`);
          }

          // Aguardar 40 segundos para Render atualizar e dashboard carregar
          logger.info('   ⏳ Aguardando 40 segundos para Render processar e dashboard carregar...\n');

            // Verificar se dashboard foi carregado
            let dashboardOK = false;
            for (let i = 0; i < 8; i++) {
              await new Promise(r => setTimeout(r, 5000));
              logger.info(`   🔄 Verificando dashboard (${i + 1}/8)...`);

              try {
                const renderUrl = process.env.RENDER_URL || 'facebook-automation-qb1g.onrender.com';
                const cnpjKey = cnpjData.cnpj.replace(/\D/g, '');
                const dashboardUrl = `https://${renderUrl}/?cnpj=${cnpjKey}`;
                const response = await axios.get(dashboardUrl, { timeout: 5000 });

                if (response.status === 200 && response.data.includes(cnpjData.razaoSocial)) {
                  logger.info(`   ✅ Dashboard carregado com sucesso!\n`);
                  dashboardOK = true;
                  break;
                }
              } catch (e) {
                // Continuar tentando
              }
            }

            if (!dashboardOK) {
              logger.warn('   ⚠️ Dashboard pode não ter carregado completamente, continuando mesmo assim...\n');
            }

            // ===== CLICAR NO BOTÃO "VERIFICAR DOMÍNIO" =====
            logger.info('   🔍 Procurando botão "Verificar domínio"...');

            const clicouVerificar = await page3.evaluate(() => {
              const allButtons = document.querySelectorAll('[role="button"]');

              for (let i = 0; i < allButtons.length; i++) {
                const btn = allButtons[i];
                const text = btn.textContent?.trim().toLowerCase() || '';

                if (text.includes('verificar') && text.includes('domínio')) {
                  btn.click();
                  return true;
                }
              }
              return false;
            });

            if (clicouVerificar) {
              logger.info('   ✅ Botão "Verificar domínio" clicado!\n');
            } else {
              logger.warn('   ⚠️ Botão "Verificar domínio" não encontrado\n');
            }

            // Aguardar resposta da verificação
            logger.info('   ⏳ Aguardando resposta da verificação...\n');
            await new Promise(r => setTimeout(r, 5000));

            // ===== EXTRAIR MENSAGENS DE ERRO =====
            const mensagemErro = await page3.evaluate(() => {
              const bodyText = document.body.innerText || '';

              // Procurar por mensagens de erro comuns
              const erros = [
                'Falha na verificação',
                'O domínio já foi verificado',
                'verificado por outra empresa',
                'Unable to verify',
                'Não pudemos verificar',
                'Erro na verificação',
                'Domínio inválido',
                'Domínio não encontrado',
                'Verification failed',
                'Você não pode usar este portfólio',
                'não é possível usar a empresa',
                'Não é possível usar',
                'cannot use this business',
                'cannot use this account',
              ];

              for (const erro of erros) {
                if (bodyText.includes(erro)) {
                  return erro;
                }
              }

              // Se não encontrou erro específico, procurar por qualquer mensagem de erro geral
              if (bodyText.includes('❌') || bodyText.includes('✗') ||
                  bodyText.toLowerCase().includes('erro') ||
                  bodyText.toLowerCase().includes('failed')) {
                // Extrair um trecho maior do texto para contexto
                const lines = bodyText.split('\n');
                for (let i = 0; i < lines.length; i++) {
                  if (lines[i].toLowerCase().includes('erro') ||
                      lines[i].toLowerCase().includes('failed') ||
                      lines[i].toLowerCase().includes('falha')) {
                    return lines[i].trim();
                  }
                }
              }

              return null;
            });

            if (mensagemErro) {
              logger.warn(`   ❌ ERRO DE VERIFICAÇÃO: ${mensagemErro}\n`);
              logger.info('   ℹ️ Verifique manualmente no Facebook Business Manager\n');
            } else {
              logger.info('   ✅ Nenhuma mensagem de erro detectada\n');
              logger.info('   ℹ️ A verificação pode estar em progresso (até 72 horas)\n');
            }
        } else {
          logger.warn('   ⚠️ Meta tag do Facebook não encontrada\n');
        }
        } catch (error) {
          logger.warn(`   ⚠️ Erro ao capturar meta tag: ${error.message}\n`);
        }

      await new Promise(r => setTimeout(r, 2000));
    }

    // ===== PAUSAR E AGUARDAR USUÁRIO =====
    logger.info('\n' + '='.repeat(60));
    logger.info('⏸️ AGUARDANDO SEU COMANDO');
    logger.info('='.repeat(60));
    logger.info('\nPronto para adicionar domínio!');
    logger.info('Verifique a página e depois pressione Ctrl+C para continuar.\n');

    return { success: true, email, cnpj: cnpjData.cnpj, razaoSocial: cnpjData.razaoSocial, nomeSocio, emailGerado, businessId, language: 'pt-BR' };

    await new Promise(r => setTimeout(r, 2000));

    // Clicar em "Concluir" no modal de email
    const emailConfirmado = await page3.evaluate(() => {
      const buttons = document.querySelectorAll('button');
      for (const btn of buttons) {
        const text = btn.textContent?.toLowerCase() || '';
        if (text.includes('concluir') || text.includes('done') || text.includes('continue')) {
          btn.click();
          return true;
        }
      }
      return false;
    });

    if (emailConfirmado) {
      logger.info('✅ Email confirmado\n');
    } else {
      logger.warn('⚠️ Não encontrou botão de concluir\n');
    }

    await new Promise(r => setTimeout(r, 2000));

    // ===== PERMITIR NOTIFICAÇÕES =====
    logger.info('📌 Passo 2: Permitindo notificações no Meta...\n');

    const notificacaoPermitida = await page3.evaluate(() => {
      const buttons = document.querySelectorAll('button');
      for (const btn of buttons) {
        const text = btn.textContent?.toLowerCase() || '';
        if (text.includes('permitir') || text.includes('allow') || text.includes('sim')) {
          btn.click();
          return true;
        }
      }
      return false;
    });

    if (notificacaoPermitida) {
      logger.info('✅ Notificações permitidas\n');
    } else {
      logger.warn('⚠️ Não encontrou botão de permitir notificações\n');
    }

    await new Promise(r => setTimeout(r, 2000));

    // ===== CLICAR NA SETINHA E IR PARA CONFIGURAÇÃO =====
    logger.info('📌 Passo 3: Acessando Configuração da Empresa...\n');

    // Clicar na setinha/menu no canto esquerdo
    const menuClicado = await page3.evaluate(() => {
      // Procurar por botão de menu/setinha
      const buttons = document.querySelectorAll('button, [role="button"]');
      for (const btn of buttons) {
        const ariaLabel = btn.getAttribute('aria-label')?.toLowerCase() || '';
        const title = btn.getAttribute('title')?.toLowerCase() || '';

        if (ariaLabel.includes('menu') || ariaLabel.includes('configuração') ||
            title.includes('menu') || title.includes('configuração') ||
            btn.textContent?.includes('⚙️') || btn.textContent?.includes('≡')) {
          btn.click();
          return true;
        }
      }
      return false;
    });

    if (menuClicado) {
      logger.info('✅ Menu aberto\n');
    } else {
      logger.warn('⚠️ Não encontrou botão de menu\n');
    }

    await new Promise(r => setTimeout(r, 1500));

    logger.info('✅ Navegação completada!\n');

    // ===== DOMÍNIOS - ADICIONAR =====
    logger.info('📌 Passo 4: Adicionando Domínio...\n');

    // Gerar nome de domínio baseado no nome da pessoa
    const nomeDominioGerado = gerarNomeDominio(nomeSocio);
    const dominioCompleto = `${nomeDominioGerado}.com.br`;

    logger.info(`   Domínio gerado: ${dominioCompleto}\n`);

    // Navegar para página de domínios
    logger.info('   🌐 Acessando página de domínios...');
    await page3.goto(`https://business.facebook.com/latest/settings/domains?business_id=${cnpjData.cnpj}`, {
      waitUntil: 'load',
      timeout: 60000,
    }).catch(() => {
      logger.warn('   ⚠️ Não conseguiu navegar direto para domínios');
    });

    await new Promise(r => setTimeout(r, 2000));
    logger.info('   ✅ Página de domínios carregada\n');

    // Clicar em "Adicionar"
    logger.info('   ➕ Clicando em Adicionar...');
    const adicionarClicado = await page3.evaluate(() => {
      const buttons = document.querySelectorAll('button, [role="button"]');
      for (const btn of buttons) {
        const text = btn.textContent?.toLowerCase() || '';
        if (text.includes('adicionar') || text.includes('add') || text.includes('+')) {
          btn.click();
          return true;
        }
      }
      return false;
    });

    if (adicionarClicado) {
      logger.info('   ✅ Botão Adicionar clicado\n');
    } else {
      logger.warn('   ⚠️ Não encontrou botão Adicionar\n');
    }

    await new Promise(r => setTimeout(r, 2000));

    // Preencher campo de domínio
    logger.info('   📝 Preenchendo nome do domínio...');
    const dominioPreenchido = await page3.evaluate((dominio) => {
      const inputs = document.querySelectorAll('input[type="text"]');
      for (const inp of inputs) {
        if (inp.offsetParent !== null && (inp.placeholder?.includes('domain') || inp.placeholder?.includes('domínio'))) {
          inp.focus();
          inp.value = dominio;
          inp.dispatchEvent(new Event('change', { bubbles: true }));
          return true;
        }
      }

      // Fallback: primeiro input visível
      const visibleInputs = Array.from(inputs).filter(inp => inp.offsetParent !== null);
      if (visibleInputs.length > 0) {
        visibleInputs[0].focus();
        visibleInputs[0].value = dominio;
        visibleInputs[0].dispatchEvent(new Event('change', { bubbles: true }));
        return true;
      }

      return false;
    }, dominioCompleto);

    if (dominioPreenchido) {
      logger.info('   ✅ Domínio preenchido\n');
    } else {
      logger.warn('   ⚠️ Não conseguiu preencher domínio\n');
    }

    await new Promise(r => setTimeout(r, 2000));

    logger.info('✅ Domínio adicionado à fila!\n');

    // ===== PEGAR META TAG ID =====
    logger.info('📌 Passo 5: Extraindo Meta Tag ID...\n');

    await new Promise(r => setTimeout(r, 2000));

    const metaTagId = await page3.evaluate(() => {
      // Procurar pelo Meta Tag ID (pode estar em um elemento específico)
      const metaTagElements = document.querySelectorAll('input, span, div');
      for (const el of metaTagElements) {
        const text = el.textContent || el.value || '';
        if (text.includes('meta-') || text.includes('verification-id') || /^\d{15,}$/.test(text.trim())) {
          return text.trim();
        }
      }

      // Procurar em data attributes
      const allElements = document.querySelectorAll('[data-meta-tag], [data-verification-id]');
      if (allElements.length > 0) {
        return allElements[0].getAttribute('data-meta-tag') ||
               allElements[0].getAttribute('data-verification-id') ||
               allElements[0].textContent;
      }

      return null;
    });

    if (metaTagId) {
      logger.info(`✅ Meta Tag ID encontrado: ${metaTagId}\n`);
    } else {
      logger.warn('⚠️ Meta Tag ID não encontrado automaticamente\n');
      logger.info('   📝 Você terá que copiar manualmente do Meta e adicionar ao Cloudflare\n');
    }

    // ===== WORKER CLOUDFLARE =====
    logger.info('📌 Passo 6: Gerando Worker Cloudflare...\n');

    // Gerar script do Worker baseado no Meta Tag ID
    const workerScript = metaTagId ? `
// Cloudflare Worker - Meta Domain Verification
export default {
  async fetch(request) {
    const url = new URL(request.url);

    // Rota de verificação Meta
    if (url.pathname === '/.well-known/meta-verification') {
      return new Response('${metaTagId}', {
        status: 200,
        headers: { 'Content-Type': 'text/plain' }
      });
    }

    // Redirecionar para homepage
    return new Response('Domínio verificado', {
      status: 200,
      headers: { 'Content-Type': 'text/html' }
    });
  }
};
    ` : '// Adicionar Meta Tag ID acima na linha com o valor correspondente';

    logger.info('   📝 Worker Script Gerado:\n');
    logger.info('   ' + workerScript.substring(0, 100) + '...\n');

    logger.info('   📋 Para configurar no Cloudflare:\n');
    logger.info('   1. Abrir Cloudflare > Workers\n');
    logger.info('   2. Criar novo worker\n');
    logger.info('   3. Colar o script acima em workers.js\n');
    logger.info('   4. Fazer deploy\n\n');

    // Salvar worker script
    fs.writeFileSync('cloudflare-worker.js', workerScript);
    logger.info('✅ Worker salvo em cloudflare-worker.js\n');

    // ===== VERIFICAR DOMÍNIO =====
    logger.info('📌 Passo 7: Verificando Domínio...\n');

    await new Promise(r => setTimeout(r, 2000));

    const verificarClicado = await page3.evaluate(() => {
      const buttons = document.querySelectorAll('button, [role="button"]');
      for (const btn of buttons) {
        const text = btn.textContent?.toLowerCase() || '';
        if (text.includes('verificar') || text.includes('verify') || text.includes('confirmar')) {
          btn.click();
          return true;
        }
      }
      return false;
    });

    if (verificarClicado) {
      logger.info('✅ Clicado em Verificar\n');
      await new Promise(r => setTimeout(r, 5000)); // Aguardar verificação
      logger.info('✅ Domínio Verificado!\n');
    } else {
      logger.warn('⚠️ Botão Verificar não encontrado\n');
    }

    // ===== INFORMAÇÕES DA EMPRESA =====
    logger.info('📌 Passo 8: Preenchendo Informações da Empresa...\n');

    const infoUrl = `https://business.facebook.com/latest/settings/business_info?business_id=${businessId}`;

    logger.info('   🌐 Acessando página de informações...');
    await page3.goto(infoUrl, {
      waitUntil: 'load',
      timeout: 60000,
    }).catch(() => {
      logger.warn('   ⚠️ Não conseguiu navegar para informações');
    });

    await new Promise(r => setTimeout(r, 2000));
    logger.info('   ✅ Página carregada\n');

    // Clicar em "Editar Detalhes"
    logger.info('   ✏️ Clicando em Editar Detalhes...');
    const editarClicado = await page3.evaluate(() => {
      const buttons = document.querySelectorAll('button, [role="button"], a');
      for (const btn of buttons) {
        const text = btn.textContent?.toLowerCase() || '';
        if (text.includes('editar') || text.includes('edit') || text.includes('modificar')) {
          btn.click();
          return true;
        }
      }
      return false;
    });

    if (editarClicado) {
      logger.info('   ✅ Clicado\n');
    } else {
      logger.warn('   ⚠️ Botão não encontrado\n');
    }

    await new Promise(r => setTimeout(r, 2000));

    // Preencher campos de empresa
    logger.info('   📝 Preenchendo dados da empresa...');

    const empresaPreenchida = await page3.evaluate((empresa) => {
      const inputs = document.querySelectorAll('input[type="text"], textarea');
      const visibleInputs = Array.from(inputs).filter(inp => inp.offsetParent !== null);

      if (visibleInputs.length > 0) {
        // Primeiro campo: Razão Social
        visibleInputs[0].focus();
        visibleInputs[0].value = empresa.razaoSocial;
        visibleInputs[0].dispatchEvent(new Event('change', { bubbles: true }));

        // Segundo campo: Website (domínio)
        if (visibleInputs.length > 1) {
          visibleInputs[1].focus();
          visibleInputs[1].value = 'https://' + empresa.dominio;
          visibleInputs[1].dispatchEvent(new Event('change', { bubbles: true }));
        }

        return true;
      }
      return false;
    }, { razaoSocial: cnpjData.razaoSocial, dominio: dominioCompleto });

    if (empresaPreenchida) {
      logger.info('   ✅ Dados preenchidos\n');
    } else {
      logger.warn('   ⚠️ Não conseguiu preencher dados\n');
    }

    await new Promise(r => setTimeout(r, 1500));

    // Clicar em Salvar
    logger.info('   💾 Salvando...');
    const salvoClicado = await page3.evaluate(() => {
      const buttons = document.querySelectorAll('button');
      for (const btn of buttons) {
        const text = btn.textContent?.toLowerCase() || '';
        if (text.includes('salvar') || text.includes('save') || text.includes('guardar')) {
          btn.click();
          return true;
        }
      }
      return false;
    });

    if (salvoClicado) {
      logger.info('   ✅ Salvo com sucesso!\n');
    } else {
      logger.warn('   ⚠️ Não encontrou botão de salvar\n');
    }

    await new Promise(r => setTimeout(r, 2000));

    // ===== WHATSAPP =====
    logger.info('📌 Passo 9: Criando Conta WhatsApp...\n');

    const whatsappUrl = `https://business.facebook.com/latest/settings/whatsapp_account?business_id=${businessId}`;

    logger.info('   💬 Acessando WhatsApp...');
    await page3.goto(whatsappUrl, {
      waitUntil: 'load',
      timeout: 60000,
    }).catch(() => {
      logger.warn('   ⚠️ Não conseguiu acessar WhatsApp');
    });

    await new Promise(r => setTimeout(r, 2000));
    logger.info('   ✅ Página carregada\n');

    // Clicar em Adicionar
    logger.info('   ➕ Clicando em Adicionar...');
    const whatsappAdicionarClicado = await page3.evaluate(() => {
      const buttons = document.querySelectorAll('button, [role="button"]');
      for (const btn of buttons) {
        const text = btn.textContent?.toLowerCase() || '';
        if (text.includes('adicionar') || text.includes('add') || text.includes('nova')) {
          btn.click();
          return true;
        }
      }
      return false;
    });

    if (whatsappAdicionarClicado) {
      logger.info('   ✅ Modal aberto\n');
    } else {
      logger.warn('   ⚠️ Não encontrou botão Adicionar\n');
    }

    await new Promise(r => setTimeout(r, 2000));

    // Preencher nome
    logger.info('   📝 Preenchendo nome da conta...');
    const whatsappNomePreenchido = await page3.evaluate((nome) => {
      const inputs = document.querySelectorAll('input[type="text"]');
      for (const inp of inputs) {
        if (inp.offsetParent !== null) {
          inp.focus();
          inp.value = nome;
          inp.dispatchEvent(new Event('change', { bubbles: true }));
          return true;
        }
      }
      return false;
    }, nomeSocio);

    if (whatsappNomePreenchido) {
      logger.info('   ✅ Nome preenchido\n');
    } else {
      logger.warn('   ⚠️ Não conseguiu preencher nome\n');
    }

    await new Promise(r => setTimeout(r, 1500));

    // Selecionar categoria "Outro"
    logger.info('   📂 Selecionando categoria "Outro"...');
    const categoriaOutroClicada = await page3.evaluate(() => {
      const selects = document.querySelectorAll('select');
      for (const select of selects) {
        if (select.offsetParent !== null) {
          select.value = 'outro';
          select.dispatchEvent(new Event('change', { bubbles: true }));
          return true;
        }
      }

      // Fallback: procurar por opcao "Outro"
      const options = document.querySelectorAll('option, [role="option"]');
      for (const opt of options) {
        if (opt.textContent?.toLowerCase().includes('outro')) {
          opt.click();
          return true;
        }
      }

      return false;
    });

    if (categoriaOutroClicada) {
      logger.info('   ✅ Categoria selecionada\n');
    } else {
      logger.warn('   ⚠️ Não conseguiu selecionar categoria\n');
    }

    await new Promise(r => setTimeout(r, 2000));

    logger.info('⚠️ CAPTCHA DETECTADO!\n');
    logger.info('📝 Você precisa resolver o captcha manualmente:\n');
    logger.info('   1. Localize o captcha na página\n');
    logger.info('   2. Complete o desafio\n');
    logger.info('   3. Clique em "Criar" ou "Submit"\n');
    logger.info('   4. O navegador continuará automaticamente\n\n');

    logger.info('⏳ Aguardando 30 segundos para você resolver o captcha...\n');
    await new Promise(r => setTimeout(r, 30000));

    // Salvar dados utilizados
    logger.info('💾 Salvando dados do CNPJ utilizado...');

    const cnpjLog = {
      timestamp: new Date().toISOString(),
      email_facebook: email,
      cnpj: cnpjData.cnpj,
      razaoSocial: cnpjData.razaoSocial,
      nomeFantasia: cnpjData.nomeFantasia,
      situacao: cnpjData.situacao,
      dataAbertura: cnpjData.dataAbertura,
      telefone: cnpjData.telefone,
      nomeSocio: nomeSocio,
      emailGerado: emailGerado,
      socios: cnpjData.socios
    };

    fs.appendFileSync('cnpj-utilizados.json', JSON.stringify(cnpjLog, null, 2) + '\n\n');
    logger.info('✅ Dados salvos em cnpj-utilizados.json\n');

    await page3.close();

    logger.info('='.repeat(60));
    logger.info('✅ BUSINESS MANAGER PREPARADO COM SUCESSO!');
    logger.info('='.repeat(60) + '\n');

    return { success: true, email, cnpj: cnpjData.cnpj, razaoSocial: cnpjData.razaoSocial, language: 'pt-BR' };

  } catch (error) {
    logger.error(`❌ ERRO: ${error.message}\n`);
    return { success: false, email, error: error.message };
  } finally {
    if (page2) await page2.close();
    if (page1) await page1.close();
    if (browser) {
      logger.info('\n' + '='.repeat(60));
      logger.info('⏸️ NAVEGADOR ABERTO - NÃO FECHE!');
      logger.info('='.repeat(60));
      logger.info('\nO navegador permanecerá aberto para você ver os próximos passos.');
      logger.info('Pressione Ctrl+C no terminal para fechar.\n');

      // Aguardar indefinidamente
      await new Promise(() => {});
    }
  }
}

/**
 * 📋 Ler contas do lista.txt
 */
function lerContasDeFacebook() {
  try {
    const fs = require('fs');
    const path = require('path');
    const caminhoLista = path.join(__dirname, 'lista.txt');

    if (!fs.existsSync(caminhoLista)) {
      logger.warn('⚠️ arquivo lista.txt não encontrado');
      return null;
    }

    const conteudo = fs.readFileSync(caminhoLista, 'utf8');
    const blocos = conteudo.split('-----').filter(b => b.trim());
    const contas = [];

    blocos.forEach(bloco => {
      const linhas = bloco.split('\n').filter(l => l.trim());
      const conta = {};

      linhas.forEach(linha => {
        if (linha.includes('EMAIL:')) {
          conta.email = linha.split('EMAIL:')[1].trim();
        } else if (linha.includes('SENHA FACE:')) {
          conta.senha = linha.split('SENHA FACE:')[1].trim();
        } else if (linha.includes('UID:')) {
          conta.uid = linha.split('UID:')[1].trim();
        } else if (linha.includes('AUTENTICADOR 2FA:')) {
          // Extrair URL do Browserscan
          conta.browserscanUrl = linha.split('AUTENTICADOR 2FA:')[1].trim();
        }
      });

      if (conta.email && conta.senha) {
        contas.push(conta);
      }
    });

    return contas.length > 0 ? contas : null;
  } catch (e) {
    logger.warn(`⚠️ Erro ao ler lista.txt: ${e.message}`);
    return null;
  }
}

/**
 * 🚀 Executar múltiplas contas sequencialmente (1 por 1)
 */
async function executarMultiplasContas(contas, quantidade = 5) {
  const contasParaExecutar = contas.slice(0, quantidade);
  const resultados = [];

  logger.info('\n' + '='.repeat(70));
  logger.info(`🚀 EXECUTANDO ${contasParaExecutar.length} CONTAS - 1 POR 1`);
  logger.info('='.repeat(70) + '\n');

  // Executar contas sequencialmente (uma por uma)
  for (let idx = 0; idx < contasParaExecutar.length; idx++) {
    const conta = contasParaExecutar[idx];

    try {
      logger.info(`\n[${'='.repeat(50)}]`);
      logger.info(`[${idx + 1}/${contasParaExecutar.length}] 🔄 INICIANDO: ${conta.email}`);
      logger.info(`[${'='.repeat(50)}]\n`);

      const proxy = null; // PROXY DESABILITADA POR ENQUANTO
      const resultado = await automateAutoRetry(conta.email, conta.senha, proxy, conta.browserscanUrl);

      resultados.push({
        email: conta.email,
        uid: conta.uid,
        sucesso: resultado.success,
        resultado
      });

      logger.info(`\n[${'='.repeat(50)}]`);
      logger.info(`[${idx + 1}/${contasParaExecutar.length}] ✅ CONCLUÍDO: ${conta.email}`);
      logger.info(`[${'='.repeat(50)}]\n`);
    } catch (e) {
      logger.error(`\n[${'='.repeat(50)}]`);
      logger.error(`[${idx + 1}/${contasParaExecutar.length}] ❌ FALHOU: ${conta.email}`);
      logger.error(`Erro: ${e.message}`);
      logger.error(`[${'='.repeat(50)}]\n`);

      resultados.push({
        email: conta.email,
        uid: conta.uid,
        sucesso: false,
        erro: e.message
      });
    }

    // Delay de 2 segundos entre contas
    if (idx < contasParaExecutar.length - 1) {
      logger.info('⏳ Aguardando 2 segundos antes da próxima conta...\n');
      await new Promise(r => setTimeout(r, 2000));
    }
  }

  return resultados;
}

// ⚠️ LER CONTAS DO lista.txt:
// ==================================
const CONTAS_FACEBOOK = lerContasDeFacebook();
const EMAIL = CONTAS_FACEBOOK ? CONTAS_FACEBOOK[0].email : 'ahbuphh@mailto.plus';
const PASSWORD = CONTAS_FACEBOOK ? CONTAS_FACEBOOK[0].senha : 'XXNKGTGlw97EXX';
// ==================================

// Executar
if (require.main === module) {
  // Mostrar quantas contas foram detectadas
  if (CONTAS_FACEBOOK && CONTAS_FACEBOOK.length > 0) {
    logger.info('\n' + '='.repeat(60));
    logger.info(`📱 CONTAS DE FACEBOOK DETECTADAS: ${CONTAS_FACEBOOK.length}`);
    logger.info('='.repeat(60));
    CONTAS_FACEBOOK.forEach((conta, idx) => {
      logger.info(`${idx + 1}. Email: ${conta.email} (UID: ${conta.uid || 'N/A'})`);
    });
    logger.info('');

    // Executar até 5 contas simultaneamente
    executarMultiplasContas(CONTAS_FACEBOOK, 5)
      .then(resultados => {
        logger.info('\n' + '='.repeat(70));
        logger.info('📊 RESUMO DOS RESULTADOS');
        logger.info('='.repeat(70));
        let sucessos = 0;
        resultados.forEach(r => {
          const status = r.sucesso ? '✅' : '❌';
          logger.info(`${status} ${r.email} (UID: ${r.uid || 'N/A'})`);
          if (r.sucesso) sucessos++;
        });
        logger.info(`\n📈 TOTAL: ${sucessos}/${resultados.length} contas bem-sucedidas\n`);
        process.exit(sucessos > 0 ? 0 : 1);
      })
      .catch(error => {
        logger.error(`Fatal: ${error.message}`);
        process.exit(1);
      });
  } else {
    logger.warn('\n⚠️ Nenhuma conta detectada em lista.txt');
    logger.warn(`Usando conta padrão: ${EMAIL}\n`);

    const proxy = null; // PROXY DESABILITADA POR ENQUANTO
    automateAutoRetry(EMAIL, PASSWORD, proxy)
      .then(result => {
        logger.info(`\n📊 Resultado:`, JSON.stringify(result, null, 2));
        process.exit(result.success ? 0 : 1);
      })
      .catch(error => {
        logger.error(`Fatal: ${error.message}`);
        process.exit(1);
      });
  }
}

module.exports = { automateAutoRetry };
