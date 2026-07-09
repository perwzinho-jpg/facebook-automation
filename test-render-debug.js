const axios = require('axios');

async function testarRenderDebug() {
  const apiKey = 'rnd_mtiVGFSaIEwm0zZzPOYWmsz0ZB9T';
  const baseURL = 'https://api.render.com/v1';
  const workspaceId = 'tea-d95i4qmq1p3s73d2laog';

  const payload = {
    name: 'cnpj-test789',
    type: 'web_service',
    ownerId: workspaceId,
    repo: 'https://github.com/perwzinho-jpg/facebook-automation.git',
    branch: 'main',
    region: 'oregon',
    serviceDetails: {
      runtime: 'node',
      envSpecificDetails: {
        buildCommand: 'npm install',
        startCommand: 'node server.js'
      }
    }
  };

  console.log('\n📝 Payload que será enviado:');
  console.log(JSON.stringify(payload, null, 2));
  console.log('\n');

  try {
    const client = axios.create({
      baseURL: baseURL,
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    });

    console.log('🔄 Enviando para Render API...\n');
    const response = await client.post('/services', payload);

    console.log('✅ Sucesso!');
    console.log('Resposta completa:', JSON.stringify(response.data, null, 2));
    console.log('\nCampos disponíveis:');
    console.log('- id:', response.data.id);
    console.log('- name:', response.data.name);
    console.log('- slug:', response.data.slug);
    console.log('- status:', response.data.status);
    console.log('- url:', response.data.url);
  } catch (err) {
    console.log('❌ Erro:');
    console.log('Status:', err.response?.status);
    console.log('Mensagem:', err.response?.data?.message || err.message);
    console.log('Resposta completa:', JSON.stringify(err.response?.data, null, 2));
  }
}

testarRenderDebug();
