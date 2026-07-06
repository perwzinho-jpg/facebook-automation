# 🔑 Setup de Tokens para Deploy Automático

## 1️⃣ Token do Render (Obrigatório)

### Passo 1: Gerar Token

1. Acesse: https://dashboard.render.com/account/api-tokens
2. Clique em "Create API Token"
3. Copie o token gerado
4. Cole em `.env`:

```env
RENDER_API_KEY=seu_token_aqui
```

## 2️⃣ Configurar GitHub (Opcional, mas Recomendado)

Para fazer push automático do código para o Render, você precisa:

### Passo 1: Criar Repositório GitHub

1. Vá para: https://github.com/new
2. Nome: `seu-projeto-facebook`
3. Descrição: `Facebook Automation Bot`
4. Escolha: Private ou Public
5. Clique em "Create repository"

### Passo 2: Gerar Token GitHub

1. Vá para: https://github.com/settings/tokens
2. Clique em "Generate new token"
3. Escolha: "Generate new token (classic)"
4. Configure:
   - **Note**: `Render Deploy`
   - **Expiration**: 90 days
   - **Scopes**: 
     - ✅ repo (Full control of private repositories)
     - ✅ workflow (Update GitHub Action workflows)
5. Clique em "Generate token"
6. Copie o token
7. Cole em `.env`:

```env
GITHUB_TOKEN=seu_token_aqui
GITHUB_USERNAME=seu_usuario_github
GITHUB_REPO=seu-projeto-facebook
```

### Passo 3: Configurar Git Localmente

```bash
git config --global user.name "Seu Nome"
git config --global user.email "seu.email@github.com"
```

## 3️⃣ Configuração Completa do .env

```env
# ========== RENDER ==========
# Obrigatório para deploy automático
RENDER_API_KEY=rnd_seu_token_aqui

# ========== GITHUB (Opcional) ==========
# Necessário apenas se quer fazer push automático
GITHUB_TOKEN=ghp_seu_token_aqui
GITHUB_USERNAME=seu_usuario
GITHUB_REPO=seu-projeto-facebook
```

## 4️⃣ Verificar Setup

Execute para testar:

```bash
node deploy-render.js
```

Deve listar seus serviços Render. ✅

## ⚠️ Segurança

- **NUNCA** compartilhe seus tokens publicamente
- **NUNCA** faça commit do `.env` no git
- Use `.gitignore`:

```bash
echo ".env" >> .gitignore
echo ".env.local" >> .gitignore
```

## 🚀 Pronto!

Com os tokens configurados, o script vai:

1. ✅ Fazer deploy automático no Render
2. ✅ Pegar a URL gerada
3. ✅ Preencher no Facebook
4. ✅ Capturar meta tag
5. ✅ Fazer redeploy com meta tag
6. ✅ Verificar domínio automaticamente

Simples assim! 🎉
