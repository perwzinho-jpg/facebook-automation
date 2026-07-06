// ========== UTILIDADES ==========
const API_BASE = '';
let currentFilter = 'all';

function showStatus(elementId, message, type) {
  const element = document.getElementById(elementId);
  element.textContent = message;
  element.className = `status-message show ${type}`;
  setTimeout(() => {
    element.classList.remove('show');
  }, 5000);
}

// ========== ABAS ==========
function switchTab(tabName) {
  // Ocultar todas as abas
  document.querySelectorAll('.tab-content').forEach(tab => {
    tab.classList.remove('active');
  });

  // Remover estado ativo de botões
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.classList.remove('active');
  });

  // Mostrar aba selecionada
  document.getElementById(tabName).classList.add('active');
  event.target.classList.add('active');

  // Carregar dados se necessário
  if (tabName === 'dashboard') {
    loadStats();
    loadActivityLog();
  } else if (tabName === 'accounts') {
    loadAccounts();
  }
}

// ========== DASHBOARD ==========
async function loadStats() {
  try {
    const response = await fetch(`${API_BASE}/api/stats`);
    const data = await response.json();

    document.getElementById('stat-total').textContent = data.total;
    document.getElementById('stat-verified').textContent = data.verified;
    document.getElementById('stat-pending').textContent = data.pending;
    document.getElementById('stat-failed').textContent = data.failed;
    document.getElementById('stat-percentage').textContent = `${data.percentage}%`;
  } catch (error) {
    console.error('Erro ao carregar estatísticas:', error);
  }
}

async function loadActivityLog() {
  try {
    const response = await fetch(`${API_BASE}/api/accounts`);
    const accounts = await response.json();

    const logContainer = document.getElementById('activity-log');

    if (accounts.length === 0) {
      logContainer.innerHTML = '<p class="empty">Nenhuma atividade ainda...</p>';
      return;
    }

    const recentAccounts = accounts.slice(0, 5);
    logContainer.innerHTML = recentAccounts.map(account => `
      <div class="activity-item">
        <strong>${account.email}</strong> - Status: <span class="status-badge status-${account.status}">${account.status}</span>
        <br>
        <small>${new Date(account.created_at).toLocaleString('pt-BR')}</small>
      </div>
    `).join('');
  } catch (error) {
    console.error('Erro ao carregar logs:', error);
  }
}

// ========== AUTOMAÇÃO ==========
document.getElementById('automationForm')?.addEventListener('submit', async (e) => {
  e.preventDefault();

  const formStatus = document.getElementById('formStatus');
  formStatus.className = 'status-message show';
  formStatus.textContent = '⏳ Processando...';

  try {
    const accountData = {
      email: document.getElementById('email').value,
      password: document.getElementById('password').value,
      twoFASecret: document.getElementById('twoFASecret').value,
      businessName: document.getElementById('businessName').value,
      proxy: document.getElementById('proxy').value,
      country: document.getElementById('country').value,
      cnpjData: {
        cnpj: document.getElementById('cnpj').value,
        personName: document.getElementById('personName').value,
        email: document.getElementById('companyEmail').value
      }
    };

    const response = await fetch(`${API_BASE}/api/automations/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(accountData)
    });

    if (response.ok) {
      formStatus.className = 'status-message show success';
      formStatus.textContent = '✅ Automação iniciada! Verifique o dashboard.';
      document.getElementById('automationForm').reset();
    } else {
      const error = await response.json();
      formStatus.className = 'status-message show error';
      formStatus.textContent = `❌ Erro: ${error.error}`;
    }
  } catch (error) {
    formStatus.className = 'status-message show error';
    formStatus.textContent = `❌ Erro: ${error.message}`;
  }
});

// ========== CONTAS ==========
async function loadAccounts() {
  try {
    const url = currentFilter === 'all'
      ? `${API_BASE}/api/accounts`
      : `${API_BASE}/api/accounts?status=${currentFilter}`;

    const response = await fetch(url);
    const accounts = await response.json();

    const tbody = document.getElementById('accountsBody');

    if (accounts.length === 0) {
      tbody.innerHTML = '<tr><td colspan="7" class="empty">Nenhuma conta encontrada</td></tr>';
      return;
    }

    tbody.innerHTML = accounts.map(account => `
      <tr>
        <td>${account.id}</td>
        <td>${account.email}</td>
        <td>${account.cnpj || '-'}</td>
        <td><span class="status-badge status-${account.status}">${account.status}</span></td>
        <td>${account.verified ? '✅' : '❌'}</td>
        <td>${new Date(account.created_at).toLocaleDateString('pt-BR')}</td>
        <td>
          <button class="btn-small" onclick="viewAccountDetails(${account.id})">👁️ Ver</button>
          <button class="btn-small" onclick="deleteAccount(${account.id})">🗑️ Del</button>
        </td>
      </tr>
    `).join('');
  } catch (error) {
    console.error('Erro ao carregar contas:', error);
  }
}

function filterAccounts(status) {
  currentFilter = status;

  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.classList.remove('active');
  });
  event.target.classList.add('active');

  loadAccounts();
}

async function viewAccountDetails(accountId) {
  try {
    const response = await fetch(`${API_BASE}/api/accounts/${accountId}`);
    const account = await response.json();

    const logsResponse = await fetch(`${API_BASE}/api/accounts/${accountId}/logs`);
    const logs = await logsResponse.json();

    const modalBody = document.getElementById('modalBody');
    modalBody.innerHTML = `
      <p><strong>Email:</strong> ${account.email}</p>
      <p><strong>CNPJ:</strong> ${account.cnpj || '-'}</p>
      <p><strong>Business ID:</strong> ${account.business_id || '-'}</p>
      <p><strong>Domínio:</strong> ${account.domain || '-'}</p>
      <p><strong>Status:</strong> <span class="status-badge status-${account.status}">${account.status}</span></p>
      <p><strong>Verificado:</strong> ${account.verified ? '✅ Sim' : '❌ Não'}</p>
      <p><strong>Criado em:</strong> ${new Date(account.created_at).toLocaleString('pt-BR')}</p>
    `;

    const logsList = document.getElementById('logsList');
    if (logs.length > 0) {
      logsList.innerHTML = logs.map(log => `
        <div class="log-entry">
          <strong>${log.action}</strong> - ${log.status}
          <br>
          <small>${log.message}</small>
          <br>
          <small>${new Date(log.timestamp).toLocaleString('pt-BR')}</small>
        </div>
      `).join('');
    } else {
      logsList.innerHTML = '<p class="empty">Sem logs registrados</p>';
    }

    document.getElementById('accountModal').classList.add('active');
  } catch (error) {
    console.error('Erro ao carregar detalhes:', error);
  }
}

function closeAccountModal() {
  document.getElementById('accountModal').classList.remove('active');
}

async function deleteAccount(accountId) {
  if (!confirm('Tem certeza que deseja deletar esta conta?')) return;

  try {
    const response = await fetch(`${API_BASE}/api/accounts/${accountId}`, {
      method: 'DELETE'
    });

    if (response.ok) {
      loadAccounts();
    }
  } catch (error) {
    console.error('Erro ao deletar conta:', error);
  }
}

// ========== IMPORTAR ==========
function parseAccountFromTxt(text) {
  // Formato esperado:
  // UID: 61584588980774
  // EMAIL: ahbuphh@mailto.plus
  // SENHA FACE: XXNKGTGlw97EXX
  // etc

  const lines = text.split('\n').map(line => line.trim()).filter(line => line);
  const account = {};

  for (const line of lines) {
    if (line.startsWith('UID:')) {
      account.uid = line.replace('UID:', '').trim();
    } else if (line.startsWith('EMAIL:')) {
      account.email = line.replace('EMAIL:', '').trim();
    } else if (line.startsWith('SENHA FACE:')) {
      account.password = line.replace('SENHA FACE:', '').trim();
    } else if (line.startsWith('URL:')) {
      account.profileUrl = line.replace('URL:', '').trim();
    }
  }

  return account;
}

async function importFromTxt() {
  const textarea = document.getElementById('txtImport');
  const content = textarea.value.trim();

  if (!content) {
    showStatus('importResult', '❌ Campo vazio', 'error');
    return;
  }

  try {
    const blocks = content.split(/\n\s*\n+/);
    const accounts = [];

    for (const block of blocks) {
      const account = parseAccountFromTxt(block);
      if (account.email && account.password) {
        accounts.push({
          email: account.email,
          password: account.password,
          uid: account.uid || null,
          status: 'pending'
        });
      }
    }

    if (accounts.length === 0) {
      showStatus('importResult', '❌ Nenhuma conta válida encontrada', 'error');
      return;
    }

    const response = await fetch(`${API_BASE}/api/accounts/import`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ accounts })
    });

    const result = await response.json();
    const successCount = result.imported.filter(r => r.status === 'created').length;

    const resultDiv = document.getElementById('importResult');
    resultDiv.className = 'import-result success';
    resultDiv.innerHTML = `
      <h3>✅ Importação Concluída</h3>
      <p>${successCount} contas importadas com sucesso!</p>
      <details>
        <summary>Detalhes</summary>
        <pre>${JSON.stringify(result.imported, null, 2)}</pre>
      </details>
    `;

    textarea.value = '';
  } catch (error) {
    const resultDiv = document.getElementById('importResult');
    resultDiv.className = 'import-result error';
    resultDiv.innerHTML = `<h3>❌ Erro na importação</h3><p>${error.message}</p>`;
  }
}

async function importFromJson() {
  const textarea = document.getElementById('jsonImport');
  const content = textarea.value.trim();

  if (!content) {
    showStatus('importResult', '❌ Campo vazio', 'error');
    return;
  }

  try {
    const accounts = JSON.parse(content);

    if (!Array.isArray(accounts)) {
      throw new Error('JSON deve ser um array de contas');
    }

    const response = await fetch(`${API_BASE}/api/accounts/import`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ accounts })
    });

    const result = await response.json();
    const successCount = result.imported.filter(r => r.status === 'created').length;

    const resultDiv = document.getElementById('importResult');
    resultDiv.className = 'import-result success';
    resultDiv.innerHTML = `
      <h3>✅ Importação Concluída</h3>
      <p>${successCount} contas importadas com sucesso!</p>
      <details>
        <summary>Detalhes</summary>
        <pre>${JSON.stringify(result.imported, null, 2)}</pre>
      </details>
    `;

    textarea.value = '';
  } catch (error) {
    const resultDiv = document.getElementById('importResult');
    resultDiv.className = 'import-result error';
    resultDiv.innerHTML = `<h3>❌ Erro na importação</h3><p>${error.message}</p>`;
  }
}

// ========== AUTO-REFRESH ==========
setInterval(() => {
  if (document.getElementById('dashboard').classList.contains('active')) {
    loadStats();
    loadActivityLog();
  }
}, 30000); // Atualizar a cada 30 segundos

// ========== INICIALIZAÇÃO ==========
window.addEventListener('load', () => {
  loadStats();
  loadActivityLog();
});

// Fechar modal ao clicar fora
document.getElementById('accountModal')?.addEventListener('click', (e) => {
  if (e.target.id === 'accountModal') {
    closeAccountModal();
  }
});
