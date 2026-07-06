const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const fs = require('fs');
const path = require('path');

puppeteer.use(StealthPlugin());

async function debugHTML() {
  const email = 'kxeyqe@mailto.plus';
  const password = 'XXz98FMyidt1XX';

  let browser, page;

  try {
    console.log('🚀 Abrindo browser...');
    browser = await puppeteer.launch({ headless: false });
    page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 720 });
    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    );

    // Login
    console.log('1️⃣ Fazendo login...');
    await page.goto('https://www.facebook.com/login', {
      waitUntil: 'load',
      timeout: 60000,
    });

    await page.waitForSelector('input[name="email"]', { timeout: 10000 });
    await page.type('input[name="email"]', email, { delay: 80 });
    await page.type('input[name="pass"]', password, { delay: 80 });

    await Promise.all([
      page.waitForNavigation({ waitUntil: 'load', timeout: 60000 }).catch(() => {}),
      page.keyboard.press('Enter'),
    ]);

    await new Promise(r => setTimeout(r, 5000));

    // Esperar 2FA
    console.log('2️⃣ Aguardando página de 2FA...');
    await new Promise(r => setTimeout(r, 3000));

    const url = page.url();
    console.log('URL:', url);

    if (url.includes('two_step_verification')) {
      console.log('✅ Na página de 2FA!');

      // Pegar HTML completo
      const html = await page.content();
      const debugFile = path.join(process.cwd(), 'debug-2fa.html');
      fs.writeFileSync(debugFile, html);

      console.log(`\n📄 HTML salvo em: ${debugFile}`);
      console.log('\n🔍 Analisando HTML...\n');

      // Debug: procurar inputs
      const inputs = await page.evaluate(() => {
        const all = document.querySelectorAll('input');
        const result = [];
        all.forEach((inp, idx) => {
          result.push({
            index: idx,
            type: inp.type,
            id: inp.id,
            name: inp.name,
            placeholder: inp.placeholder,
            className: inp.className,
            visible: inp.offsetParent !== null,
            enabled: !inp.disabled,
          });
        });
        return result;
      });

      console.log(`📊 Total de inputs: ${inputs.length}`);
      inputs.forEach(inp => {
        console.log(`\n[${inp.index}] type="${inp.type}" id="${inp.id}" name="${inp.name}"`);
        console.log(`    placeholder="${inp.placeholder}"`);
        console.log(`    visible=${inp.visible} enabled=${inp.enabled}`);
      });

      console.log('\n✅ Verifique o arquivo debug-2fa.html para análise completa');
      console.log('Pressione Ctrl+C para sair');
    }
  } catch (error) {
    console.error('❌ Erro:', error.message);
  }
}

debugHTML();
