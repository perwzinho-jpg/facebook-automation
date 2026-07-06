# 🚀 Setup RENDER para Deploy

## O que é Render?

Render é uma plataforma de hosting moderno que substitui Vercel/Heroku com melhor performance e preços.

## Passo 1: Criar Conta

1. Acesse https://render.com
2. Clique em "Sign Up"
3. Use email/GitHub para registrar
4. Confirme seu email

## Passo 2: Configurar Domínio

### Opção A: Usar Subdomínio Render (Grátis)
- Render oferece subdomínios gratuitos em `.onrender.com`
- Exemplo: `seu-projeto.onrender.com`

### Opção B: Conectar Domínio `.com` Próprio (Pago)
1. Compre um domínio em:
   - Namecheap.com
   - GoDaddy.com
   - Registro.br (se for .br)
   - Freenom.com (grátis - .tk, .ml, etc)

2. No Dashboard do Render:
   - Vá para seu Web Service
   - Clique em "Settings" > "Custom Domains"
   - Adicione seu domínio
   - Configure os registros DNS conforme instruções

## Passo 3: Gerar API Token

1. Dashboard > Account > API Tokens
2. Clique em "Create API Token"
3. Copie o token
4. Cole em `.env` → `RENDER_API_KEY`

## Passo 4: Fazer Deploy

### Método 1: Via GitHub (Recomendado)

```bash
# 1. Inicializar Git (se não estiver)
git init
git add .
git commit -m "Initial commit"

# 2. Criar repositório privado no GitHub
# 3. Push para GitHub
git remote add origin https://github.com/seu-usuario/seu-repo.git
git push -u origin main

# 4. No Render Dashboard:
#    - Clique em "New +"
#    - Selecione "Web Service"
#    - Conecte seu repositório GitHub
#    - Configure:
#      - Name: seu-projeto
#      - Environment: Node
#      - Build Command: npm install
#      - Start Command: npx http-server ./
#    - Deploy!
```

### Método 2: Via Docker

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY . .
RUN npm install
EXPOSE 3000
CMD ["npm", "start"]
```

## Passo 5: Configurar no Script

1. Abra o script-auto.js
2. Procure por `DEPLOY_SERVICE`
3. Mude para `render`
4. Configure `RENDER_API_KEY` no `.env`

## URLs Esperadas

- **Render Free**: `https://seu-projeto.onrender.com` (dorme após 15min de inatividade)
- **Render Paid**: `https://seu-projeto.onrender.com` (sempre online)
- **Domínio Customizado**: `https://seu-dominio.com`

## Troubleshooting

### Site dorme/não carrega
- Render Free coloca em sleep após 15min de inatividade
- Solução: Upgrade para plano pago ou usar Paid Instance

### Domínio não funciona
- Aguarde 24-48h para DNS propagar
- Verifique registros DNS em seu registrador
- Use `nslookup seu-dominio.com` para testar

### Build falha
- Verifique logs no Render Dashboard
- Confirme que arquivos existem
- Teste localmente: `npm install && npm start`

## Custos

- **Web Service Free**: $0/mês (com limitações)
- **Web Service Paid**: $7/mês (sempre online)
- **Domínio .com**: $10-15/ano (no registrador)
- **Custom Domain no Render**: Grátis (só pague o domínio)

## Próximas Etapas

Após fazer deploy no Render:

1. Copie a URL do seu site (ex: `seu-projeto.onrender.com`)
2. O script-auto.js vai preencher automaticamente no Facebook
3. Facebook vai gerar a meta tag de verificação
4. Configure os registros DNS para validação

✅ Pronto para usar!
