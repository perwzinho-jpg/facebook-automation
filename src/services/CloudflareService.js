const axios = require('axios');
const logger = require('../utils/logger');

class CloudflareService {
  constructor() {
    this.token = process.env.CLOUDFLARE_API_TOKEN;
    this.zoneId = process.env.CLOUDFLARE_ZONE_ID;
    this.accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
    this.workerDomain = process.env.CLOUDFLARE_WORKER_DOMAIN;
    this.workerName = process.env.CLOUDFLARE_WORKER_NAME;
    this.baseURL = 'https://api.cloudflare.com/client/v4';
    this.useWorker = !!this.workerDomain && !!this.workerName;
    this.client = axios.create({
      baseURL: this.baseURL,
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'Content-Type': 'application/json'
      }
    });
  }

  getWorkerDomain() {
    if (this.useWorker) {
      return this.workerDomain;
    }
    return null;
  }

  async createWorkerAutomatically(workerNameSuffix = 'bm-automation') {
    try {
      const accountSubdomain = process.env.CLOUDFLARE_ACCOUNT_SUBDOMAIN;

      if (!accountSubdomain) {
        throw new Error('CLOUDFLARE_ACCOUNT_SUBDOMAIN não configurado no .env');
      }

      const workerName = `${accountSubdomain}-${workerNameSuffix}`;
      const workerDomain = `${workerName}.${accountSubdomain}.workers.dev`;

      logger.info(`Criando Worker automaticamente: ${workerName}`);

      // Código básico do worker
      const basicWorkerCode = `
addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request));
});

async function handleRequest(request) {
  // Worker criado automaticamente pelo BM Automation
  const response = new Response('BM Automation Worker', { status: 200 });
  return response;
}
      `.trim();

      // Criar worker via API
      const response = await this.client.put(
        `/accounts/${this.accountId}/workers/scripts/${workerName}`,
        { script: basicWorkerCode }
      );

      logger.info(`Worker criado com sucesso!`);
      logger.info(`Nome: ${workerName}`);
      logger.info(`Domínio: ${workerDomain}`);

      return {
        name: workerName,
        domain: workerDomain,
        created: true
      };
    } catch (error) {
      logger.error(`Erro ao criar Worker: ${error.message}`);
      throw error;
    }
  }

  async createDomain(domainName) {
    try {
      logger.info(`Criando domínio no Cloudflare: ${domainName}`);

      if (!this.zoneId) {
        throw new Error('CLOUDFLARE_ZONE_ID não configurado');
      }

      const response = await this.client.post(
        `/zones/${this.zoneId}/dns_records`,
        {
          type: 'A',
          name: domainName,
          content: '1.1.1.1',
          ttl: 3600,
          proxied: false
        }
      );

      logger.info(`Domínio criado com sucesso: ${domainName}`);
      return response.data.result;
    } catch (error) {
      logger.error(`Erro ao criar domínio: ${error.message}`);
      throw error;
    }
  }

  async createWorker(domainName, metaTagId) {
    try {
      if (this.useWorker) {
        return await this.updateWorkerWithMetaTag(metaTagId);
      }

      logger.info(`Criando Worker Cloudflare para: ${domainName}`);

      const Helpers = require('../utils/helpers');
      const workerCode = Helpers.generateWorkerCode(metaTagId);

      const response = await this.client.post(
        `/accounts/${this.accountId}/workers/scripts/${domainName}`,
        { script: workerCode }
      );

      logger.info(`Worker criado com sucesso para: ${domainName}`);
      return response.data.result;
    } catch (error) {
      logger.error(`Erro ao criar Worker: ${error.message}`);
      throw error;
    }
  }

  async updateWorkerWithMetaTag(metaTagId) {
    try {
      logger.info(`Atualizando Worker ${this.workerName} com meta tag: ${metaTagId}`);

      const Helpers = require('../utils/helpers');
      const workerCode = Helpers.generateWorkerCode(metaTagId);

      const response = await this.client.put(
        `/accounts/${this.accountId}/workers/scripts/${this.workerName}`,
        { script: workerCode }
      );

      logger.info(`Worker ${this.workerName} atualizado com sucesso`);
      return {
        name: this.workerName,
        domain: this.workerDomain,
        metaTagId: metaTagId
      };
    } catch (error) {
      logger.error(`Erro ao atualizar Worker: ${error.message}`);
      throw error;
    }
  }

  async listDomains() {
    try {
      const response = await this.client.get(`/zones/${this.zoneId}/dns_records`);
      return response.data.result;
    } catch (error) {
      logger.error(`Erro ao listar domínios: ${error.message}`);
      throw error;
    }
  }

  async deleteDomain(recordId) {
    try {
      logger.info(`Deletando domínio: ${recordId}`);
      const response = await this.client.delete(
        `/zones/${this.zoneId}/dns_records/${recordId}`
      );
      logger.info(`Domínio deletado com sucesso`);
      return response.data.result;
    } catch (error) {
      logger.error(`Erro ao deletar domínio: ${error.message}`);
      throw error;
    }
  }
}

module.exports = new CloudflareService();
