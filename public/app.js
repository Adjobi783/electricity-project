body {
  font-family: Arial, sans-serif;
  background: #f3f7fb;
  margin: 0;
  color: #1d2a39;
}

* {
  box-sizing: border-box;
}

.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 24px;
}

.topbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: linear-gradient(135deg, #0f3a67, #1f6fbf);
  color: white;
  padding: 24px;
  border-radius: 18px;
  margin-bottom: 24px;
  gap: 16px;
}

.topbar h1 {
  margin: 0 0 8px;
  font-size: 2rem;
}

.topbar p {
  margin: 0;
  opacity: 0.9;
}

.user-box {
  display: flex;
  align-items: center;
  gap: 12px;
  background: rgba(255, 255, 255, 0.12);
  padding: 10px 14px;
  border-radius: 12px;
}

.user-box button {
  background: white;
  color: #0f3a67;
  border: none;
  padding: 8px 12px;
  border-radius: 10px;
  font-weight: bold;
}

.auth-shell {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 20px;
  margin-bottom: 24px;
}

.auth-card {
  min-height: 100%;
}

.grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 20px;
  margin-bottom: 24px;
}

.card {
  background: white;
  border-radius: 16px;
  padding: 18px;
  box-shadow: 0 8px 18px rgba(0, 0, 0, 0.06);
}

.card h2 {
  margin-top: 0;
  font-size: 1.1rem;
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 12px;
}

label {
  display: flex;
  flex-direction: column;
  font-size: 0.9rem;
  font-weight: bold;
  color: #26374a;
  margin-bottom: 10px;
}

input,
select,
textarea,
button {
  margin-top: 6px;
  padding: 10px 12px;
  border-radius: 10px;
  border: 1px solid #cbd5e1;
  font-size: 0.95rem;
}

textarea {
  min-height: 80px;
  resize: vertical;
}

button {
  background: #0f6bdc;
  color: white;
  border: none;
  cursor: pointer;
  font-weight: bold;
}

button:hover {
  background: #0b5ab8;
}

button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.metrics {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 16px;
  margin-bottom: 24px;
}

.metric-box {
  background: #ecf5ff;
  border-left: 5px solid #0f6bdc;
  border-radius: 12px;
  padding: 16px;
}

.metric-box .label {
  font-size: 0.85rem;
  color: #3d4b5d;
}

.metric-box .value {
  font-size: 1.7rem;
  font-weight: bold;
  margin-top: 8px;
  color: #0f3a67;
}

.table-wrap {
  overflow-x: auto;
}

table {
  width: 100%;
  border-collapse: collapse;
  margin-top: 12px;
}

th, td {
  padding: 12px 10px;
  text-align: left;
  border-bottom: 1px solid #e5e7eb;
}

th {
  background: #eef4fb;
}

.select-row {
  margin-bottom: 16px;
}

.empty-state {
  color: #64748b;
  font-style: italic;
}

.hidden {
  display: none !important;
}

@media (max-width: 768px) {
  .container {
    padding: 16px;
  }

  .topbar {
    flex-direction: column;
    align-items: flex-start;
  }

  .topbar h1 {
    font-size: 1.5rem;
  }
}
