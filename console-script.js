/**
 * 💻 SCRIPT DO CONSOLE - Copie e cole no console do navegador
 * Pressione F12, vá em Console, copie tudo abaixo e cole
 */

// Cole tudo isso no console do navegador:
(async () => {
  console.log('%c⚡ Iniciando preenchimento de domínio', 'color: blue; font-size: 16px; font-weight: bold;');

  // Dados
  const nomeSocio = 'João Silva';
  const nomeEmpresa = nomeSocio.split(' ')[0];
  const numerosAleatorios = Math.floor(Math.random() * 999999);
  const projectName = `${nomeEmpresa.toLowerCase()}${numerosAleatorios}`;
  const siteUrl = `https://${projectName}.vercel.app`;

  console.log('%c📝 Dados gerados:', 'color: green;');
  console.log(`   Nome: ${nomeSocio}`);
  console.log(`   URL: ${siteUrl}`);

  // Procurar e preencher input
  console.log('%c🔍 Procurando campo de domínio...', 'color: orange;');

  let input = null;

  // Método 1: Por placeholder
  input = document.querySelector('input[placeholder*="exemplo.com"]');

  // Método 2: Todos os inputs text
  if (!input) {
    const allInputs = document.querySelectorAll('input[type="text"]');
    for (const inp of allInputs) {
      if (inp.offsetParent !== null) {
        input = inp;
        break;
      }
    }
  }

  if (input) {
    console.log('%c✅ Campo encontrado!', 'color: green;');

    // Focar
    input.focus();
    input.click();

    // Limpar
    input.value = '';
    input.dispatchEvent(new Event('change', { bubbles: true }));
    input.dispatchEvent(new Event('input', { bubbles: true }));

    console.log('%c📝 Digitando URL suavemente...', 'color: blue;');

    // Digitar suave
    for (let i = 0; i < siteUrl.length; i++) {
      input.value += siteUrl[i];
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));

      // Pequena pausa entre caracteres
      await new Promise(r => setTimeout(r, 80));
    }

    console.log('%c✅ URL preenchida com sucesso!', 'color: green; font-size: 14px; font-weight: bold;');
    console.log(`   ${siteUrl}`);

  } else {
    console.error('%c❌ Campo não encontrado!', 'color: red; font-weight: bold;');
    console.log('%c💡 Preencha manualmente com:', 'color: orange;');
    console.log(`   ${siteUrl}`);
  }

  console.log('%c' + '='.repeat(60), 'color: blue;');
  console.log('%c✅ Processo concluído!', 'color: green; font-size: 14px; font-weight: bold;');
  console.log('%c' + '='.repeat(60), 'color: blue;');
})();
