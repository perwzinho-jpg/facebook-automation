/**
 * 🧪 Teste da API Render
 */

const axios = require('axios');
require('dotenv').config();

const RENDER_API_KEY = process.env.RENDER_API_KEY;
const SERVICE_ID = process.env.RENDER_SERVICE_ID;

async function testRenderAPI() {
  console.log('🧪 Testando API Render...\n');

  if (!RENDER_API_KEY) {
    console.error('❌ RENDER_API_KEY não está definido');
    return;
  }

  if (!SERVICE_ID) {
    console.error('❌ RENDER_SERVICE_ID não está definido');
    return;
  }

  const client = axios.create({
    baseURL: 'https://api.render.com/v1',
    headers: {
      'Authorization': `Bearer ${RENDER_API_KEY}`,
      'Accept': 'application/json'
    }
  });

  try {
    // 1. Listar serviços
    console.log('1️⃣ Listando serviços...');
    const servicesRes = await client.get('/services');
    console.log(`✅ Encontrados ${servicesRes.data.length} serviço(s)\n`);

    if (servicesRes.data.length > 0) {
      servicesRes.data.forEach((svc, idx) => {
        console.log(`   ${idx + 1}. ${svc.id}`);
        console.log(`      Name: ${svc.name}`);
        console.log(`      Status: ${svc.status}`);
        if (svc.domains) {
          console.log(`      Domains: ${svc.domains.join(', ')}`);
        }
      });
    }

    console.log(`\n2️⃣ Buscando serviço: ${SERVICE_ID}`);
    const serviceRes = await client.get(`/services/${SERVICE_ID}`);
    console.log(`✅ Serviço encontrado!`);
    console.log(`   ID: ${serviceRes.data.id}`);
    console.log(`   Name: ${serviceRes.data.name}`);
    console.log(`   Status: ${serviceRes.data.status}`);
    console.log(`   Domains: ${JSON.stringify(serviceRes.data.domains)}`);

    console.log(`\n3️⃣ Acionando deploy...`);
    const deployRes = await client.post(`/services/${SERVICE_ID}/deploys`, {});
    console.log(`✅ Deploy acionado!`);
    console.log(`   ID: ${deployRes.data.id}`);
    console.log(`   Status: ${deployRes.data.status}`);

  } catch (error) {
    console.error(`\n❌ Erro:`);
    console.error(`   Status: ${error.response?.status}`);
    console.error(`   Message: ${error.response?.data?.message || error.message}`);
    console.error(`   Data:`, error.response?.data);
  }
}

testRenderAPI();
