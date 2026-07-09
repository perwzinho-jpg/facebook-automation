# 🎨 Logger - Guia de Uso

## Métodos Disponíveis

### Seções e Separadores

```javascript
// Grande seção com separador
logger.section('🚀 FACEBOOK AUTOMATION - INICIANDO');

// Divisor simples
logger.divider();

// Divisor customizado
logger.divider('═');
```

**Resultado:**
```
═══════════════════════════════════════════════════════════════════
  🚀 FACEBOOK AUTOMATION - INICIANDO
═══════════════════════════════════════════════════════════════════
```

---

### Passos Numerados

```javascript
logger.step(1, 'Abrindo navegador...');
logger.step(2, 'Fazendo login...');
logger.step(3, 'Preenchendo formulário...');
```

**Resultado:**
```
[1] Abrindo navegador...
[2] Fazendo login...
[3] Preenchendo formulário...
```

---

### Mensagens com Status

```javascript
logger.success('Login realizado com sucesso!');
logger.error_msg('Erro ao fazer login');
logger.warning('Tentativa 3 de 5');
logger.info_msg('Aguardando 5 segundos...');
logger.status('⏳', 'Processando...');
```

**Resultado:**
```
✅ Login realizado com sucesso!
❌ Erro ao fazer login
⚠️  Tentativa 3 de 5
ℹ️  Aguardando 5 segundos...
⏳ Processando...
```

---

### Logger Padrão (colors automáticas)

```javascript
logger.info('Mensagem informativa');
logger.warn('Mensagem de aviso');
logger.error('Mensagem de erro');
```

---

## Exemplos de Uso Completo

### Exemplo 1: Autenticação

```javascript
logger.section('📱 AUTENTICAÇÃO');

logger.step(1, 'Abrindo página de login...');
// ... código ...
logger.success('Página de login carregada');

logger.step(2, 'Preenchendo credenciais...');
// ... código ...
logger.success('Email preenchido');
logger.success('Senha preenchida');

logger.step(3, 'Enviando login...');
// ... código ...
logger.success('Login enviado');

logger.info_msg('Aguardando redirecionamento...');
await esperar(3000);
logger.success('Redirecionado com sucesso!');
```

---

### Exemplo 2: Processo com Retry

```javascript
logger.section('🔍 VERIFICAÇÃO DE DOMÍNIO');

for (let tentativa = 1; tentativa <= 3; tentativa++) {
  logger.step(tentativa, `Tentativa ${tentativa}/3`);
  
  try {
    // ... código ...
    logger.success(`Domínio verificado na tentativa ${tentativa}`);
    break;
  } catch (err) {
    if (tentativa < 3) {
      logger.warning(`Falha na tentativa ${tentativa}, aguardando antes de retry...`);
      await esperar(5000);
    } else {
      logger.error_msg(`Falha após 3 tentativas`);
    }
  }
}

logger.divider();
```

---

### Exemplo 3: Fluxo Completo

```javascript
logger.section('🎯 CRIAR CONTA BUSINESS MANAGER');

logger.step(1, 'Buscando CNPJ válido...');
const cnpj = await buscarCNPJ();
logger.success(`CNPJ encontrado: ${cnpj}`);

logger.divider();

logger.step(2, 'Preenchendo formulário...');
logger.info(`  Razão Social: ${cnpj.razaoSocial}`);
logger.info(`  Email: ${cnpj.email}`);
logger.info(`  Telefone: ${cnpj.telefone}`);
logger.success('Formulário preenchido');

logger.divider();

logger.step(3, 'Capturando meta tag...');
const metaTag = await capturarMetaTag();
logger.success(`Meta tag: ${metaTag}`);

logger.divider();

logger.step(4, 'Enviando para Render...');
await commit();
logger.success('Enviado com sucesso!');

logger.divider('═');
logger.info_msg('Processo concluído!');
```

---

## 🎨 Cores Disponíveis

Se precisar usar cores diretamente:

```javascript
const colors = require('./src/utils/logger').colors;

console.log(`${colors.green}Texto em verde${colors.reset}`);
console.log(`${colors.red}Texto em vermelho${colors.reset}`);
console.log(`${colors.blue}Texto em azul${colors.reset}`);
console.log(`${colors.yellow}Texto em amarelo${colors.reset}`);
console.log(`${colors.cyan}Texto em ciano${colors.reset}`);
console.log(`${colors.magenta}Texto em magenta${colors.reset}`);
```

---

## 📝 Arquivos de Log

Os logs são salvos em:
- `logs/error.log` - Apenas erros
- `logs/combined.log` - Todos os logs

---

## 💡 Dicas

1. Use `logger.section()` para marcar grandes etapas
2. Use `logger.step()` para ações dentro de uma seção
3. Use `logger.success()` para indicar sucesso
4. Use `logger.error_msg()` para erros críticos
5. Use `logger.warning()` para avisos
6. Use `logger.divider()` para separar logicamente
7. Use `logger.info_msg()` para informações importantes

---

**Resultado: Logs profissionais, elegantes e fáceis de acompanhar!** ✨
