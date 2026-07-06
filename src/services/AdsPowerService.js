const { execSync } = require('child_process');
const logger = require('../utils/logger');

class AdsPowerService {
  constructor() {
    this.apiKey = process.env.ADSPOWER_API_KEY;
    this.enabled = process.env.USE_ADSPOWER === 'true';
    this.started = false;

    if (this.enabled && this.apiKey) {
      logger.info('✅ AdsPower service habilitado');
      this.start();
    }
  }

  isEnabled() {
    return this.enabled && this.started;
  }

  start() {
    try {
      if (this.started) return;

      logger.info('🚀 Iniciando AdsPower...');
      execSync(`npx ads start -k ${this.apiKey}`, {
        stdio: 'inherit',
        detached: true
      });
      this.started = true;
      logger.info('✅ AdsPower iniciado');
    } catch (error) {
      logger.error(`Erro ao iniciar AdsPower: ${error.message}`);
      this.started = false;
    }
  }

  parseJSON(output) {
    const cleanOutput = output.replace(/\x1b\[[0-9;]*m/g, '');

    const lastIdx = cleanOutput.lastIndexOf('}');
    if (lastIdx === -1) {
      throw new Error('Sem JSON na resposta');
    }

    let startIdx = lastIdx;
    let braceCount = 1;

    for (let i = lastIdx - 1; i >= 0; i--) {
      if (cleanOutput[i] === '}') braceCount++;
      if (cleanOutput[i] === '{') braceCount--;
      if (braceCount === 0) {
        startIdx = i;
        break;
      }
    }

    const json = cleanOutput.substring(startIdx, lastIdx + 1);
    return JSON.parse(json);
  }

  async listProfiles() {
    try {
      if (!this.enabled) {
        logger.warn('AdsPower desabilitado');
        return [];
      }

      logger.info('🔍 Listando perfis do AdsPower...');

      const output = execSync('npx ads get-browser-list', {
        encoding: 'utf8',
        stdio: ['pipe', 'pipe', 'pipe']
      });

      const data = this.parseJSON(output);
      const profiles = data.list || [];
      logger.info(`✅ ${profiles.length} perfis encontrados`);
      return profiles;
    } catch (error) {
      logger.error(`Erro ao listar perfis AdsPower: ${error.message}`);
      return [];
    }
  }

  async openProfile(profileId) {
    try {
      logger.info(`🔓 Abrindo perfil AdsPower: ${profileId}`);

      // Tentar 5 vezes com intervalo de 2 segundos
      for (let attempt = 1; attempt <= 5; attempt++) {
        try {
          logger.info(`Tentativa ${attempt}/5...`);

          const params = JSON.stringify({ profile_id: profileId });
          const output = execSync(`npx ads open-browser '${params}'`, {
            encoding: 'utf8',
            stdio: ['pipe', 'pipe', 'pipe'],
            timeout: 15000
          });

          const data = this.parseJSON(output);

          if (data.ws_debugger_url) {
            logger.info(`✅ Perfil aberto com sucesso`);
            logger.info(`📍 WebSocket URL: ${data.ws_debugger_url}`);

            return {
              profileId,
              wsUrl: data.ws_debugger_url,
              connected: true
            };
          } else if (data.code !== 0) {
            logger.warn(`Erro do AdsPower: ${data.msg}`);
            throw new Error(`Code ${data.code}: ${data.msg}`);
          }
        } catch (error) {
          if (attempt < 5) {
            logger.warn(`Tentativa ${attempt} falhou, aguardando 2s...`);
            await new Promise(r => setTimeout(r, 2000));
          } else {
            throw error;
          }
        }
      }

      throw new Error('Falha ao abrir perfil após 5 tentativas');
    } catch (error) {
      logger.error(`Erro ao abrir perfil AdsPower: ${error.message}`);
      throw error;
    }
  }

  async closeProfile(profileId) {
    try {
      logger.info(`🔒 Fechando perfil AdsPower: ${profileId}`);

      const params = JSON.stringify({ profile_id: profileId });
      execSync(`npx ads close-browser '${params}'`, {
        stdio: 'pipe'
      });

      logger.info(`✅ Perfil fechado com sucesso`);
      return true;
    } catch (error) {
      logger.error(`Erro ao fechar perfil AdsPower: ${error.message}`);
      throw error;
    }
  }

  async createProfile(profileData) {
    try {
      logger.info(`➕ Criando novo perfil AdsPower...`);

      const cmd = `npx ads create-browser --name "${profileData.firstName || 'User'}"`;

      const output = execSync(cmd, {
        encoding: 'utf8',
        stdio: ['pipe', 'pipe', 'pipe']
      });

      const data = this.parseJSON(output);
      const newProfileId = data.profile_id;

      logger.info(`✅ Perfil criado com sucesso: ${newProfileId}`);
      return newProfileId;
    } catch (error) {
      logger.error(`Erro ao criar perfil AdsPower: ${error.message}`);
      throw error;
    }
  }

  async connectToPuppeteer(wsUrl) {
    try {
      logger.info(`🔗 Conectando Puppeteer ao AdsPower`);

      const puppeteer = require('puppeteer');

      const browser = await puppeteer.connect({
        browserWSEndpoint: wsUrl,
        defaultViewport: null
      });

      logger.info('✅ Conectado ao AdsPower via Puppeteer!');
      return browser;
    } catch (error) {
      logger.error(`Erro ao conectar Puppeteer: ${error.message}`);
      throw error;
    }
  }

  async testConnection() {
    try {
      if (!this.enabled) {
        logger.warn('⚠️ AdsPower desabilitado no .env');
        return false;
      }

      logger.info('🧪 Testando AdsPower...');

      const profiles = await this.listProfiles();

      if (profiles.length > 0) {
        logger.info('✅ Conexão com AdsPower OK!');
        logger.info(`📊 Perfis disponíveis: ${profiles.length}`);
        return true;
      } else {
        logger.warn('⚠️ Nenhum perfil encontrado');
        return false;
      }
    } catch (error) {
      logger.error(`❌ Erro ao conectar AdsPower: ${error.message}`);
      return false;
    }
  }
}

module.exports = new AdsPowerService();
