const logger = require('../utils/logger');
const Account = require('../models/Account');
const AutomationController = require('../automation/AutomationController');
const Helpers = require('../utils/helpers');

class BatchProcessor {
  constructor(options = {}) {
    this.concurrent = options.concurrent || 1;
    this.delay = options.delay || 30000; // Delay entre contas
    this.pauseOnError = options.pauseOnError !== false;
    this.queue = [];
    this.running = false;
    this.stats = {
      total: 0,
      completed: 0,
      failed: 0,
      skipped: 0
    };
  }

  addAccount(accountData) {
    this.queue.push(accountData);
    this.stats.total++;
  }

  addAccounts(accountsList) {
    accountsList.forEach(acc => this.addAccount(acc));
  }

  async start() {
    if (this.running) {
      logger.warn('Processamento já está em andamento');
      return;
    }

    this.running = true;
    logger.info(`========== INICIANDO PROCESSAMENTO EM LOTE ==========`);
    logger.info(`Total de contas: ${this.stats.total}`);
    logger.info(`Processamento concorrente: ${this.concurrent}`);

    const batches = this.createBatches(this.queue, this.concurrent);

    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];
      logger.info(`\n📦 Lote ${i + 1}/${batches.length} (${batch.length} contas)`);

      const promises = batch.map(accountData =>
        this.processAccount(accountData).catch(error =>
          logger.error(`Erro ao processar conta: ${error.message}`)
        )
      );

      await Promise.all(promises);

      // Delay entre lotes
      if (i < batches.length - 1) {
        logger.info(`Aguardando ${this.delay}ms antes do próximo lote...`);
        await Helpers.delay(this.delay);
      }
    }

    this.running = false;
    this.printStats();
  }

  async processAccount(accountData) {
    try {
      logger.info(`\n🚀 Processando: ${accountData.email}`);

      // Verificar se conta já existe
      const existing = await Account.findByEmail(accountData.email);
      if (existing) {
        logger.warn(`Conta já existe: ${accountData.email}`);
        this.stats.skipped++;
        return;
      }

      // Executar automação
      const controller = new AutomationController();
      const result = await controller.runFullAutomation(accountData);

      this.stats.completed++;
      logger.info(`✅ Conta processada com sucesso: ${accountData.email}`);

      return result;

    } catch (error) {
      this.stats.failed++;
      logger.error(`❌ Falha na conta ${accountData.email}: ${error.message}`);

      if (this.pauseOnError) {
        logger.warn('Processamento pausado devido a erro');
        this.running = false;
        throw error;
      }
    }
  }

  createBatches(array, size) {
    const batches = [];
    for (let i = 0; i < array.length; i += size) {
      batches.push(array.slice(i, i + size));
    }
    return batches;
  }

  printStats() {
    logger.info(`\n========== RELATÓRIO FINAL ==========`);
    logger.info(`Total processadas: ${this.stats.completed}/${this.stats.total}`);
    logger.info(`Sucessos: ${this.stats.completed}`);
    logger.info(`Falhas: ${this.stats.failed}`);
    logger.info(`Puladas: ${this.stats.skipped}`);
    logger.info(`Taxa de sucesso: ${((this.stats.completed / this.stats.total) * 100).toFixed(2)}%`);
  }

  getStats() {
    return {
      ...this.stats,
      percentage: this.stats.total > 0 ? ((this.stats.completed / this.stats.total) * 100).toFixed(2) : 0
    };
  }

  stop() {
    this.running = false;
    logger.info('Processamento parado pelo usuário');
  }

  clear() {
    this.queue = [];
    this.stats = { total: 0, completed: 0, failed: 0, skipped: 0 };
  }
}

module.exports = BatchProcessor;
