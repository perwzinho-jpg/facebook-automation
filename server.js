const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const PORT = process.env.PORT || 3000;

function loadCNPJData() {
  try {
    const data = fs.readFileSync(path.join(__dirname, 'cnpj-data.json'), 'utf8');
    return JSON.parse(data);
  } catch (err) {
    console.error('❌ Erro ao carregar cnpj-data.json:', err.message);
    return { cnpjs: {} };
  }
}

function fillTemplate(template, data) {
  let html = template;
  Object.keys(data).forEach(key => {
    const regex = new RegExp(`{{${key}}}`, 'g');
    html = html.replace(regex, data[key]);
  });
  return html;
}

function getDashboardTemplate() {
  try {
    return fs.readFileSync(path.join(__dirname, 'dashboard-template.html'), 'utf8');
  } catch (err) {
    return '<h1>Dashboard template não encontrado</h1>';
  }
}

const server = http.createServer((req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;
  const query = parsedUrl.query;
  const cnpjData = loadCNPJData();

  if (pathname === '/') {
    let cnpjKey = query.cnpj ? query.cnpj.replace(/\D/g, '') : null;

    // Se não há query param, usar o ÚLTIMO CNPJ adicionado
    if (!cnpjKey) {
      const cnpjKeys = Object.keys(cnpjData.cnpjs);
      if (cnpjKeys.length > 0) {
        cnpjKey = cnpjKeys[cnpjKeys.length - 1];
      }
    }

    // Se encontrou um CNPJ, servir o dashboard
    if (cnpjKey && cnpjData.cnpjs[cnpjKey]) {
      const companyData = cnpjData.cnpjs[cnpjKey];
      const template = getDashboardTemplate();
      const html = fillTemplate(template, companyData);
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(html);
      return;
    }

    // Se não há CNPJs, mostrar mensagem
    res.writeHead(404, { 'Content-Type': 'text/html' });
    res.end('<h1>❌ Nenhum CNPJ cadastrado</h1>');
    return;
  }

  let filePath = path.join(__dirname, pathname);

  fs.readFile(filePath, 'utf8', (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/html' });
      res.end('<h1>404 - Arquivo não encontrado</h1>');
      return;
    }

    const ext = path.extname(filePath);
    const contentTypes = {
      '.html': 'text/html',
      '.css': 'text/css',
      '.js': 'application/javascript',
      '.json': 'application/json'
    };

    res.writeHead(200, { 'Content-Type': contentTypes[ext] || 'text/plain' });
    res.end(data);
  });
});

server.listen(PORT, () => {
  console.log(`✅ Server rodando em http://localhost:${PORT}`);
  console.log(`📊 Dashboard: http://localhost:${PORT}?cnpj=12345678000190`);
});
