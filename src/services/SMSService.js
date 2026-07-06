const axios = require('axios');
const logger = require('../utils/logger');

class SMSService {
  constructor() {
    this.apiKey = process.env.SMS24H_API_KEY;
    this.baseURL = process.env.SMS24H_API_URL || 'https://api.sms24h.org/';
    this.client = axios.create({
      baseURL: this.baseURL,
      timeout: 30000
    });
  }

  async buyNumber(country = 'BR', service = 'facebook') {
    try {
      logger.info(`Comprando número para ${service} em ${country}`);

      const response = await this.client.post('/get_number', {
        api_key: this.apiKey,
        service: service,
        country: country
      });

      if (response.data.status === 'success' || response.data.id) {
        const number = response.data.number || response.data.phone;
        const requestId = response.data.id || response.data.request_id;

        logger.info(`Número comprado com sucesso: ${number} (ID: ${requestId})`);
        return {
          number,
          requestId,
          service,
          country,
          timestamp: new Date()
        };
      } else {
        throw new Error(`Erro ao comprar número: ${response.data.message}`);
      }
    } catch (error) {
      logger.error(`Erro ao comprar número SMS: ${error.message}`);
      throw error;
    }
  }

  async getCode(requestId) {
    try {
      logger.info(`Aguardando SMS para ID: ${requestId}`);

      let attempts = 0;
      const maxAttempts = 60;

      while (attempts < maxAttempts) {
        const response = await this.client.post('/get_sms', {
          api_key: this.apiKey,
          request_id: requestId
        });

        if (response.data.status === 'success' || response.data.sms) {
          const code = response.data.sms || response.data.message;
          logger.info(`Código recebido: ${code}`);
          return code;
        } else if (response.data.status === 'waiting') {
          logger.debug(`Aguardando SMS... (tentativa ${attempts + 1}/${maxAttempts})`);
          await new Promise(r => setTimeout(r, 1000));
          attempts++;
        } else {
          throw new Error(`Erro ao obter SMS: ${response.data.message}`);
        }
      }

      throw new Error('Timeout ao aguardar SMS');
    } catch (error) {
      logger.error(`Erro ao obter código SMS: ${error.message}`);
      throw error;
    }
  }

  async releaseNumber(requestId) {
    try {
      logger.info(`Liberando número: ${requestId}`);

      const response = await this.client.post('/set_status', {
        api_key: this.apiKey,
        request_id: requestId,
        status: 8 // Status para cancelar
      });

      logger.info(`Número liberado com sucesso`);
      return response.data;
    } catch (error) {
      logger.error(`Erro ao liberar número: ${error.message}`);
      throw error;
    }
  }

  async confirmCode(requestId) {
    try {
      logger.info(`Confirmando código para ID: ${requestId}`);

      const response = await this.client.post('/set_status', {
        api_key: this.apiKey,
        request_id: requestId,
        status: 6 // Status para confirmar
      });

      logger.info(`Código confirmado com sucesso`);
      return response.data;
    } catch (error) {
      logger.error(`Erro ao confirmar código: ${error.message}`);
      throw error;
    }
  }
}

module.exports = new SMSService();
