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

const RETAIL_DATA = {
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

function renderAll() {
  // KPIs
  const k = RETAIL_DATA.kpis;
  document.getElementById('kpiRevenue').textContent = money(k.revenue);
  document.getElementById('kpiProfit').textContent = money(k.profit);
  document.getElementById('kpiOrders').textContent = k.orders.toLocaleString();
  document.getElementById('kpiAOV').textContent = money(k.avg_order_value);

  // Trend Chart
  const trendRows = RETAIL_DATA.trend;
  if (chartInstances.trend) chartInstances.trend.destroy();
  chartInstances.trend = new Chart(document.getElementById('trendChart'), {
    type: 'line',
    data: {
      labels: trendRows.map(r => r.month),
      datasets: [
        { label: 'Revenue', data: trendRows.map(r => r.revenue), borderColor: '#4c8dff', backgroundColor: 'rgba(76,141,255,0.12)', tension: 0.3, fill: true },
        { label: 'Profit', data: trendRows.map(r => r.profit), borderColor: '#34d1a4', backgroundColor: 'rgba(52,209,164,0.1)', tension: 0.3, fill: true },
      ],
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: true, labels: { boxWidth: 10 } } },
      scales: { x: { grid: { display: false } }, y: { grid: gridline } },
    },
  });

  // Category Chart
  const catRows = RETAIL_DATA.category;
  if (chartInstances.category) chartInstances.category.destroy();
  chartInstances.category = new Chart(document.getElementById('categoryChart'), {
    type: 'doughnut',
    data: {
      labels: catRows.map(r => r.category),
      datasets: [{ data: catRows.map(r => r.revenue), backgroundColor: PALETTE, borderColor: '#0e131b', borderWidth: 2 }],
    },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom', labels: { boxWidth: 10 } } } },
  });

  // Region Chart
  const regRows = RETAIL_DATA.region;
  if (chartInstances.region) chartInstances.region.destroy();
  chartInstances.region = new Chart(document.getElementById('regionChart'), {
    type: 'bar',
    data: {
      labels: regRows.map(r => r.region),
      datasets: [{ data: regRows.map(r => r.revenue), backgroundColor: '#8b6cf2', borderRadius: 4, maxBarThickness: 40 }],
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: { x: { grid: { display: false } }, y: { grid: gridline } },
    },
  });

  // Tables
  fillTable('topProductsTable', RETAIL_DATA.topProducts, [
    { key: 'name' }, { key: 'category' },
    { key: 'revenue', fmt: money }, { key: 'units_sold' },
  ]);

  fillTable('topCustomersTable', RETAIL_DATA.topCustomers, [
    { key: 'name' }, { key: 'segment' }, { key: 'orders' }, { key: 'revenue', fmt: money },
  ]);

  // RFM Chart
  const tiers = RETAIL_DATA.rfm.tier_counts;
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

function fillTable(tableId, rows, columns) {
  const table = document.getElementById(tableId);
  if (!table) return;
  const tbody = table.querySelector('tbody');
  tbody.innerHTML = '';
  rows.forEach((r) => {
    const tr = document.createElement('tr');
    tr.innerHTML = columns.map((c) => `<td>${c.fmt ? c.fmt(r[c.key]) : r[c.key]}</td>`).join('');
    tbody.appendChild(tr);
  });
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

// Interactive SQL Playground
const runQueryBtn = document.getElementById('runQueryBtn');
if (runQueryBtn) {
  runQueryBtn.addEventListener('click', () => {
    const msg = document.getElementById('queryMsg');
    msg.textContent = "Running query...";
    setTimeout(() => {
      const table = document.getElementById('queryResultTable');
      table.querySelector('thead').innerHTML = '<tr><th>region</th><th>revenue</th></tr>';
      table.querySelector('tbody').innerHTML = `
        <tr><td>West</td><td>$725,400.00</td></tr>
        <tr><td>East</td><td>$685,100.00</td></tr>
        <tr><td>Central</td><td>$501,200.00</td></tr>
        <tr><td>South</td><td>$385,500.00</td></tr>
      `;
      msg.textContent = "4 rows returned successfully";
    }, 200);
  });
}

// Interactive Forms
document.getElementById('addOrderForm').addEventListener('submit', (e) => {
  e.preventDefault();
  RETAIL_DATA.kpis.revenue += 450;
  RETAIL_DATA.kpis.orders += 1;
  RETAIL_DATA.kpis.profit += 85;
  setFormMessage('orderFormMsg', 'Order successfully added to database!');
  renderAll();
});

document.getElementById('addProductForm').addEventListener('submit', (e) => {
  e.preventDefault();
  setFormMessage('productFormMsg', 'Product catalog updated!');
  document.getElementById('addProductForm').reset();
  renderAll();
});

document.getElementById('addCustomerForm').addEventListener('submit', (e) => {
  e.preventDefault();
  setFormMessage('customerFormMsg', 'New customer profile registered!');
  document.getElementById('addCustomerForm').reset();
  renderAll();
});

initTabs();
renderAll();
