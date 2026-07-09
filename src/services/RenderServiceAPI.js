const axios = require('axios');
const logger = require('../utils/logger');

class RenderServiceAPI {
  constructor(apiKey) {
    this.apiKey = apiKey || process.env.RENDER_API_KEY;
    this.baseURL = 'https://api.render.com/v1';
    this.ownerId = 'tev3ul7y6cot6gm7vqd0'; // Owner ID da conta Render (altere se necessário)
    this.client = axios.create({
      baseURL: this.baseURL,
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      }
    });
    this.repoUrl = 'https://github.com/perwzinho-jpg/facebook-automation.git';
  }

  /**
   * Obter Owner ID da conta Render
   */
  async getOwnerId() {
    // Usar o Owner ID configurado na classe
    if (this.ownerId) {
      return this.ownerId;
    }

    // Fallback para environment variable
    if (process.env.RENDER_OWNER_ID) {
      return process.env.RENDER_OWNER_ID;
    }

    logger.error(`\n❌ Owner ID não configurado!\n`);
    logger.error(`📋 SOLUÇÃO:`);
    logger.error(`   1. Abra: src/services/RenderServiceAPI.js`);
    logger.error(`   2. Procure por: this.ownerId = 'tev3ul7y6cot6gm7vqd0'`);
    logger.error(`   3. Substitua pelo seu Owner ID`);
    logger.error(`\n🔍 COMO ENCONTRAR SEU OWNER ID:`);
    logger.error(`   1. Acesse: https://dashboard.render.com/teams`);
    logger.error(`   2. Clique na sua team`);
    logger.error(`   3. A URL terá: /teams/tXXXXXXXXX`);
    logger.error(`   4. Copie o ID (tXXXXXXXXX) e substitua no código\n`);

    throw new Error('Owner ID não configurado');
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
        runtime: 'node',
        buildCommand: 'npm install',
        startCommand: 'node server.js',
        environmentVariables: [
          {
            key: 'CNPJ_ID',
            value: cnpjNum
          },
          {
            key: 'NODE_ENV',
            value: 'production'
          }
        ],
        repo: this.repoUrl,
        branch: 'main',
        region: 'oregon'
      };

      // Adicionar Owner ID se estiver configurado
      try {
        const ownerId = await this.getOwnerId();
        if (ownerId) {
          payload.ownerId = ownerId;
        }
      } catch (e) {
        logger.warn(`   ⚠️ Owner ID não configurado, continuando sem ele...`);
        // Continuar sem Owner ID
      }

      logger.info(`📝 Enviando para Render API...\n`);
      const response = await this.client.post('/services', payload);

      const service = response.data;
      const serviceUrl = `https://${service.slug}.onrender.com`;

      logger.info(`✅ Projeto criado: ${serviceName}`);
      logger.info(`🌐 URL: ${serviceUrl}`);
      logger.info(`📊 Status: ${service.status}\n`);

      return {
        serviceId: service.id,
        serviceName: service.name,
        slug: service.slug,
        url: serviceUrl,
        status: service.status
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
