# 🚀 Como Criar Web Service no Render

## Passo 1: Ir para Dashboard Render

1. Acesse: https://dashboard.render.com
2. Faça login com sua conta

## Passo 2: Criar Web Service

1. Clique em **"New +"** (canto superior)
2. Selecione **"Web Service"**

## Passo 3: Configurar

### Option 1: Usar Repositório GitHub (Recomendado)

1. Clique em **"Connect a repository"**
2. Autorize Render no GitHub
3. Selecione seu repositório (ou crie um novo)
4. Clique em **"Connect"**

### Option 2: Usar Blueprint (Mais fácil)

1. Clique em **"Public Blueprints"**
2. Procure por: "Static Site"
3. Deploy direto

## Passo 4: Configurar o Serviço

Preencha assim:

| Campo | Valor |
|-------|-------|
| **Name** | `facebook-automation` |
| **Environment** | `Static Site` ou `Node` |
| **Build Command** | `npm install` (opcional) |
| **Start Command** | `npx http-server ./` |
| **Plan** | **Free** ✅ |

## Passo 5: Deploy

1. Clique em **"Create Web Service"**
2. Aguarde o deployment (2-5 min)
3. Você verá a URL: `https://facebook-automation-xxxx.onrender.com`

## ⚠️ Importante

- **Nome do serviço**: Anote bem (vai usar no script)
- **URL gerada**: Será usada automaticamente
- **Free tier**: Site dorme após 15min de inatividade (normal)

## ✅ Pronto!

Após criar o Web Service:

```bash
node deploy-render.js
```

Vai listar seu serviço e você poderá fazer deploy automático! 🎉
