const logger = require('../utils/logger');
const Helpers = require('../utils/helpers');
const Account = require('../models/Account');
const FacebookBotService = require('../services/FacebookBotService');
const CloudflareService = require('../services/CloudflareService');
const SMSService = require('../services/SMSService');

class AutomationController {
  constructor() {
    this.bot = null;
    this.currentAccountId = null;
  }

  async runFullAutomation(accountData) {
    try {
      logger.info(`========== INICIANDO AUTOMAÇÃO COMPLETA ==========`);
      logger.info(`Email: ${accountData.email}`);

      // Criar conta no banco de dados
      const accountId = await Account.create(accountData);
      this.currentAccountId = accountId;

      // Iniciar navegador
      await this.initializeBot(accountData.proxy);

      // Step 1: Login no Facebook
      await this.executeStep('login', () => this.bot.login(accountData.email, accountData.password));

      // Step 2: Processar 2FA se necessário
      if (accountData.twoFASecret) {
        await this.executeStep('2fa', () => this.handle2FA(accountData.twoFASecret));
      }

      // Step 3: Processar modals
      await this.executeStep('modals', () => this.bot.handleModals());

      // Step 4: Configurar idioma para Português
      await this.executeStep('language', () => this.bot.setLanguageToPortuguese());

      // Step 5: Criar portfolio de negócio
      const businessData = {
        personName: accountData.cnpjData.personName,
        email: Helpers.generateRandomEmail()
      };
      await this.executeStep('business_portfolio', () =>
        this.bot.createBusinessPortfolio(accountData.businessName, businessData)
      );

      // Step 6: Configurar domínio (worker ou normal)
      let domain;
      const workerDomain = CloudflareService.getWorkerDomain();

      if (workerDomain) {
        logger.info(`Usando Cloudflare Worker: ${workerDomain}`);
        domain = workerDomain;
        await this.executeStep('domain_config', () =>
          this.bot.configureDomain(workerDomain, true)
        );
      } else {
        logger.info(`Usando domínio normal`);
        const domainName = `${accountData.cnpjData.personName.toLowerCase().replace(/\s+/g, '')}.com.br`;
        domain = await this.executeStep('domain_config', () =>
          this.bot.configureDomain(domainName, false)
        );
      }

      // Step 7: Extrair Business ID
      const businessId = await this.bot.extractBusinessId();
      if (!businessId) {
        throw new Error('Falha ao extrair Business ID');
      }

      // Step 8: Criar Worker Cloudflare
      // const metaTagId = await this.extractMetaTagId();
      // await this.executeStep('cloudflare_worker', () =>
      //   CloudflareService.createWorker(domain, metaTagId)
      // );

      // Step 9: Verificar domínio
      await this.executeStep('domain_verify', () =>
        this.bot.verifyDomain(businessId, domain)
      );

      // Step 10: Criar conta WhatsApp
      await this.executeStep('whatsapp_create', () =>
        this.bot.createWhatsAppAccount(businessId, accountData.businessName)
      );

      // Step 11: Processar verificação de empresa
      const smsNumber = await this.executeStep('sms_buy', () =>
        SMSService.buyNumber('BR', 'facebook')
      );

      if (smsNumber) {
        await this.executeStep('sms_verify', () =>
          this.handleSMSVerification(businessId, smsNumber)
        );
      }

      // Atualizar status
      await Account.update(accountId, {
        status: 'completed',
        verified: 1,
        business_id: businessId,
        domain: domain
      });

      logger.info(`========== AUTOMAÇÃO CONCLUÍDA COM SUCESSO ==========`);

      return {
        success: true,
        accountId,
        businessId,
        domain
      };

    } catch (error) {
      logger.error(`Erro durante automação: ${error.message}`);

      if (this.currentAccountId) {
        await Account.update(this.currentAccountId, {
          status: 'failed'
        });
      }

      throw error;

    } finally {
      await this.closeBot();
    }
  }

  async initializeBot(proxy = null) {
    this.bot = new FacebookBotService();
    const options = {};

    if (proxy) {
      options.proxy = proxy;
    }

    await this.bot.launch(options);
  }

  async closeBot() {
    if (this.bot) {
      await this.bot.close();
      this.bot = null;
    }
  }

  async executeStep(stepName, stepFunction) {
    try {
      logger.info(`📍 Executando step: ${stepName}`);

      const result = await Helpers.retry(stepFunction, 3, 2000);

      await Account.addLog(this.currentAccountId, stepName, 'success', 'Step concluído com sucesso');
      logger.info(`✅ Step ${stepName} concluído`);

      return result;

    } catch (error) {
      logger.error(`❌ Step ${stepName} falhou: ${error.message}`);
      await Account.addLog(this.currentAccountId, stepName, 'failed', error.message);
      throw error;
    }
  }

  async handle2FA(twoFASecret) {
    try {
      logger.info('Processando 2FA...');

      // Se o 2FA for um link direto
      if (twoFASecret.startsWith('http')) {
        return await this.bot.handle2FA(twoFASecret);
      }

      // Se for um secret/ID do autenticador
      // Você pode usar uma biblioteca como 'speakeasy' para gerar código TOTP
      // Por enquanto, retornamos null para que o usuário insira manualmente
      logger.warn('2FA requer entrada manual - secret não pode ser processado automaticamente');
      return null;
    } catch (error) {
      logger.error(`Erro ao processar 2FA: ${error.message}`);
      throw error;
    }
  }

  async handleSMSVerification(businessId, smsData) {
    try {
      logger.info(`Processando verificação SMS: ${smsData.number}`);

      // Aguardar código SMS
      const code = await SMSService.getCode(smsData.requestId);

      if (!code) {
        throw new Error('Não foi possível obter código SMS');
      }

      // Inserir código no Facebook
      await this.bot.page.goto(
        `https://business.facebook.com/latest/settings/security_center/?business_id=${businessId}`,
        { waitUntil: 'networkidle2' }
      );

      await Helpers.randomDelay();

      // Procurar e preencher campo de SMS
      const smsInputs = await this.bot.page.$$('input[type="text"]');
      if (smsInputs.length > 0) {
        await smsInputs[0].type(code, { delay: 100 });
        await Helpers.randomDelay();

        const submitBtn = await this.bot.page.$('button[type="submit"]');
        if (submitBtn) {
          await submitBtn.click();
          await Helpers.randomDelay(2000);
        }
      }

      // Confirmar código
      await SMSService.confirmCode(smsData.requestId);

      logger.info('Verificação SMS concluída');
      return true;

    } catch (error) {
      logger.error(`Erro ao processar SMS: ${error.message}`);
      throw error;
    }
  }

  async extractMetaTagId() {
    try {
      const html = await this.bot.page.content();
      return Helpers.extractMetaTagID(html);
    } catch (error) {
      logger.error(`Erro ao extrair meta tag: ${error.message}`);
      return null;
    }
  }
}

module.exports = AutomationController;
