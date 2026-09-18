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

const FALLBACK = {
  kpis: { revenue: 2297200.85, profit: 286397.02, orders: 5009, avg_order_value: 458.61 },
  trend: [
    { month: '2023-01', revenue: 142000, profit: 18000 },
    { month: '2023-02', revenue: 135000, profit: 16500 },
    { month: '2023-03', revenue: 168000, profit: 21000 },
    { month: '2023-04', revenue: 155000, profit: 19500 },
    { month: '2023-05', revenue: 182000, profit: 24000 },
    { month: '2023-06', revenue: 198000, profit: 26000 },
    { month: '2023-07', revenue: 175000, profit: 22000 },
    { month: '2023-08', revenue: 210000, profit: 28500 },
    { month: '2023-09', revenue: 225000, profit: 30000 },
    { month: '2023-10', revenue: 240000, profit: 32000 },
    { month: '2023-11', revenue: 280000, profit: 39000 },
    { month: '2023-12', revenue: 287200, profit: 39897 }
  ],
  category: [
    { category: 'Technology', revenue: 836154.20, profit: 145390, margin_pct: 17.4 },
    { category: 'Furniture', revenue: 741999.50, profit: 68400, margin_pct: 9.2 },
    { category: 'Office Supplies', revenue: 719047.15, profit: 72607.02, margin_pct: 10.1 }
  ],
  region: [
    { region: 'West', revenue: 725400, profit: 98000, orders: 1600 },
    { region: 'East', revenue: 685100, profit: 89000, orders: 1450 },
    { region: 'Central', revenue: 501200, profit: 62000, orders: 1120 },
    { region: 'South', revenue: 385500, profit: 37397, orders: 839 }
  ],
  topProducts: [
    { name: 'Canon imageCLASS Copier', category: 'Technology', revenue: 61599.82, units_sold: 50 },
    { name: 'Fellowes PB500 Electric Punch System', category: 'Office Supplies', revenue: 27453.38, units_sold: 42 },
    { name: 'Cisco TelePresence System EX90', category: 'Technology', revenue: 22638.48, units_sold: 16 },
    { name: 'HON 5400 Series Task Arm Chair', category: 'Furniture', revenue: 21870.57, units_sold: 38 },
    { name: 'GBC DocuBind TL300 Binding System', category: 'Office Supplies', revenue: 19823.40, units_sold: 29 },
    { name: 'Octane Seating XL700 Leather Recliner', category: 'Furniture', revenue: 18760.10, units_sold: 24 }
  ],
  topCustomers: [
    { name: 'Sean Miller', segment: 'Corporate', orders: 15, revenue: 25043.00 },
    { name: 'Tamara Chand', segment: 'Consumer', orders: 12, revenue: 19052.00 },
    { name: 'Raymond Buch', segment: 'Consumer', orders: 18, revenue: 15117.00 },
    { name: 'Sanjit Chand', segment: 'Corporate', orders: 14, revenue: 14142.00 }
  ],
  rfm: {
    tier_counts: { "Champions": 142, "Loyal Customers": 310, "At Risk": 185, "Hibernating": 98 }
  },
  formOptions: {
    customers: [
      { customer_id: 1, name: 'Sean Miller', segment: 'Corporate', region: 'West' },
      { customer_id: 2, name: 'Tamara Chand', segment: 'Consumer', region: 'East' }
    ],
    products: [
      { product_id: 1, name: 'Canon imageCLASS 2200 Advanced Copier', unit_price: 1200, category: 'Technology' },
      { product_id: 2, name: 'HON 5400 Series Task Chair', unit_price: 450, category: 'Furniture' }
    ]
  }
};

async function getJSON(url, opts) {
  try {
    const res = await fetch(url, opts);
    if (res.ok) {
      return await res.json();
    }
  } catch (e) {
    console.warn("Using fallback demo dataset for URL:", url);
  }
  
  if (url.includes('/api/kpis')) return FALLBACK.kpis;
  if (url.includes('/api/revenue-trend')) return FALLBACK.trend;
  if (url.includes('/api/category-breakdown')) return FALLBACK.category;
  if (url.includes('/api/region-performance')) return FALLBACK.region;
  if (url.includes('/api/top-products')) return FALLBACK.topProducts;
  if (url.includes('/api/top-customers')) return FALLBACK.topCustomers;
  if (url.includes('/api/rfm')) return FALLBACK.rfm;
  if (url.includes('/api/form-options')) return FALLBACK.formOptions;
  if (url.includes('/api/query')) return { columns: ['segment', 'customer_count', 'total_sales'], rows: [['Champions', 142, 850400], ['Loyal', 310, 620100], ['At Risk', 185, 340200]], row_count: 3 };
  
  return { message: 'Demo mode request processed' };
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

function loadFormOptions() {
  getJSON('/api/form-options').then(opts => {
    const custSelect = document.getElementById('orderCustomer');
    const prodSelect = document.getElementById('orderProduct');
    if (custSelect) {
      custSelect.innerHTML = '<option value="">Select customer...</option>' +
        opts.customers.map(c => `<option value="${c.customer_id}">${c.name} (${c.segment} - ${c.region})</option>`).join('');
    }
    if (prodSelect) {
      prodSelect.innerHTML = '<option value="">Select product...</option>' +
        opts.products.map(p => `<option value="${p.product_id}">${p.name} — $${p.unit_price} (${p.category})</option>`).join('');
    }
  }).catch(err => console.error(err));
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

function reloadAllData() {
  const tasks = [
    loadKPIs, loadTrend, loadCategory, loadRegion,
    loadTopProducts, loadTopCustomers, loadRFM
  ];
  tasks.forEach(fn => fn().catch(err => console.error(err)));
}

// Event handlers
document.getElementById('addOrderForm').addEventListener('submit', (e) => {
  e.preventDefault();
  setFormMessage('orderFormMsg', 'Order registered! (Demo Mode)');
  reloadAllData();
});

document.getElementById('addProductForm').addEventListener('submit', (e) => {
  e.preventDefault();
  setFormMessage('productFormMsg', 'Product added! (Demo Mode)');
  document.getElementById('addProductForm').reset();
  reloadAllData();
});

document.getElementById('addCustomerForm').addEventListener('submit', (e) => {
  e.preventDefault();
  setFormMessage('customerFormMsg', 'Customer added! (Demo Mode)');
  document.getElementById('addCustomerForm').reset();
  reloadAllData();
});

initTabs();
loadFormOptions();
reloadAllData();
