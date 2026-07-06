require('dotenv').config();
const logger = require('./utils/logger');
const Account = require('./models/Account');
const AutomationController = require('./automation/AutomationController');

// Inicializar banco de dados
Account.initialize();

const args = process.argv.slice(2);

async function main() {
  try {
    if (args.length === 0) {
      logger.info('Usage: node src/index.js [command] [args]');
      logger.info('Commands:');
      logger.info('  web                  - Iniciar servidor web');
      logger.info('  run <email> <senha>  - Executar automação para uma conta');
      logger.info('  list                 - Listar todas as contas');
      return;
    }

    const command = args[0];

    switch (command) {
      case 'web':
        logger.info('Iniciando servidor web...');
        require('./web/server');
        break;

      case 'run':
        if (args.length < 3) {
          logger.error('Uso: node src/index.js run <email> <senha>');
          return;
        }

        const email = args[1];
        const password = args[2];

        const accountData = {
          email,
          password,
          businessName: 'Empresa Teste',
          cnpjData: {
            cnpj: '00.000.000/0000-00',
            personName: 'Nome Teste',
            email: 'teste@example.com'
          }
        };

        const controller = new AutomationController();
        const result = await controller.runFullAutomation(accountData);
        logger.info(`Resultado: ${JSON.stringify(result)}`);
        break;

      case 'list':
        const accounts = await Account.findAll();
        logger.info(`Total de contas: ${accounts.length}`);
        console.table(accounts);
        break;

      default:
        logger.error(`Comando desconhecido: ${command}`);
    }
  } catch (error) {
    logger.error(`Erro: ${error.message}`);
    process.exit(1);
  }
}

main().catch(error => {
  logger.error(`Erro fatal: ${error.message}`);
  process.exit(1);
});

// Graceful shutdown
process.on('SIGINT', async () => {
  logger.info('Encerrando...');
  await Account.close();
  process.exit(0);
});
