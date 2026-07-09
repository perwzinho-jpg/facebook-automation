const axios = require('axios');
const logger = require('../utils/logger');

class RenderServiceAPI {
  constructor(apiKey) {
    this.apiKey = apiKey || process.env.RENDER_API_KEY;
    this.baseURL = 'https://api.render.com/v1';
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
    try {
      // Se estiver em environment variable, usar isso (PREFERIDO)
      if (process.env.RENDER_OWNER_ID) {
        logger.info(`✅ Owner ID obtido de RENDER_OWNER_ID: ${process.env.RENDER_OWNER_ID}`);
        return process.env.RENDER_OWNER_ID;
      }

      // Tentar obter do endpoint /account
      try {
        const accountResponse = await this.client.get('/account');
        if (accountResponse.data && accountResponse.data.id) {
          logger.info(`✅ Owner ID obtido da API: ${accountResponse.data.id}`);
          return accountResponse.data.id;
        }
      } catch (e) {
        logger.warn(`   ⚠️ Endpoint /account não disponível`);
      }

      // Tentar obter da lista de teams
      try {
        const teamsResponse = await this.client.get('/teams');
        if (teamsResponse.data && teamsResponse.data.length > 0) {
          logger.info(`✅ Owner ID obtido de Teams: ${teamsResponse.data[0].id}`);
          return teamsResponse.data[0].id;
        }
      } catch (e) {
        logger.warn(`   ⚠️ Endpoint /teams não disponível`);
      }

      // Se nenhum método funcionou, pedir configuração
      throw new Error('RENDER_OWNER_ID não configurado e não conseguiu obter da API');
    } catch (err) {
      logger.error(`\n❌ Erro ao obter Owner ID: ${err.message}\n`);
      logger.error(`📋 SOLUÇÃO:`);
      logger.error(`   1. Acesse: https://dashboard.render.com/teams`);
      logger.error(`   2. Clique na sua team`);
      logger.error(`   3. A URL terá: /teams/tXXXXXXXXX`);
      logger.error(`   4. Copie o ID (tXXXXXXXXX)`);
      logger.error(`   5. Configure no .env: RENDER_OWNER_ID=tXXXXXXXXX\n`);
      throw err;
    }
  }

  /**
   * Criar novo serviço web no Render para cada CNPJ
   */
  async createWebService(cnpjData) {
    try {
      const cnpjNum = cnpjData.cnpj.replace(/\D/g, '').substring(0, 8);
      const serviceName = `cnpj-${cnpjNum}`;

      logger.info(`\n🚀 Criando projeto Render para ${serviceName}...\n`);

      // Obter Owner ID
      const ownerId = await this.getOwnerId();

      const payload = {
        name: serviceName,
        type: 'web_service',
        ownerId: ownerId,
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
