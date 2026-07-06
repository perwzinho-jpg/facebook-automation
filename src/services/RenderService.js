/**
 * 🚀 Render Integration Service
 * Faz deploy automático no Render e gerencia o site
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class RenderService {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.baseUrl = 'https://api.render.com/v1';
    this.client = axios.create({
      baseURL: this.baseUrl,
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Accept': 'application/json'
      }
    });
  }

  /**
   * Listar todos os serviços
   */
  async listServices() {
    try {
      const response = await this.client.get('/services');
      return response.data;
    } catch (error) {
      throw new Error(`Erro ao listar serviços: ${error.message}`);
    }
  }

  /**
   * Obter informações de um serviço
   */
  async getService(serviceId) {
    try {
      const response = await this.client.get(`/services/${serviceId}`);
      return response.data;
    } catch (error) {
      throw new Error(`Erro ao obter serviço: ${error.message}`);
    }
  }

  /**
   * Triggerar redeploy de um serviço
   */
  async triggerDeploy(serviceId) {
    try {
      const url = `/services/${serviceId}/deploys`;
      console.log(`📤 Acionando deploy em: ${url}`);
      const response = await this.client.post(url, {});
      return response.data;
    } catch (error) {
      console.error(`Erro detalhado:`, error.response?.data || error.message);
      throw new Error(`Erro ao triggerar deploy: ${error.message}`);
    }
  }

  /**
   * Aguardar até que o deploy esteja pronto
   */
  async waitForDeployment(serviceId, maxWaitTime = 300000) {
    const startTime = Date.now();
    const pollInterval = 5000; // 5 segundos

    return new Promise(async (resolve, reject) => {
      const poll = async () => {
        try {
          const service = await this.getService(serviceId);

          console.log(`⏳ Status: ${service.status} | Última atualização: ${service.updatedAt}`);

          if (service.status === 'live') {
            resolve({
              success: true,
              service: service,
              url: service.domains?.[0] || `${service.name}.onrender.com`
            });
          } else if (service.status === 'update_failed' || service.status === 'build_failed') {
            reject(new Error(`Deploy falhou: ${service.status}`));
          } else if (Date.now() - startTime > maxWaitTime) {
            reject(new Error(`Timeout aguardando deploy (${maxWaitTime}ms)`));
          } else {
            setTimeout(poll, pollInterval);
          }
        } catch (error) {
          reject(error);
        }
      };

      poll();
    });
  }

  /**
   * Fazer deploy completo: commit, push e trigger
   */
  async fullDeploy(projectDir, htmlContent, serviceName) {
    console.log('🚀 Iniciando deploy completo no Render...\n');

    try {
      // 1. Atualizar HTML
      console.log('1️⃣ Atualizando HTML...');
      const indexPath = path.join(projectDir, 'index.html');
      fs.writeFileSync(indexPath, htmlContent);
      console.log('   ✅ HTML atualizado\n');

      // 2. Git commit e push
      console.log('2️⃣ Fazendo commit e push...');
      try {
        execSync('git add index.html', { cwd: projectDir, stdio: 'pipe' });
        execSync(`git commit -m "Update: meta tag e conteúdo - ${new Date().toISOString()}"`,
          { cwd: projectDir, stdio: 'pipe' });
        execSync('git push', { cwd: projectDir, stdio: 'pipe' });
        console.log('   ✅ Push realizado\n');
      } catch (gitError) {
        console.log('   ⚠️ Git não está configurado, continuando...\n');
      }

      // 3. Obter serviço Render
      console.log('3️⃣ Buscando serviço no Render...');
      const services = await this.listServices();

      if (services.length === 0) {
        throw new Error('Nenhum serviço encontrado no Render. Configure um primeiro!');
      }

      const service = services.find(s => s.name.includes(serviceName)) || services[0];
      console.log(`   ✅ Serviço encontrado: ${service.name}\n`);

      // 4. Triggerar deploy
      console.log('4️⃣ Acionando redeploy...');
      const deployId = await this.triggerDeploy(service.id);
      console.log(`   ✅ Deploy acionado (ID: ${deployId.id})\n`);

      // 5. Aguardar deployment
      console.log('5️⃣ Aguardando deployment ficar pronto...');
      const result = await this.waitForDeployment(service.id);
      console.log(`   ✅ Deploy pronto!\n`);

      return {
        success: true,
        url: `https://${result.url}`,
        serviceName: service.name,
        serviceId: service.id
      };

    } catch (error) {
      console.error(`❌ Erro no deploy: ${error.message}`);
      throw error;
    }
  }
}

module.exports = RenderService;
