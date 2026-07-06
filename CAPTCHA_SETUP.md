# 🤖 Configuração do 2Captcha para Resolução de CAPTCHA

## Passo 1: Criar Conta no 2Captcha
1. Acesse: https://2captcha.com/auth/register
2. Crie uma conta (email + senha)
3. Confirme seu email

## Passo 2: Obter API Key
1. Faça login em: https://2captcha.com
2. Vá para: **Settings** → **API** (ou clique diretamente: https://2captcha.com/api/user)
3. Copie sua **API Key** (uma chave longa com números/letras)

## Passo 3: Adicionar Créditos
Para testar/usar o serviço, você precisa de créditos:

### Opção A: Cartão de Crédito (Recomendado)
- Mínimo: ~$0.50 USD
- Vá em: **Settings** → **Payments** → **Add Funds**
- Pague com cartão (Visa, Mastercard, etc)

### Opção B: Criptomoeda (Bitcoin, etc)
- Mais rápido, sem verificação

### Preços 2Captcha:
- **reCAPTCHA v2**: ~$0.27 por 1000
- **reCAPTCHA v3**: ~$0.27 por 1000
- **hCaptcha**: ~$0.27 por 1000

## Passo 4: Configurar no Script

### Opção A: Arquivo .env
```bash
# Em .env ou .env.vercel
CAPTCHA_API_KEY=sua_api_key_aqui
```

### Opção B: Direto no Script
```javascript
// Na linha 24 do script-auto.js
const CAPTCHA_API_KEY = 'sua_api_key_aqui';
```

## Passo 5: Testar

```bash
node script-auto.js
```

O script agora vai:
1. ✅ Detectar reCAPTCHA automaticamente
2. ✅ Enviar para 2Captcha
3. ✅ Aguardar resolução (até 60 segundos)
4. ✅ Injetar token na página
5. ✅ Continuar com o login

## 🐛 Troubleshooting

### "API Key não configurada"
- Adicione a chave em `.env` ou `.env.vercel`

### "Erro ao enviar: ERROR_AUTHENTICATION"
- API Key está errada
- Copie novamente de: https://2captcha.com/api/user

### "Timeout aguardando resolução"
- Fila de 2Captcha congestionada
- Espere alguns segundos e tente novamente

### "Saldo insuficiente"
- Adicione créditos em: https://2captcha.com/settings/payments

## 📊 Monitorar Uso

Acesse: https://2captcha.com/user/account/statistics

Você verá:
- Captchas resolvidos
- Saldo atual
- Taxa de acurácia

## ✅ Pronto!

Agora seu script vai resolver automaticamente qualquer reCAPTCHA que encontrar! 🚀
