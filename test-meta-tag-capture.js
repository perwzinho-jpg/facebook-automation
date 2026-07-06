/**
 * 🧪 TESTE DE CAPTURA META TAG - Conecta ao navegador aberto
 * Testa APENAS a captura da meta tag sem fazer todos os passos
 */

const puppeteer = require('puppeteer');
const logger = require('./src/utils/logger');

async function testarMetaTag() {
  console.log('\n' + '='.repeat(60));
  logger.info('🧪 TESTANDO CAPTURA DE META TAG');
  console.log('='.repeat(60) + '\n');

  try {
    // Conectar ao navegador já aberto
    logger.info('🔗 Conectando ao navegador aberto...\n');
    const browser = await puppeteer.connect({
      browserWSEndpoint: 'ws://127.0.0.1:9222'
    });

    const pages = await browser.pages();
    const page = pages[pages.length - 1];

    logger.info('✅ Conectado!\n');

    // Testar captura da meta tag
    logger.info('📋 Testando captura da meta tag do Facebook...\n');

    const metaTagContent = await page.evaluate(() => {
      let code = null;

      logger.info = console.log; // Para debug

      // Método 1: Procurar direto em todo o HTML pela string "facebook-domain-verification"
      const htmlText = document.documentElement.innerText;
      console.log('[DEBUG] Procurando por facebook-domain-verification no texto...');
      const match = htmlText.match(/facebook-domain-verification["\s]*content=["']([a-z0-9]+)["']/i);
      if (match && match[1]) {
        console.log('[DEBUG] ✅ Encontrado via regex: ' + match[1]);
        code = match[1];
        return code;
      }
      console.log('[DEBUG] Não encontrado via regex');

      // Método 2: Procurar em inputs visíveis
      console.log('[DEBUG] Procurando em inputs...');
      const inputs = document.querySelectorAll('input[type="text"], input[type="hidden"]');
      console.log('[DEBUG] Encontrados ' + inputs.length + ' inputs');
      for (const input of inputs) {
        const val = input.value || '';
        console.log('[DEBUG] Input value length: ' + val.length + ', value: ' + val.substring(0, 30));
        if (val.length >= 25 && val.length <= 35 && /^[a-z0-9]+$/.test(val)) {
          console.log('[DEBUG] ✅ Encontrado em input: ' + val);
          code = val;
          break;
        }
      }

      // Método 3: Procurar em todos os elementos
      if (!code) {
        console.log('[DEBUG] Procurando em todos os elementos...');
        const allElements = document.querySelectorAll('*');
        let elementCount = 0;
        for (const el of allElements) {
          const text = (el.textContent || '').trim();

          // Procurar por strings que parecem hashes (25-35 caracteres, alfanuméricos)
          if (text.length >= 25 && text.length <= 35) {
            const hashMatch = text.match(/^([a-z0-9]{25,35})$/);
            if (hashMatch && hashMatch[1]) {
              console.log('[DEBUG] Potencial meta tag encontrada: ' + hashMatch[1]);
              const potentialCode = hashMatch[1];
              code = potentialCode;
              break;
            }
          }
          elementCount++;
        }
        console.log('[DEBUG] Verificados ' + elementCount + ' elementos');
      }

      return code;
    });

    if (metaTagContent) {
      logger.info(`✅ META TAG CAPTURADA COM SUCESSO!\n`);
      logger.info(`📌 Valor: ${metaTagContent}\n`);
    } else {
      logger.warn(`❌ Meta tag NÃO foi capturada\n`);

      // Tentar mostrar o HTML para debug
      logger.info('📄 Tentando exibir HTML da página para debug...\n');
      const htmlSnippet = await page.evaluate(() => {
        return document.documentElement.innerHTML.substring(0, 500);
      });
      console.log('HTML snippet:\n', htmlSnippet);
    }

    console.log('='.repeat(60));
    logger.info('✅ TESTE CONCLUÍDO');
    console.log('='.repeat(60) + '\n');

    await browser.disconnect();

  } catch (error) {
    console.error(`\n❌ ERRO:\n${error.message}\n`);
    console.log('💡 Certifique-se que:');
    console.log('   1. O navegador com a página está aberto');
    console.log('   2. A página de meta tag está visível\n');
  }
}

testarMetaTag();
