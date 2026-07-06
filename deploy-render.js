/**
 * 🚀 Script para fazer deploy no Render
 *
 * Como usar:
 * 1. Configure RENDER_API_KEY no .env
 * 2. Conecte seu repositório ao Render (GitHub)
 * 3. Execute: node deploy-render.js
 */

const axios = require('axios');
require('dotenv').config();

const RENDER_API_KEY = process.env.RENDER_API_KEY;

async function deployNoRender() {
  if (!RENDER_API_KEY) {
    console.error('❌ RENDER_API_KEY não está definido no .env');
    console.error('📝 Para obter:');
    console.error('   1. Vá para https://render.com/dashboard');
    console.error('   2. Account > API Tokens');
    console.error('   3. Copie o token para .env');
    process.exit(1);
  }

  try {
    console.log('🚀 Iniciando deploy no Render...\n');

    // Listar serviços existentes
    const response = await axios.get('https://api.render.com/v1/services', {
      headers: {
        'Authorization': `Bearer ${RENDER_API_KEY}`,
        'Accept': 'application/json'
      }
    });

    const services = response.data;

    if (services.length === 0) {
      console.log('⚠️ Nenhum serviço encontrado no Render');
      console.log('\n📋 PRÓXIMOS PASSOS:');
      console.log('   1. Vá para https://render.com/dashboard');
      console.log('   2. Clique em "New +" > "Web Service"');
      console.log('   3. Conecte seu repositório GitHub');
      console.log('   4. Configure o serviço');
      console.log('   5. Execute este script novamente\n');
      return;
    }

    console.log(`✅ Encontrados ${services.length} serviço(s):\n`);

    services.forEach((service, index) => {
      const status = service.status === 'live' ? '🟢' : '🔴';
      const url = service.domains?.[0] || service.name + '.onrender.com';

      console.log(`${index + 1}. ${status} ${service.name}`);
      console.log(`   URL: https://${url}`);
      console.log(`   Status: ${service.status}`);
      console.log(`   ID: ${service.id}\n`);
    });

    // Triggerar redeploy do primeiro serviço
    if (services.length > 0) {
      const service = services[0];
      console.log(`🔄 Acionando redeploy do serviço: ${service.name}\n`);

      try {
        const deployResponse = await axios.post(
          `https://api.render.com/v1/services/${service.id}/deploys`,
          {},
          {
            headers: {
              'Authorization': `Bearer ${RENDER_API_KEY}`,
              'Content-Type': 'application/json'
            }
          }
        );

        console.log('✅ Deploy iniciado com sucesso!');
        console.log(`📊 ID do deploy: ${deployResponse.data.id}\n`);
        console.log(`🌐 URL do serviço: https://${service.domains?.[0] || service.name + '.onrender.com'}\n`);
        console.log('⏳ Aguardando deploy ficar pronto (pode levar 2-5 minutos)...\n');
      } catch (error) {
        console.error('❌ Erro ao triggerar deploy:');
        console.error(error.response?.data || error.message);
      }
    }

  } catch (error) {
    if (error.response?.status === 401) {
      console.error('❌ Erro de autenticação - API Key inválida');
    } else if (error.response?.status === 403) {
      console.error('❌ Acesso negado - verifique as permissões da API Key');
    } else {
      console.error('❌ Erro ao conectar ao Render:');
      console.error(error.message);
    }

    console.error('\n💡 Dica: Confira se RENDER_API_KEY está correto em .env');
    process.exit(1);
  }
}

// Executar
deployNoRender().catch(console.error);
