const dashboardSection = document.getElementById('dashboard');
const authSection = document.getElementById('auth-section');
const userBox = document.getElementById('user-box');
const userNameLabel = document.getElementById('user-name');
const logoutButton = document.getElementById('logout-btn');

const companySelects = [
  document.getElementById('company-select-consumption'),
  document.getElementById('company-select-outage'),
  document.getElementById('company-summary-select')
];

const consumptionTableBody = document.getElementById('consumption-table-body');
const outageTableBody = document.getElementById('outage-table-body');

const summaryFields = {
  totalConsumption: document.getElementById('total-consumption'),
  cieCost: document.getElementById('cie-cost'),
  generatorCost: document.getElementById('generator-cost'),
  productionLoss: document.getElementById('production-loss'),
  totalCost: document.getElementById('total-cost')
};

function formatNumber(value) {
  return Number(value || 0).toLocaleString('fr-FR', {
    maximumFractionDigits: 2
  });
}

function formatCurrency(value) {
  return `${formatNumber(value)} FCFA`;
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  }[character]));
}

function toggleDashboard(user) {
  if (user) {
    authSection.classList.add('hidden');
    dashboardSection.classList.remove('hidden');
    userBox.classList.remove('hidden');
    userNameLabel.textContent = `${user.name} (${user.role})`;
  } else {
    authSection.classList.remove('hidden');
    dashboardSection.classList.add('hidden');
    userBox.classList.add('hidden');
  }
}

async function fetchJson(url, options = {}) {
  const response = await fetch(url, {
    credentials: 'same-origin',
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    }
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || 'Une erreur inconnue est survenue.');
  }

  return data;
}

async function fetchCurrentUser() {
  const response = await fetch('/api/auth/me', { credentials: 'same-origin' });
  if (response.status === 401 || response.status === 403) {
    return null;
  }

  return response.json();
}

function setSelectOptions(companies) {
  companySelects.forEach((select) => {
    const currentValue = select.value;
    select.innerHTML = '<option value="">Sélectionner une entreprise</option>';

    companies.forEach((company) => {
      const option = document.createElement('option');
      option.value = company.id;
      option.textContent = company.name;
      select.appendChild(option);
    });

    if (companies.some((company) => String(company.id) === currentValue)) {
      select.value = currentValue;
    }
  });
}

function renderConsumptionRows(records) {
  if (!records.length) {
    consumptionTableBody.innerHTML = '<tr><td colspan="4" class="empty-state">Aucune donnée disponible.</td></tr>';
    return;
  }

  consumptionTableBody.innerHTML = records
    .map(
      (record) => `
      <tr>
        <td>${escapeHtml(record.date)}</td>
        <td>${escapeHtml(record.source)}</td>
        <td>${formatNumber(record.kwh)} kWh</td>
        <td>${formatCurrency(record.cost_estimate_fcfa)}</td>
      </tr>
    `
    )
    .join('');
}

function renderOutageRows(outages) {
  if (!outages.length) {
    outageTableBody.innerHTML = '<tr><td colspan="4" class="empty-state">Aucune coupure enregistrée.</td></tr>';
    return;
  }

  outageTableBody.innerHTML = outages
    .map(
      (outage) => `
      <tr>
        <td>${escapeHtml(new Date(outage.start_time).toLocaleString('fr-FR'))}</td>
        <td>${escapeHtml(new Date(outage.end_time).toLocaleString('fr-FR'))}</td>
        <td>${formatNumber(outage.duration_hours)} h</td>
        <td>${formatNumber(outage.affected_power_kw)} kW</td>
      </tr>
    `
    )
    .join('');
}

function resetSummary() {
  summaryFields.totalConsumption.textContent = '0 kWh';
  summaryFields.cieCost.textContent = '0 FCFA';
  summaryFields.generatorCost.textContent = '0 FCFA';
  summaryFields.productionLoss.textContent = '0 FCFA';
  summaryFields.totalCost.textContent = '0 FCFA';
  renderConsumptionRows([]);
  renderOutageRows([]);
}

async function loadCompanies() {
  try {
    const companies = await fetchJson('/api/companies');
    setSelectOptions(companies);

    if (!companies.length) {
      resetSummary();
      return;
    }

    const selectedSummaryId = document.getElementById('company-summary-select').value || companies[0].id;
    document.getElementById('company-summary-select').value = selectedSummaryId;
    if (!document.getElementById('company-select-consumption').value) {
      document.getElementById('company-select-consumption').value = companies[0].id;
    }
    if (!document.getElementById('company-select-outage').value) {
      document.getElementById('company-select-outage').value = companies[0].id;
    }

    await loadSummary(selectedSummaryId);
  } catch (error) {
    console.error(error);
    resetSummary();
  }
}

async function loadSummary(companyId) {
  if (!companyId) {
    resetSummary();
    return;
  }

  const summary = await fetchJson(`/api/summary?companyId=${encodeURIComponent(companyId)}`);
  summaryFields.totalConsumption.textContent = `${formatNumber(summary.totalConsumptionKwh)} kWh`;
  summaryFields.cieCost.textContent = formatCurrency(summary.cieCost);
  summaryFields.generatorCost.textContent = formatCurrency(summary.generatorCost);
  summaryFields.productionLoss.textContent = formatCurrency(summary.productionLoss);
  summaryFields.totalCost.textContent = formatCurrency(summary.totalCost);
  renderConsumptionRows(summary.consommationRecords || []);
  renderOutageRows(summary.outages || []);
}

async function initializeApp() {
  const user = await fetchCurrentUser();
  toggleDashboard(user);

  if (user) {
    await loadCompanies();
  }
}

document.getElementById('login-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  const button = form.querySelector('button');
  button.disabled = true;

  try {
    const payload = Object.fromEntries(new FormData(form).entries());
    const response = await fetchJson('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(payload)
    });

    toggleDashboard(response.user);
    await loadCompanies();
    form.reset();
  } catch (error) {
    alert(error.message);
  } finally {
    button.disabled = false;
  }
});

document.getElementById('register-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  const button = form.querySelector('button');
  button.disabled = true;

  try {
    const payload = Object.fromEntries(new FormData(form).entries());
    const response = await fetchJson('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload)
    });

    toggleDashboard(response.user);
    await loadCompanies();
    form.reset();
  } catch (error) {
    alert(error.message);
  } finally {
    button.disabled = false;
  }
});

logoutButton.addEventListener('click', async () => {
  try {
    await fetchJson('/api/auth/logout', { method: 'POST' });
    toggleDashboard(null);
    resetSummary();
  } catch (error) {
    alert(error.message);
  }
});

document.getElementById('company-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  const button = form.querySelector('button[type="submit"]');
  button.disabled = true;

  try {
    const payload = Object.fromEntries(new FormData(form).entries());
    await fetchJson('/api/companies', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
    form.reset();
    await loadCompanies();
    alert('Entreprise enregistrée avec succès.');
  } catch (error) {
    alert(error.message);
  } finally {
    button.disabled = false;
  }
});

document.getElementById('consumption-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  const button = form.querySelector('button[type="submit"]');
  button.disabled = true;

  try {
    const payload = Object.fromEntries(new FormData(form).entries());
    await fetchJson('/api/consumption', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
    form.reset();
    const selectedCompany = document.getElementById('company-summary-select').value;
    if (selectedCompany) {
      await loadSummary(selectedCompany);
    }
    await loadCompanies();
    alert('Consommation enregistrée avec succès.');
  } catch (error) {
    alert(error.message);
  } finally {
    button.disabled = false;
  }
});

document.getElementById('outage-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  const button = form.querySelector('button[type="submit"]');
  button.disabled = true;

  try {
    const payload = Object.fromEntries(new FormData(form).entries());
    await fetchJson('/api/outages', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
    form.reset();
    const selectedCompany = document.getElementById('company-summary-select').value;
    if (selectedCompany) {
      await loadSummary(selectedCompany);
    }
    await loadCompanies();
    alert('Coupure enregistrée avec succès.');
  } catch (error) {
    alert(error.message);
  } finally {
    button.disabled = false;
  }
});

document.getElementById('company-summary-select').addEventListener('change', (event) => {
  loadSummary(event.target.value).catch((error) => alert(error.message));
});

document.getElementById('company-select-consumption').addEventListener('change', (event) => {
  loadSummary(event.target.value).catch((error) => alert(error.message));
});

document.getElementById('company-select-outage').addEventListener('change', (event) => {
  loadSummary(event.target.value).catch((error) => alert(error.message));
});

initializeApp().catch((error) => {
  console.error(error);
  toggleDashboard(null);
});

resetSummary();

