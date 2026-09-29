const express = require('express');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;
const DB_DIR = path.join(__dirname, 'data');
const DB_PATH = path.join(DB_DIR, 'powera.db');

const CIE_TARIFF_KWH = 100;
const GENERATOR_FUEL_PRICE_FCFA = 850;
const GENERATOR_LITERS_PER_KWH = 0.25;
const PRODUCTION_VALUE_PER_KWH = 4500;

if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
}

const db = new sqlite3.Database(DB_PATH, (err) => {
  if (err) {
    console.error('Erreur de connexion à la base de données :', err.message);
    process.exit(1);
  }
  console.log('Connexion SQLite établie :', DB_PATH);
  initializeDatabase();
});

function initializeDatabase() {
  const queries = [
    `CREATE TABLE IF NOT EXISTS companies (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      sector TEXT,
      location TEXT,
      installed_power_kw REAL DEFAULT 0,
      contact_name TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS consumption_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      company_id INTEGER NOT NULL,
      date TEXT NOT NULL,
      kwh REAL NOT NULL,
      source TEXT NOT NULL,
      cost_estimate_fcfa REAL DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(company_id) REFERENCES companies(id)
    )`,
    `CREATE TABLE IF NOT EXISTS outages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      company_id INTEGER NOT NULL,
      start_time TEXT NOT NULL,
      end_time TEXT NOT NULL,
      duration_hours REAL NOT NULL,
      affected_power_kw REAL NOT NULL,
      outage_type TEXT DEFAULT 'coupure',
      notes TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(company_id) REFERENCES companies(id)
    )`
  ];

  queries.forEach((query) => {
    db.run(query, (error) => {
      if (error) {
        console.error('Erreur de création de table :', error.message);
      }
    });
  });
}

function roundToTwo(value) {
  return Number(value.toFixed(2));
}

function calculateCieCost(kwh) {
  return roundToTwo(kwh * CIE_TARIFF_KWH);
}

function calculateGeneratorCost(durationHours, affectedPowerKw) {
  const generatorFuelLiters = durationHours * affectedPowerKw * GENERATOR_LITERS_PER_KWH;
  const fuelCost = generatorFuelLiters * GENERATOR_FUEL_PRICE_FCFA;
  return roundToTwo(fuelCost);
}

function calculateProductionLoss(durationHours, affectedPowerKw) {
  const lostEnergyKwh = durationHours * affectedPowerKw;
  const productionLoss = lostEnergyKwh * PRODUCTION_VALUE_PER_KWH;
  return roundToTwo(productionLoss);
}

function calculateTotalCost(kwh, durationHours, affectedPowerKw) {
  const cieCost = calculateCieCost(kwh);
  const generatorCost = calculateGeneratorCost(durationHours, affectedPowerKw);
  const productionLoss = calculateProductionLoss(durationHours, affectedPowerKw);
  return {
    cieCost,
    generatorCost,
    productionLoss,
    totalCost: roundToTwo(cieCost + generatorCost + productionLoss)
  };
}

function runQuery(query, params = []) {
  return new Promise((resolve, reject) => {
    db.run(query, params, function (err) {
      if (err) {
        reject(err);
        return;
      }
      resolve({ id: this.lastID, changes: this.changes });
    });
  });
}

function getAll(query, params = []) {
  return new Promise((resolve, reject) => {
    db.all(query, params, (err, rows) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(rows);
    });
  });
}

function getOne(query, params = []) {
  return new Promise((resolve, reject) => {
    db.get(query, params, (err, row) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(row);
    });
  });
}

function getCompanySummary(companyId) {
  return new Promise(async (resolve, reject) => {
    try {
      const company = await getOne('SELECT * FROM companies WHERE id = ?', [companyId]);
      if (!company) {
        resolve({
          company: null,
          totalConsumptionKwh: 0,
          totalOutageHours: 0,
          cieCost: 0,
          generatorCost: 0,
          productionLoss: 0,
          totalCost: 0,
          consommationRecords: [],
          outages: []
        });
        return;
      }

      const consumptionRecords = await getAll(
        'SELECT * FROM consumption_records WHERE company_id = ? ORDER BY date DESC',
        [companyId]
      );

      const outages = await getAll(
        'SELECT * FROM outages WHERE company_id = ? ORDER BY start_time DESC',
        [companyId]
      );

      const totalConsumptionKwh = consumptionRecords.reduce((sum, row) => sum + Number(row.kwh || 0), 0);
      const totalOutageHours = outages.reduce((sum, row) => sum + Number(row.duration_hours || 0), 0);

      const cieCost = consumptionRecords.reduce((sum, row) => sum + Number(row.cost_estimate_fcfa || 0), 0);

      const generatorCost = outages.reduce((sum, row) => {
        return sum + calculateGeneratorCost(Number(row.duration_hours || 0), Number(row.affected_power_kw || 0));
      }, 0);

      const productionLoss = outages.reduce((sum, row) => {
        return sum + calculateProductionLoss(Number(row.duration_hours || 0), Number(row.affected_power_kw || 0));
      }, 0);

      const totalCost = cieCost + generatorCost + productionLoss;

      resolve({
        company,
        totalConsumptionKwh: roundToTwo(totalConsumptionKwh),
        totalOutageHours: roundToTwo(totalOutageHours),
        cieCost: roundToTwo(cieCost),
        generatorCost: roundToTwo(generatorCost),
        productionLoss: roundToTwo(productionLoss),
        totalCost: roundToTwo(totalCost),
        consommationRecords: consumptionRecords,
        outages
      });
    } catch (error) {
      reject(error);
    }
  });
}

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    message: 'PowerA est en ligne',
    timestamp: new Date().toISOString()
  });
});

app.get('/api/companies', async (req, res) => {
  try {
    const companies = await getAll('SELECT * FROM companies ORDER BY created_at DESC');
    res.json(companies);
  } catch (error) {
    res.status(500).json({ error: 'Impossible de récupérer les entreprises', details: error.message });
  }
});

app.post('/api/companies', async (req, res) => {
  const { name, sector, location, installed_power_kw, contact_name } = req.body;

  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'Le nom de l’entreprise est obligatoire.' });
  }

  try {
    const result = await runQuery(
      'INSERT INTO companies (name, sector, location, installed_power_kw, contact_name) VALUES (?, ?, ?, ?, ?)',
      [name.trim(), sector || '', location || '', Number(installed_power_kw || 0), contact_name || '']
    );

    const company = await getOne('SELECT * FROM companies WHERE id = ?', [result.id]);
    res.status(201).json(company);
  } catch (error) {
    res.status(500).json({ error: 'Impossible d’ajouter l’entreprise', details: error.message });
  }
});

app.get('/api/consumption', async (req, res) => {
  const { companyId } = req.query;

  try {
    let query = 'SELECT * FROM consumption_records';
    let params = [];

    if (companyId) {
      query += ' WHERE company_id = ?';
      params.push(Number(companyId));
    }

    query += ' ORDER BY date DESC';

    const records = await getAll(query, params);
    res.json(records);
  } catch (error) {
    res.status(500).json({ error: 'Impossible de récupérer les consommations', details: error.message });
  }
});

app.post('/api/consumption', async (req, res) => {
  const { company_id, date, kwh, source } = req.body;

  if (!company_id || !date || !kwh) {
    return res.status(400).json({ error: 'Tous les champs obligatoires doivent être remplis.' });
  }

  try {
    const energyKwh = Number(kwh);
    const cieCost = calculateCieCost(energyKwh);

    const result = await runQuery(
      'INSERT INTO consumption_records (company_id, date, kwh, source, cost_estimate_fcfa) VALUES (?, ?, ?, ?, ?)',
      [Number(company_id), date, energyKwh, source || 'CIE', cieCost]
    );

    const record = await getOne('SELECT * FROM consumption_records WHERE id = ?', [result.id]);
    res.status(201).json(record);
  } catch (error) {
    res.status(500).json({ error: 'Impossible d’ajouter la consommation', details: error.message });
  }
});

app.get('/api/outages', async (req, res) => {
  const { companyId } = req.query;

  try {
    let query = 'SELECT * FROM outages';
    let params = [];

    if (companyId) {
      query += ' WHERE company_id = ?';
      params.push(Number(companyId));
    }

    query += ' ORDER BY start_time DESC';

    const outages = await getAll(query, params);
    res.json(outages);
  } catch (error) {
    res.status(500).json({ error: 'Impossible de récupérer les coupures', details: error.message });
  }
});

app.post('/api/outages', async (req, res) => {
  const {
    company_id,
    start_time,
    end_time,
    duration_hours,
    affected_power_kw,
    outage_type,
    notes
  } = req.body;

  if (!company_id || !start_time || !end_time || !duration_hours || !affected_power_kw) {
    return res.status(400).json({
      error: 'Les champs de la coupure sont incomplets.'
    });
  }

  try {
    const startDate = new Date(start_time);
    const endDate = new Date(end_time);

    if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
      return res.status(400).json({ error: 'Les dates de début et de fin de coupure sont invalides.' });
    }

    const duration = Number(duration_hours);
    const power = Number(affected_power_kw);

    const result = await runQuery(
      `INSERT INTO outages (company_id, start_time, end_time, duration_hours, affected_power_kw, outage_type, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [Number(company_id), start_time, end_time, duration, power, outage_type || 'coupure', notes || '']
    );

    const outage = await getOne('SELECT * FROM outages WHERE id = ?', [result.id]);
    res.status(201).json(outage);
  } catch (error) {
    res.status(500).json({ error: 'Impossible d’ajouter la coupure', details: error.message });
  }
});

app.get('/api/summary', async (req, res) => {
  const { companyId } = req.query;

  if (!companyId) {
    return res.status(400).json({ error: 'L’identifiant de l’entreprise est requis.' });
  }

  try {
    const summary = await getCompanySummary(Number(companyId));
    res.json(summary);
  } catch (error) {
    res.status(500).json({ error: 'Impossible de calculer le bilan énergétique', details: error.message });
  }
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`PowerA démarré sur http://localhost:${PORT}`);
});
