const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');

class DashboardService {
  constructor() {
    this.cnpjDataPath = path.join(process.cwd(), 'cnpj-data.json');
  }

  /**
   * Carrega dados de CNPJs do arquivo
   */
  loadCNPJData() {
    try {
      if (fs.existsSync(this.cnpjDataPath)) {
        const data = fs.readFileSync(this.cnpjDataPath, 'utf8');
        return JSON.parse(data);
      }
    } catch (err) {
      logger.warn(`⚠️ Erro ao carregar cnpj-data.json: ${err.message}`);
    }
    return { cnpjs: {} };
  }

  /**
   * Salva dados de CNPJs no arquivo
   */
  saveCNPJData(data) {
    try {
      fs.writeFileSync(this.cnpjDataPath, JSON.stringify(data, null, 2), 'utf8');
      return true;
    } catch (err) {
      logger.error(`❌ Erro ao salvar cnpj-data.json: ${err.message}`);
      return false;
    }
  }

  /**
   * Adiciona novo CNPJ ao dashboard
   * @param {Object} cnpjData - Dados do CNPJ
   * @param {string} cnpjData.cnpj - CNPJ formatado (XX.XXX.XXX/XXXX-XX)
   * @param {string} cnpjData.razaoSocial - Razão Social
   * @param {string} cnpjData.nomeFantasia - Nome Fantasia
   * @param {string} cnpjData.email - Email
   * @param {string} cnpjData.telefone - Telefone
   * @param {string} cnpjData.dataAbertura - Data de Abertura
   * @param {string} cnpjData.situacao - Situação (Ativa/Inativa)
   * @param {string} cnpjData.porte - Porte (MEI/Pequena/Média/Grande)
   */
  addCNPJ(cnpjData) {
    try {
      const data = this.loadCNPJData();

      // Chave: apenas números
      const cnpjKey = cnpjData.cnpj.replace(/\D/g, '');

      // Dados para armazenar
      const dashboardData = {
        CNPJ: cnpjData.cnpj,
        RAZAO_SOCIAL: cnpjData.razaoSocial || '',
        NOME_FANTASIA: cnpjData.nomeFantasia || cnpjData.razaoSocial || '',
        EMAIL: cnpjData.email || 'contato@empresa.com.br',
        TELEFONE: cnpjData.telefone || '(XX) XXXX-XXXX',
        DATA_ABERTURA: cnpjData.dataAbertura || new Date().toLocaleDateString('pt-BR'),
        SITUACAO: cnpjData.situacao || 'Ativa',
        PORTE: cnpjData.porte || 'MEI',
        DATA_GERACAO: new Date().toLocaleDateString('pt-BR')
      };

      // Adicionar ao JSON
      data.cnpjs[cnpjKey] = dashboardData;

      // Salvar
      if (this.saveCNPJData(data)) {
        logger.info(`\n📊 ✅ CNPJ adicionado ao dashboard`);
        logger.info(`   🌐 Acesse: http://localhost:3000/?cnpj=${cnpjKey}`);
        logger.info(`   🌐 Ou: https://facebook-automation-qb1g.onrender.com/?cnpj=${cnpjKey}\n`);
        return true;
      }
      return false;
    } catch (err) {
      logger.error(`❌ Erro ao adicionar CNPJ: ${err.message}`);
      return false;
    }
  }

  /**
   * Obtém URL do dashboard para um CNPJ
   */
  getDashboardURL(cnpj) {
    const cnpjKey = cnpj.replace(/\D/g, '');
    const renderUrl = process.env.RENDER_URL || 'facebook-automation-qb1g.onrender.com';
    return `https://${renderUrl}/?cnpj=${cnpjKey}`;
  }
}

module.exports = new DashboardService();
