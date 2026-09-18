'use strict';

if (typeof Chart !== 'undefined') {
  Chart.defaults.color = '#7d8b9c';
  Chart.defaults.font.family = "'Inter', sans-serif";
  Chart.defaults.font.size = 11;
}
const gridline = { color: 'rgba(255,255,255,0.05)', drawTicks: false };
const PALETTE = ['#4c8dff', '#8b6cf2', '#34d1a4', '#f2685c', '#f2b84c'];

let chartInstances = {};

function money(v) { return '$' + Math.round(v).toLocaleString(); }

async function getJSON(url, opts) {
  const res = await fetch(url, opts);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

async function loadKPIs() {
  const k = await getJSON('/api/kpis');
  document.getElementById('kpiRevenue').textContent = money(k.revenue);
  document.getElementById('kpiProfit').textContent = money(k.profit);
  document.getElementById('kpiOrders').textContent = k.orders.toLocaleString();
  document.getElementById('kpiAOV').textContent = money(k.avg_order_value);
}

async function loadTrend() {
  const rows = await getJSON('/api/revenue-trend');
  if (chartInstances.trend) chartInstances.trend.destroy();
  chartInstances.trend = new Chart(document.getElementById('trendChart'), {
    type: 'line',
    data: {
      labels: rows.map(r => r.month),
      datasets: [
        { label: 'Revenue', data: rows.map(r => r.revenue), borderColor: '#4c8dff', backgroundColor: 'rgba(76,141,255,0.12)', tension: 0.3, fill: true },
        { label: 'Profit', data: rows.map(r => r.profit), borderColor: '#34d1a4', backgroundColor: 'rgba(52,209,164,0.1)', tension: 0.3, fill: true },
      ],
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: true, labels: { boxWidth: 10 } } },
      scales: { x: { grid: { display: false } }, y: { grid: gridline } },
    },
  });
}

async function loadCategory() {
  const rows = await getJSON('/api/category-breakdown');
  if (chartInstances.category) chartInstances.category.destroy();
  chartInstances.category = new Chart(document.getElementById('categoryChart'), {
    type: 'doughnut',
    data: {
      labels: rows.map(r => r.category),
      datasets: [{ data: rows.map(r => r.revenue), backgroundColor: PALETTE, borderColor: '#0e131b', borderWidth: 2 }],
    },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom', labels: { boxWidth: 10 } } } },
  });
}

async function loadRegion() {
  const rows = await getJSON('/api/region-performance');
  if (chartInstances.region) chartInstances.region.destroy();
  chartInstances.region = new Chart(document.getElementById('regionChart'), {
    type: 'bar',
    data: {
      labels: rows.map(r => r.region),
      datasets: [{ data: rows.map(r => r.revenue), backgroundColor: '#8b6cf2', borderRadius: 4, maxBarThickness: 40 }],
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: { x: { grid: { display: false } }, y: { grid: gridline } },
    },
  });
}

function fillTable(tableId, rows, columns) {
  const table = document.getElementById(tableId);
  const tbody = table.querySelector('tbody');
  tbody.innerHTML = '';
  rows.forEach((r) => {
    const tr = document.createElement('tr');
    tr.innerHTML = columns.map((c) => `<td>${c.fmt ? c.fmt(r[c.key]) : r[c.key]}</td>`).join('');
    tbody.appendChild(tr);
  });
}

async function loadTopProducts() {
  const rows = await getJSON('/api/top-products?limit=10');
  fillTable('topProductsTable', rows, [
    { key: 'name' }, { key: 'category' },
    { key: 'revenue', fmt: money }, { key: 'units_sold' },
  ]);
}

async function loadTopCustomers() {
  const rows = await getJSON('/api/top-customers?limit=10');
  fillTable('topCustomersTable', rows, [
    { key: 'name' }, { key: 'segment' }, { key: 'orders' }, { key: 'revenue', fmt: money },
  ]);
}

async function loadRFM() {
  const data = await getJSON('/api/rfm');
  const tiers = data.tier_counts;
  if (chartInstances.rfm) chartInstances.rfm.destroy();
  chartInstances.rfm = new Chart(document.getElementById('rfmChart'), {
    type: 'doughnut',
    data: {
      labels: Object.keys(tiers),
      datasets: [{ data: Object.values(tiers), backgroundColor: PALETTE, borderColor: '#0e131b', borderWidth: 2 }],
    },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom', labels: { boxWidth: 10 } } } },
  });
}

function setQueryMessage(text, isError) {
  const el = document.getElementById('queryMsg');
  el.textContent = text;
  el.className = 'playground__msg' + (isError ? ' is-error' : '');
}

async function runQuery() {
  const sql = document.getElementById('sqlInput').value;
  setQueryMessage('Running…');
  try {
    const result = await getJSON('/api/query', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sql }),
    });
    const table = document.getElementById('queryResultTable');
    table.querySelector('thead').innerHTML = '<tr>' + result.columns.map((c) => `<th>${c}</th>`).join('') + '</tr>';
    table.querySelector('tbody').innerHTML = result.rows
      .map((row) => '<tr>' + row.map((v) => `<td>${v === null ? '—' : v}</td>`).join('') + '</tr>')
      .join('');
    setQueryMessage(`${result.row_count} row(s)`);
  } catch (err) {
    setQueryMessage(err.message, true);
  }
}

document.getElementById('runQueryBtn').addEventListener('click', runQuery);

// ---------- DATA ENTRY & TAB MANAGEMENT ----------

async function loadFormOptions() {
  try {
    const opts = await getJSON('/api/form-options');
    const custSelect = document.getElementById('orderCustomer');
    const prodSelect = document.getElementById('orderProduct');

    custSelect.innerHTML = '<option value="">Select customer...</option>' +
      opts.customers.map(c => `<option value="${c.customer_id}">${c.name} (${c.segment} - ${c.region})</option>`).join('');

    prodSelect.innerHTML = '<option value="">Select product...</option>' +
      opts.products.map(p => `<option value="${p.product_id}">${p.name} — $${p.unit_price} (${p.category})</option>`).join('');
  } catch (err) {
    console.error('Failed to load form options:', err);
  }
}

function initTabs() {
  const tabBtns = document.querySelectorAll('.tab-btn');
  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      tabBtns.forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach(tc => tc.classList.remove('active'));

      btn.classList.add('active');
      const targetId = btn.getAttribute('data-tab');
      const targetTab = document.getElementById(targetId);
      if (targetTab) targetTab.classList.add('active');
    });
  });
}

function setFormMessage(msgId, text, isError = false) {
  const el = document.getElementById(msgId);
  if (!el) return;
  el.textContent = text;
  el.className = 'form-msg' + (isError ? ' is-error' : '');
}

async function reloadAllData() {
  const tasks = [
    loadKPIs, loadTrend, loadCategory, loadRegion,
    loadTopProducts, loadTopCustomers, loadRFM, runQuery
  ];
  tasks.forEach(fn => fn().catch(err => console.error(err)));
}

// Order Form Handler
document.getElementById('addOrderForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  setFormMessage('orderFormMsg', 'Submitting...');
  const customer_id = document.getElementById('orderCustomer').value;
  const product_id = document.getElementById('orderProduct').value;
  const quantity = document.getElementById('orderQty').value;
  const discount = document.getElementById('orderDiscount').value;

  try {
    const res = await getJSON('/api/add-order', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ customer_id, product_id, quantity, discount }),
    });
    setFormMessage('orderFormMsg', `Success! ${res.message} (Sales: $${res.sales}, Profit: $${res.profit})`);
    reloadAllData();
  } catch (err) {
    setFormMessage('orderFormMsg', err.message, true);
  }
});

// Product Form Handler
document.getElementById('addProductForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  setFormMessage('productFormMsg', 'Saving...');
  const name = document.getElementById('prodName').value;
  const category = document.getElementById('prodCategory').value;
  const sub_category = document.getElementById('prodSubCategory').value;
  const unit_price = document.getElementById('prodPrice').value;

  try {
    const res = await getJSON('/api/add-product', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, category, sub_category, unit_price }),
    });
    setFormMessage('productFormMsg', `Success! ${res.message}`);
    document.getElementById('addProductForm').reset();
    await loadFormOptions();
    reloadAllData();
  } catch (err) {
    setFormMessage('productFormMsg', err.message, true);
  }
});

// Customer Form Handler
document.getElementById('addCustomerForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  setFormMessage('customerFormMsg', 'Saving...');
  const name = document.getElementById('custName').value;
  const segment = document.getElementById('custSegment').value;
  const region = document.getElementById('custRegion').value;

  try {
    const res = await getJSON('/api/add-customer', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, segment, region }),
    });
    setFormMessage('customerFormMsg', `Success! ${res.message}`);
    document.getElementById('addCustomerForm').reset();
    await loadFormOptions();
    reloadAllData();
  } catch (err) {
    setFormMessage('customerFormMsg', err.message, true);
  }
});

// CSV Import Handler
document.getElementById('importCsvForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  setFormMessage('csvFormMsg', 'Importing...');
  const table_name = document.getElementById('csvTable').value;
  const fileInput = document.getElementById('csvFile');
  let csv_data = document.getElementById('csvText').value;

  if (fileInput.files && fileInput.files[0]) {
    csv_data = await fileInput.files[0].text();
  }

  if (!csv_data.trim()) {
    setFormMessage('csvFormMsg', 'Please upload a CSV file or paste CSV text.', true);
    return;
  }

  try {
    const res = await getJSON('/api/import-csv', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ table_name, csv_data }),
    });
    setFormMessage('csvFormMsg', res.message);
    document.getElementById('csvText').value = '';
    fileInput.value = '';
    await loadFormOptions();
    reloadAllData();
  } catch (err) {
    setFormMessage('csvFormMsg', err.message, true);
  }
});

// Sample Data Generator Handler
document.getElementById('genSampleDataBtn').addEventListener('click', async () => {
  setFormMessage('orderFormMsg', 'Generating sample transactions...');
  try {
    const res = await getJSON('/api/generate-sample-orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ count: 5 }),
    });
    setFormMessage('orderFormMsg', res.message);
    reloadAllData();
  } catch (err) {
    setFormMessage('orderFormMsg', err.message, true);
  }
});

// Database Reset Handler
document.getElementById('resetDbBtn').addEventListener('click', async () => {
  if (!confirm('Are you sure you want to reset the database to the original baseline dataset?')) return;
  setFormMessage('orderFormMsg', 'Resetting database...');
  try {
    const res = await getJSON('/api/reset-database', { method: 'POST' });
    setFormMessage('orderFormMsg', res.message);
    await loadFormOptions();
    reloadAllData();
  } catch (err) {
    setFormMessage('orderFormMsg', err.message, true);
  }
});

// Load Sample CSV Template Handler
document.getElementById('loadSampleCsvBtn').addEventListener('click', async () => {
  const table = document.getElementById('csvTable').value;
  setFormMessage('csvFormMsg', 'Loading sample CSV template...');
  try {
    const res = await getJSON(`/api/sample-csv?table=${encodeURIComponent(table)}`);
    document.getElementById('csvText').value = res.sample_csv;
    setFormMessage('csvFormMsg', `Sample CSV for '${table}' loaded into text box.`);
  } catch (err) {
    setFormMessage('csvFormMsg', err.message, true);
  }
});

// ---------- INITIALIZATION ----------
initTabs();
loadFormOptions();
reloadAllData();
