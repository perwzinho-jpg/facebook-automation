# ⚡ Render - Quick Start

## 1️⃣ Registre-se no Render (2 min)

```
https://render.com → Sign Up → Confirme email
```

## 2️⃣ Conecte seu GitHub (1 min)

1. Dashboard → "New +" → "Web Service"
2. Clique em "Connect a repository" ou "Connect account"
3. Autorize Render no GitHub
4. Selecione seu repositório (ou crie um novo)

## 3️⃣ Configure o Serviço (2 min)

- **Name**: seu-projeto-facebook
- **Environment**: Node
- **Build Command**: `npm install`
- **Start Command**: `npx http-server ./`
- **Plan**: Free (ou Paid se quiser sem sleep)

## 4️⃣ Copie a URL

Após deploy ficar "live":
- URL será: `https://seu-projeto-facebook.onrender.com`

## 5️⃣ Configure no Script

1. Abra `.env`
2. Procure `DEPLOY_SERVICE=render`
3. Pronto! Script vai usar a URL automaticamente

## 🎯 Domínio .com Customizado

### Opção A: Comprar Domínio (recomendado)
```
1. Compre em namecheap.com (~$10/ano)
2. No Render: Settings → Custom Domains → Add
3. Copie os DNS records
4. No registrador: Apontamento → Cole os DNS records
5. Aguarde 24-48h para propagar
```

### Opção B: Domínio Grátis Fake
```
1. Vá para freenom.com
2. Procure por "free domains" (.tk, .ml, .ga)
3. Registre grátis
4. Mesmos passos acima no Render
```

## 📊 Comparação: Vercel vs Render

| Recurso | Vercel | Render |
|---------|--------|--------|
| Hospedagem | Grátis | Grátis |
| Sleep | Nunca | 15min (Free) |
| Domínio customizado | $0 | $0 (só pague o domínio) |
| Velocidade | Muito rápida | Rápida |
| Support | Community | Community |

## ⚠️ Limitações Render Free

- Projeto dorme após 15 minutos de inatividade
- Primeira requisição leva 10-30s para acordar
- Se for usar em produção: upgrade para Paid ($7/mês)

## 🔧 Troubleshooting

| Problema | Solução |
|----------|---------|
| Deploy falha | Verifique logs no dashboard Render |
| Site muito lento | Aguarde carregar da sleep (primeira vez é lenta) |
| Domínio não funciona | Aguarde 24h, verifique DNS com `nslookup seu-dominio.com` |
| Build error | Rode localmente `npm install` e veja o erro |

## 📝 Próximas Etapas

```
1. Deploy está pronto ✅
2. Copie a URL
3. Execute script-auto.js
4. Script vai preencher domínio no Facebook automaticamente
5. Facebook vai gerar meta tag
6. Configure DNS para validação
7. Pronto! 🎉
```

## 💡 Dica Pro

Para evitar sleep e sempre ter site rápido:
- Upgrade para Paid Instance ($7/mês)
- Ou: Configure um "Cron Job" que acorda o site a cada 10min
- Ou: Use CloudFlare Workers como proxy (grátis)

---

**Precisa de ajuda?** Veja `RENDER_SETUP.md` para guia completo!
