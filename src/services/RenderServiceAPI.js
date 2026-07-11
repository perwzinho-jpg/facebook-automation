const axios = require('axios');
const logger = require('../utils/logger');

class RenderServiceAPI {
  constructor(apiKey) {
    this.apiKey = apiKey || process.env.RENDER_API_KEY || 'rnd_syvLjCCqB3r7mRvWcuY87eUSEaEo';
    this.baseURL = 'https://api.render.com/v1';
    this.workspaceId = 'tea-d993sa3eo5us7381q41g'; // Workspace ID da conta Render
    this.ownerId = process.env.RENDER_OWNER_ID || null; // Owner ID é opcional
    this.client = axios.create({
      baseURL: this.baseURL,
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      }
    });
    this.repoUrl = 'https://github.com/brunostreamerpro-code/bruninho.git';
  }

  /**
   * Obter Owner ID se configurado
   */
  async getOwnerId() {
    // Se tiver Owner ID configurado, retornar
    if (this.ownerId) {
      return this.ownerId;
    }
    // Caso contrário, retornar null (será opcional no payload)
    return null;
  }

  /**
   * Criar novo serviço web no Render para cada CNPJ
   */
  async createWebService(cnpjData) {
    try {
      const cnpjNum = cnpjData.cnpj.replace(/\D/g, '').substring(0, 8);
      const serviceName = `cnpj-${cnpjNum}`;

      logger.info(`\n🚀 Criando projeto Render para ${serviceName}...\n`);

      const payload = {
        name: serviceName,
        type: 'web_service',
        ownerId: this.workspaceId,
        repo: this.repoUrl,
        branch: 'main',
        region: 'oregon',
        serviceDetails: {
          runtime: 'node',
          envSpecificDetails: {
            buildCommand: 'npm install',
            startCommand: 'node server.js'
          }
        }
      };

      logger.info(`📝 Enviando para Render API...\n`);
      const response = await this.client.post('/services', payload);

      const service = response.data.service;
      const serviceUrl = service.serviceDetails.url;

      logger.info(`✅ Projeto criado: ${service.name}`);
      logger.info(`🌐 URL: ${serviceUrl}`);
      logger.info(`📊 Status: ${service.suspended}\n`);

      return {
        serviceId: service.id,
        serviceName: service.name,
        slug: service.slug,
        url: serviceUrl,
        status: service.suspended,
        dashboardUrl: service.dashboardUrl
      };
    } catch (err) {
      logger.error(`\n❌ Erro ao criar projeto Render:`);
      logger.error(`   ${err.response?.data?.message || err.message}\n`);

      if (err.response?.status === 401) {
        logger.error(`   💡 Verifique se a Render API Key está correta\n`);
      }

      return null;
    }
  }

  /**
   * Obter informações de um serviço
   */
  async getService(serviceId) {
    try {
      const response = await this.client.get(`/services/${serviceId}`);
      return response.data;
    } catch (err) {
      logger.error(`❌ Erro ao obter serviço: ${err.message}`);
      throw err;
    }
  }

  /**
   * Deletar um serviço
   */
  async deleteService(serviceId) {
    try {
      await this.client.delete(`/services/${serviceId}`);
      logger.info(`✅ Serviço deletado: ${serviceId}`);
      return true;
    } catch (err) {
      logger.error(`❌ Erro ao deletar serviço: ${err.message}`);
      throw err;
    }
  }

  /**
   * Atualizar variáveis de ambiente de um serviço
   */
  async updateEnvVars(serviceId, envVars) {
    try {
      const payload = {
        envVars: envVars
      };
      const response = await this.client.patch(`/services/${serviceId}`, payload);
      logger.info(`✅ Variáveis de ambiente atualizadas`);
      return response.data;
    } catch (err) {
      logger.error(`❌ Erro ao atualizar env vars: ${err.message}`);
      throw err;
    }
  }

  /**
   * Iniciar deploy de um serviço
   */
  async triggerDeploy(serviceId) {
    try {
      const response = await this.client.post(`/services/${serviceId}/deploys`, {});
      logger.info(`✅ Deploy iniciado`);
      return response.data;
    } catch (err) {
      logger.error(`❌ Erro ao iniciar deploy: ${err.message}`);
      throw err;
    }
  }
}

module.exports = RenderServiceAPI;
