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
  return Number(value || 0).toLocaleString('fr-FR');
}

function formatCurrency(value) {
  return `${formatNumber(value)} FCFA`;
}

async function fetchJson(url, options = {}) {
  const response = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...options
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'Erreur inconnue');
  }

  return data;
}

async function loadCompanies() {
  const companies = await fetchJson('/api/companies');

  companySelects.forEach((select) => {
    select.innerHTML = '<option value="">Sélectionner</option>';
    companies.forEach((company) => {
      const option = document.createElement('option');
      option.value = company.id;
      option.textContent = company.name;
      select.appendChild(option);
    });
  });

  if (companies.length > 0) {
    const first = companies[0].id;
    companySelects[1].value = first;
    companySelects[2].value = first;
    loadSummary(first);
  }

  loadConsumptionRecords();
  loadOutages();
}

async function loadConsumptionRecords() {
  const companyId = document.getElementById('company-select-consumption').value;
  const url = companyId ? `/api/consumption?companyId=${companyId}` : '/api/consumption';

  try {
    const records = await fetchJson(url);

    if (!records.length) {
      consumptionTableBody.innerHTML = '<tr><td colspan="4" class="empty-state">Aucune donnée disponible.</td></tr>';
      return;
    }

    consumptionTableBody.innerHTML = records
      .map(
        (record) => `
          <tr>
            <td>${record.date}</td>
            <td>${record.source}</td>
            <td>${formatNumber(record.kwh)} kWh</td>
            <td>${formatCurrency(record.cost_estimate_fcfa)}</td>
          </tr>
        `
      )
      .join('');
  } catch (error) {
    consumptionTableBody.innerHTML = `<tr><td colspan="4" class="empty-state">${error.message}</td></tr>`;
  }
}

async function loadOutages() {
  const companyId = document.getElementById('company-select-outage').value;
  const url = companyId ? `/api/outages?companyId=${companyId}` : '/api/outages';

  try {
    const outages = await fetchJson(url);

    if (!outages.length) {
      outageTableBody.innerHTML = '<tr><td colspan="4" class="empty-state">Aucune coupure enregistrée.</td></tr>';
      return;
    }

    outageTableBody.innerHTML = outages
      .map(
        (outage) => `
          <tr>
            <td>${new Date(outage.start_time).toLocaleString('fr-FR')}</td>
            <td>${new Date(outage.end_time).toLocaleString('fr-FR')}</td>
            <td>${formatNumber(outage.duration_hours)} h</td>
            <td>${formatNumber(outage.affected_power_kw)} kW</td>
          </tr>
        `
      )
      .join('');
  } catch (error) {
    outageTableBody.innerHTML = `<tr><td colspan="4" class="empty-state">${error.message}</td></tr>`;
  }
}

async function loadSummary(companyId) {
  if (!companyId) {
    summaryFields.totalConsumption.textContent = '0 kWh';
    summaryFields.cieCost.textContent = '0 FCFA';
    summaryFields.generatorCost.textContent = '0 FCFA';
    summaryFields.productionLoss.textContent = '0 FCFA';
    summaryFields.totalCost.textContent = '0 FCFA';
    return;
  }

  try {
    const summary = await fetchJson(`/api/summary?companyId=${companyId}`);

    summaryFields.totalConsumption.textContent = `${formatNumber(summary.totalConsumptionKwh)} kWh`;
    summaryFields.cieCost.textContent = formatCurrency(summary.cieCost);
    summaryFields.generatorCost.textContent = formatCurrency(summary.generatorCost);
    summaryFields.productionLoss.textContent = formatCurrency(summary.productionLoss);
    summaryFields.totalCost.textContent = formatCurrency(summary.totalCost);

    const consumptionRows = summary.consommationRecords || [];
    const outageRows = summary.outages || [];

    if (!consumptionRows.length) {
      consumptionTableBody.innerHTML = '<tr><td colspan="4" class="empty-state">Aucune donnée disponible.</td></tr>';
    } else {
      consumptionTableBody.innerHTML = consumptionRows
        .map(
          (record) => `
            <tr>
              <td>${record.date}</td>
              <td>${record.source}</td>
              <td>${formatNumber(record.kwh)} kWh</td>
              <td>${formatCurrency(record.cost_estimate_fcfa)}</td>
            </tr>
          `
        )
        .join('');
    }

    if (!outageRows.length) {
      outageTableBody.innerHTML = '<tr><td colspan="4" class="empty-state">Aucune coupure enregistrée.</td></tr>';
    } else {
      outageTableBody.innerHTML = outageRows
        .map(
          (outage) => `
            <tr>
              <td>${new Date(outage.start_time).toLocaleString('fr-FR')}</td>
              <td>${new Date(outage.end_time).toLocaleString('fr-FR')}</td>
              <td>${formatNumber(outage.duration_hours)} h</td>
              <td>${formatNumber(outage.affected_power_kw)} kW</td>
            </tr>
          `
        )
        .join('');
    }
  } catch (error) {
    console.error(error);
  }
}

document.getElementById('company-form').addEventListener('submit', async (event) => {
  event.preventDefault();

  const form = event.target;
  const payload = Object.fromEntries(new FormData(form).entries());

  try {
    await fetchJson('/api/companies', {
      method: 'POST',
      body: JSON.stringify(payload)
    });

    form.reset();
    await loadCompanies();
    alert('Entreprise enregistrée avec succès.');
  } catch (error) {
    alert(error.message);
  }
});

document.getElementById('consumption-form').addEventListener('submit', async (event) => {
  event.preventDefault();

  const form = event.target;
  const payload = Object.fromEntries(new FormData(form).entries());

  try {
    await fetchJson('/api/consumption', {
      method: 'POST',
      body: JSON.stringify(payload)
    });

    form.reset();
    await loadCompanies();
    const selectedCompany = document.getElementById('company-summary-select').value;
    if (selectedCompany) {
      await loadSummary(selectedCompany);
    }
    alert('Consommation enregistrée avec succès.');
  } catch (error) {
    alert(error.message);
  }
});

document.getElementById('outage-form').addEventListener('submit', async (event) => {
  event.preventDefault();

  const form = event.target;
  const payload = Object.fromEntries(new FormData(form).entries());

  try {
    await fetchJson('/api/outages', {
      method: 'POST',
      body: JSON.stringify(payload)
    });

    form.reset();
    await loadCompanies();
    const selectedCompany = document.getElementById('company-summary-select').value;
    if (selectedCompany) {
      await loadSummary(selectedCompany);
    }
    alert('Coupure enregistrée avec succès.');
  } catch (error) {
    alert(error.message);
  }
});

companySelects[0].addEventListener('change', loadConsumptionRecords);
companySelects[1].addEventListener('change', loadOutages);
companySelects[2].addEventListener('change', (event) => {
  loadSummary(event.target.value);
});

loadCompanies();
