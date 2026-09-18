# PRISM — Retail Insights & Sales Metrics

A real, working sales-analytics tool: SQLite database → Python/Flask backend running real SQL → dashboard on top. Built so you can point to any number on the screen and explain exactly which query produced it.

## Key Features

- **Real relational database** (4 tables, foreign keys, indexes) — SQLite star schema
- **Real SQL**: `JOIN`, `GROUP BY`, aggregates, `NTILE()` window functions
- **Python backend** (Flask)
- **Interactive Data Entry & CSV Import**: Record sales transactions, register products/customers, or bulk-import CSV data
- **Sample Data Generator**: Generate random sample orders or load sample CSV templates with 1 click
- **Live SQL Playground**: Run read-only SELECT queries directly during interviews or data analysis

## How to Run

```bash
cd prism-retail-analytics
pip install -r requirements.txt
python app.py
```

Open **http://localhost:5000** in your browser. On first run, it automatically creates `prism.db` and populates synthetic retail sales data.

## Project Structure

```
prism-retail-analytics/
├── app.py               # Flask REST routes
├── queries.py           # SQL queries & data entry helpers
├── database/
│   ├── schema.sql       # CREATE TABLE statements (customers, products, orders, order_items)
│   └── seed_data.py     # Generates synthetic dataset
├── public/              # Frontend: index.html, style.css, script.js, chart.umd.min.js
└── requirements.txt     # Flask dependency
```
