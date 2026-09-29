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
  return String(value ?? '').replace(/[&<>'"]/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    "'": '&#039;',
    '"': '&quot;'
  }[character]));
}

async function fetchJson(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...(options.headers || {})
    }
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || 'Une erreur est survenue.');
  }
  return data;
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

  consumptionTableBody.innerHTML = records.map((record) => `
    <tr>
      <td>${escapeHtml(record.date)}</td>
      <td>${escapeHtml(record.source)}</td>
      <td>${formatNumber(record.kwh)} kWh</td>
      <td>${formatCurrency(record.cost_estimate_fcfa)}</td>
    </tr>
  `).join('');
}

function renderOutageRows(outages) {
  if (!outages.length) {
    outageTableBody.innerHTML = '<tr><td colspan="4" class="empty-state">Aucune coupure enregistrée.</td></tr>';
    return;
  }

  outageTableBody.innerHTML = outages.map((outage) => `
    <tr>
      <td>${escapeHtml(new Date(outage.start_time).toLocaleString('fr-FR'))}</td>
      <td>${escapeHtml(new Date(outage.end_time).toLocaleString('fr-FR'))}</td>
      <td>${formatNumber(outage.duration_hours)} h</td>
      <td>${formatNumber(outage.affected_power_kw)} kW</td>
    </tr>
  `).join('');
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
  const companies = await fetchJson('/api/companies');
  setSelectOptions(companies);

  if (!companies.length) {
    resetSummary();
    return;
  }

  const selectedSummaryId = document.getElementById('company-summary-select').value || companies[0].id;
  document.getElementById('company-summary-select').value = selectedSummaryId;
  document.getElementById('company-select-consumption').value ||= companies[0].id;
  document.getElementById('company-select-outage').value ||= companies[0].id;

  await loadSummary(selectedSummaryId);
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

async function handleFormSubmit(event, endpoint, successMessage) {
  event.preventDefault();
  const form = event.currentTarget;
  const button = form.querySelector('button[type="submit"]');
  button.disabled = true;

  try {
    const payload = Object.fromEntries(new FormData(form).entries());
    await fetchJson(endpoint, {
      method: 'POST',
      body: JSON.stringify(payload)
    });

    form.reset();
    await loadCompanies();
    alert(successMessage);
  } catch (error) {
    alert(error.message);
  } finally {
    button.disabled = false;
  }
}

document.getElementById('company-form').addEventListener('submit', (event) => {
  handleFormSubmit(event, '/api/companies', 'Entreprise enregistrée avec succès.');
});

document.getElementById('consumption-form').addEventListener('submit', (event) => {
  handleFormSubmit(event, '/api/consumption', 'Consommation enregistrée avec succès.');
});

document.getElementById('outage-form').addEventListener('submit', (event) => {
  handleFormSubmit(event, '/api/outages', 'Coupure enregistrée avec succès.');
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

loadCompanies().catch((error) => {
  alert(`Impossible de charger PowerA : ${error.message}`);
});
