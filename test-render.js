const RenderServiceAPI = require('./src/services/RenderServiceAPI');
const logger = require('./src/utils/logger');

async function testarRender() {
  try {
    logger.info('\n🧪 TESTE DE CRIAÇÃO DO PROJETO RENDER\n');
    logger.info('=' .repeat(60) + '\n');

    const renderAPI = new RenderServiceAPI(process.env.RENDER_API_KEY);

    // Dados de teste
    const testCNPJ = {
      cnpj: '55.666.777/0001-99',
      razaoSocial: 'Empresa Teste Final'
    };

    logger.info(`📊 Dados de teste:`);
    logger.info(`   CNPJ: ${testCNPJ.cnpj}`);
    logger.info(`   Razão Social: ${testCNPJ.razaoSocial}\n`);

    logger.info('🔧 Criando projeto Render...\n');
    const resultado = await renderAPI.createWebService(testCNPJ);

    if (resultado) {
      logger.success('\n✅ SUCESSO! Projeto criado:\n');
      logger.info(`   Service ID: ${resultado.serviceId}`);
      logger.info(`   Service Name: ${resultado.serviceName}`);
      logger.info(`   Slug: ${resultado.slug}`);
      logger.info(`   URL: ${resultado.url}`);
      logger.info(`   Status: ${resultado.status}\n`);

      logger.info('=' .repeat(60));
      logger.success('🎉 TESTE PASSOU!\n');
    } else {
      logger.error('\n❌ TESTE FALHOU - Nenhum resultado retornado\n');
    }

  } catch (error) {
    logger.error('\n❌ ERRO NO TESTE:\n');
    logger.error(`   ${error.message}\n`);
    logger.error('=' .repeat(60) + '\n');
  }
}

testarRender();
