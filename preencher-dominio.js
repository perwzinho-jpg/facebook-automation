/**
 * ⚡ PREENCHER DOMÍNIO - Apenas preenche o campo já aberto
 * Use enquanto o navegador com o modal está aberto
 */

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(process.cwd(), '.env.vercel') });
const logger = require('./src/utils/logger');

async function preencherDominio() {
  console.log('\n' + '='.repeat(60));
  logger.info('⚡ PREENCHENDO DOMÍNIO');
  logger.info('='.repeat(60) + '\n');

  try {
    // Conectar ao navegador já aberto
    logger.info('🔗 Conectando ao navegador...\n');
    const browser = await puppeteer.connect({
      browserWSEndpoint: 'ws://127.0.0.1:9222'
    });

    const pages = await browser.pages();
    const page = pages[pages.length - 1];

    logger.info('✅ Conectado!\n');

    // Gerar dados fictícios se não tiver CNPJ já carregado
    const nomeSocio = 'João Silva';
    const nomeEmpresa = nomeSocio.split(' ')[0];
    const numerosAleatorios = Math.floor(Math.random() * 999999);
    const projectName = `${nomeEmpresa.toLowerCase()}${numerosAleatorios}`;
    const siteUrl = `https://${projectName}.vercel.app`;

    logger.info('📌 Etapa 1: Criando site na Vercel...\n');

    // Ler template
    let templatePath = path.join(process.cwd(), 'dashboard-template.html');
    let htmlContent;

    try {
      htmlContent = fs.readFileSync(templatePath, 'utf-8');
      logger.info('   ✅ Template carregado\n');
    } catch (error) {
      logger.warn('   ⚠️ Template não encontrado, usando HTML padrão\n');
      htmlContent = `<!DOCTYPE html>
<html>
<head>
  <title>Dashboard</title>
  <style>
    body { font-family: Arial; text-align: center; padding: 50px; background: #667eea; color: white; }
    h1 { margin: 0; }
  </style>
</head>
<body>
  <h1>✅ Dashboard da Empresa</h1>
  <p>Site verificado e ativo</p>
</body>
</html>`;
    }

    // Fazer deploy na Vercel
    logger.info('📌 Etapa 2: Fazendo deploy...\n');

    const vercelToken = process.env.VERCEL_API_TOKEN;
    if (vercelToken) {
      try {
        const axios = require('axios');
        const deployRes = await axios.post(
          'https://api.vercel.com/v13/deployments?skipAutoDetectionConfirmation=1',
          {
            name: projectName,
            files: [
              {
                file: 'index.html',
                data: htmlContent
              }
            ],
            projectSettings: {
              framework: null,
              buildCommand: null,
              outputDirectory: null,
              installCommand: null
            }
          },
          {
            headers: {
              'Authorization': `Bearer ${vercelToken}`,
              'Content-Type': 'application/json'
            }
          }
        );

        logger.info(`   ✅ Deploy enviado!\n`);
        logger.info(`   📋 ID: ${deployRes.data.id}\n`);
      } catch (deployError) {
        logger.warn(`   ⚠️ Erro no deploy: ${deployError.message}\n`);
      }
    }

    logger.info('📌 Etapa 3: Preenchendo campo de domínio...\n');
    logger.info(`   🌐 URL: ${siteUrl}\n`);

    // Preencher o campo
    let preenchido = false;

    // Tentativa 1: Via XPath
    try {
      logger.info('   📍 Tentativa 1: Procurar via XPath...');
      const inputs = await page.$x("//input[contains(@placeholder, 'exemplo.com')]");

      if (inputs.length > 0) {
        logger.info(' Encontrado!\n');
        await inputs[0].focus();
        await inputs[0].type(siteUrl, { delay: 50 });
        logger.info('   ✅ URL digitada com sucesso!\n');
        preenchido = true;
      }
    } catch (e) {
      logger.warn(`   ⚠️ Erro: ${e.message}\n`);
    }

    // Tentativa 2: Buscar por input visível
    if (!preenchido) {
      try {
        logger.info('   📍 Tentativa 2: Procurar input visível...');
        const found = await page.evaluate(() => {
          const inputs = document.querySelectorAll('input[type="text"]');
          for (const inp of inputs) {
            if (inp.offsetParent !== null && inp.placeholder?.includes('exemplo')) {
              inp.focus();
              inp.click();
              inp.value = '';
              return true;
            }
          }
          return false;
        });

        if (found) {
          logger.info(' Encontrado!\n');
          for (let i = 0; i < siteUrl.length; i++) {
            await page.keyboard.type(siteUrl[i]);
            await new Promise(r => setTimeout(r, 50));
          }
          logger.info('   ✅ URL digitada com sucesso!\n');
          preenchido = true;
        }
      } catch (e) {
        logger.warn(`   ⚠️ Erro: ${e.message}\n`);
      }
    }

    if (!preenchido) {
      logger.warn('   ⚠️ Não conseguiu preencher o campo\n');
      logger.info('   💡 Preencha manualmente com: ' + siteUrl + '\n');
    }

    console.log('='.repeat(60));
    logger.info('✅ CONCLUÍDO!');
    console.log('='.repeat(60) + '\n');

    await browser.disconnect();

  } catch (error) {
    console.error(`\n❌ ERRO:`);
    console.error(`${error.message}\n`);
    console.log('💡 Certifique-se que:');
    console.log('   1. O navegador com o modal está aberto');
    console.log('   2. O campo de domínio está visível\n');
  }
}

preencherDominio();
