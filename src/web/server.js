require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const logger = require('../utils/logger');
const Account = require('../models/Account');
const AutomationController = require('../automation/AutomationController');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Inicializar banco de dados
Account.initialize();

// ========== ROTAS API ==========

// Obter todas as contas
app.get('/api/accounts', async (req, res) => {
  try {
    const status = req.query.status;
    const accounts = await Account.findAll(status);
    res.json(accounts);
  } catch (error) {
    logger.error(`Erro ao obter contas: ${error.message}`);
    res.status(500).json({ error: error.message });
  }
});

// Obter conta por ID
app.get('/api/accounts/:id', async (req, res) => {
  try {
    const account = await Account.findById(req.params.id);
    if (!account) {
      return res.status(404).json({ error: 'Conta não encontrada' });
    }
    res.json(account);
  } catch (error) {
    logger.error(`Erro ao obter conta: ${error.message}`);
    res.status(500).json({ error: error.message });
  }
});

// Obter logs de uma conta
app.get('/api/accounts/:id/logs', async (req, res) => {
  try {
    const logs = await Account.getAccountLogs(req.params.id);
    res.json(logs);
  } catch (error) {
    logger.error(`Erro ao obter logs: ${error.message}`);
    res.status(500).json({ error: error.message });
  }
});

// Criar nova automação
app.post('/api/automations/start', async (req, res) => {
  try {
    const accountData = req.body;

    // Validar dados obrigatórios
    if (!accountData.email || !accountData.password || !accountData.cnpjData) {
      return res.status(400).json({ error: 'Email, senha e dados de CNPJ são obrigatórios' });
    }

    res.json({ message: 'Automação iniciada', status: 'running' });

    // Executar automação de forma assíncrona
    const controller = new AutomationController();
    controller.runFullAutomation(accountData)
      .then(result => {
        logger.info(`Automação concluída: ${result.accountId}`);
      })
      .catch(error => {
        logger.error(`Automação falhou: ${error.message}`);
      });

  } catch (error) {
    logger.error(`Erro ao iniciar automação: ${error.message}`);
    res.status(500).json({ error: error.message });
  }
});

// Parar automação
app.post('/api/automations/:id/stop', async (req, res) => {
  try {
    const accountId = req.params.id;
    await Account.update(accountId, { status: 'stopped' });
    res.json({ message: 'Automação parada' });
  } catch (error) {
    logger.error(`Erro ao parar automação: ${error.message}`);
    res.status(500).json({ error: error.message });
  }
});

// Atualizar conta
app.put('/api/accounts/:id', async (req, res) => {
  try {
    const accountId = req.params.id;
    const data = req.body;

    await Account.update(accountId, data);
    const account = await Account.findById(accountId);

    res.json(account);
  } catch (error) {
    logger.error(`Erro ao atualizar conta: ${error.message}`);
    res.status(500).json({ error: error.message });
  }
});

// Importar lista de contas (do arquivo txt)
app.post('/api/accounts/import', async (req, res) => {
  try {
    const { accounts } = req.body;

    if (!Array.isArray(accounts)) {
      return res.status(400).json({ error: 'Formato inválido' });
    }

    const results = [];
    for (const accountData of accounts) {
      try {
        const id = await Account.create(accountData);
        results.push({ id, email: accountData.email, status: 'created' });
      } catch (error) {
        results.push({ email: accountData.email, status: 'error', error: error.message });
      }
    }

    res.json({ imported: results });
  } catch (error) {
    logger.error(`Erro ao importar contas: ${error.message}`);
    res.status(500).json({ error: error.message });
  }
});

// Obter estatísticas
app.get('/api/stats', async (req, res) => {
  try {
    const total = await Account.findAll();
    const verified = total.filter(a => a.verified).length;
    const failed = total.filter(a => a.status === 'failed').length;
    const pending = total.filter(a => a.status === 'pending').length;
    const completed = total.filter(a => a.status === 'completed').length;

    res.json({
      total: total.length,
      verified,
      failed,
      pending,
      completed,
      percentage: total.length > 0 ? ((completed / total.length) * 100).toFixed(2) : 0
    });
  } catch (error) {
    logger.error(`Erro ao obter estatísticas: ${error.message}`);
    res.status(500).json({ error: error.message });
  }
});

// Página HTML principal
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Iniciar servidor
app.listen(PORT, () => {
  logger.info(`========== SERVIDOR INICIADO ==========`);
  logger.info(`Servidor rodando em http://localhost:${PORT}`);
  logger.info(`Dashboard: http://localhost:${PORT}/dashboard`);
});

// Graceful shutdown
process.on('SIGINT', async () => {
  logger.info('Encerrando servidor...');
  await Account.close();
  process.exit(0);
});
