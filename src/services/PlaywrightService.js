/**
 * 🎭 PLAYWRIGHT SERVICE
 * Alternativa ao AdsPower usando Playwright
 * - Contextos isolados
 * - Fingerprint único por conta
 * - Proxy rotation
 * - Storage isolado
 */

const { chromium } = require('playwright');
const randomUseragent = require('random-useragent');
const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');

const TIMEZONES = [
  'America/Sao_Paulo',
  'America/New_York',
  'America/Los_Angeles',
  'Europe/London',
  'Europe/Paris',
  'Asia/Tokyo',
  'Australia/Sydney',
];

const LOCALES = [
  'pt-BR',
  'en-US',
  'en-GB',
  'fr-FR',
  'de-DE',
  'ja-JP',
  'es-ES',
];

class PlaywrightService {
  constructor() {
    this.browsers = new Map(); // Rastrear browsers por account
    this.contexts = new Map(); // Rastrear contexts
    this.storageDir = path.join(__dirname, '../../storage/playwright');

    // Criar pasta de storage se não existir
    if (!fs.existsSync(this.storageDir)) {
      fs.mkdirSync(this.storageDir, { recursive: true });
    }
  }

  /**
   * Cria um contexto isolado para uma conta
   */
  async createIsolatedContext(accountId, accountEmail, proxy = null) {
    try {
      logger.info(`🎭 Criando contexto Playwright para: ${accountEmail}`);

      const browser = await chromium.launch({
        headless: process.env.HEADLESS !== 'false',
        args: [
          '--disable-blink-features=AutomationControlled',
          '--disable-dev-shm-usage',
        ],
      });

      const storageFile = path.join(this.storageDir, `${accountId}.json`);
      const hasStorage = fs.existsSync(storageFile);

      // Contexto com fingerprint único
      const context = await browser.newContext({
        // User Agent único e variável
        userAgent: randomUseragent.getRandom(),

        // Proxy por contexto (exatamente como fornecido)
        ...(proxy && {
          proxy: {
            server: proxy
          }
        }),

        // Timezone diferente por conta
        timezoneId: TIMEZONES[accountId % TIMEZONES.length],

        // Locale diferente
        locale: LOCALES[accountId % LOCALES.length],

        // Geolocation fake
        geolocation: {
          latitude: -23.5 + (Math.random() * 10 - 5),
          longitude: -46.6 + (Math.random() * 10 - 5),
        },

        // Viewport customizado
        viewport: {
          width: 1200 + (accountId % 3) * 100,
          height: 800 + (accountId % 3) * 50,
        },

        // Screen customizado
        screen: {
          width: 1920 + (accountId % 2) * 60,
          height: 1080 + (accountId % 2) * 40,
        },

        // Device scale factor variável
        deviceScaleFactor: 1 + (Math.random() * 0.3),

        // Carregar storage anterior se existir
        ...(hasStorage && { storageState: storageFile }),
      });

      this.browsers.set(accountId, browser);
      this.contexts.set(accountId, context);

      logger.info(`✅ Contexto criado para: ${accountEmail}`);
      logger.info(`   📍 Timezone: ${TIMEZONES[accountId % TIMEZONES.length]}`);
      logger.info(`   🌐 Locale: ${LOCALES[accountId % LOCALES.length]}`);
      logger.info(`   📱 Viewport: ${1200 + (accountId % 3) * 100}x${800 + (accountId % 3) * 50}`);

      return { browser, context };
    } catch (error) {
      logger.error(`Erro ao criar contexto Playwright: ${error.message}`);
      throw error;
    }
  }

  /**
   * Obter contexto existente
   */
  getContext(accountId) {
    const context = this.contexts.get(accountId);
    if (!context) {
      throw new Error(`Contexto não encontrado para conta: ${accountId}`);
    }
    return context;
  }

  /**
   * Criar página no contexto
   */
  async createPage(accountId) {
    const context = this.getContext(accountId);
    const page = await context.newPage();

    // Set timeouts
    page.setDefaultTimeout(30000);
    page.setDefaultNavigationTimeout(30000);

    return page;
  }

  /**
   * Salvar estado (cookies, localStorage)
   */
  async saveState(accountId) {
    try {
      const context = this.contexts.get(accountId);
      if (!context) return;

      const storageFile = path.join(this.storageDir, `${accountId}.json`);
      const storageState = await context.storageState();

      fs.writeFileSync(storageFile, JSON.stringify(storageState, null, 2));
      logger.info(`💾 Estado salvo para conta ${accountId}`);
    } catch (error) {
      logger.error(`Erro ao salvar estado: ${error.message}`);
    }
  }

  /**
   * Fechar conta
   */
  async closeAccount(accountId) {
    try {
      // Salvar estado antes de fechar
      await this.saveState(accountId);

      const browser = this.browsers.get(accountId);
      if (browser) {
        await browser.close();
        this.browsers.delete(accountId);
        this.contexts.delete(accountId);
        logger.info(`✅ Conta ${accountId} fechada`);
      }
    } catch (error) {
      logger.error(`Erro ao fechar conta: ${error.message}`);
    }
  }

  /**
   * Fechar todas as contas
   */
  async closeAll() {
    for (const accountId of this.browsers.keys()) {
      await this.closeAccount(accountId);
    }
    logger.info('✅ Todos os browsers fechados');
  }

  /**
   * Obter informações da conta
   */
  async getAccountInfo(accountId) {
    try {
      const page = await this.createPage(accountId);

      const info = await page.evaluate(() => ({
        userAgent: navigator.userAgent,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        language: navigator.language,
        viewport: `${window.innerWidth}x${window.innerHeight}`,
        screen: `${window.screen.width}x${window.screen.height}`,
        platform: navigator.platform,
      }));

      await page.close();
      return info;
    } catch (error) {
      logger.error(`Erro ao obter info da conta: ${error.message}`);
      throw error;
    }
  }
}

module.exports = new PlaywrightService();
