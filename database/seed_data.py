"""
Generates a realistic (synthetic) retail dataset and loads it into prism.db.
Run directly (`python database/seed_data.py`) to (re)build the database,
or it's called automatically by app.py on first run.

Uses only Python's standard library (sqlite3, random, datetime) —
no pip packages needed for this part.
"""
import sqlite3
import random
import os
from datetime import date, timedelta

random.seed(42)  # deterministic: same "random" data every time you run this

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DB_PATH = os.path.join(BASE_DIR, "prism.db")
SCHEMA_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "schema.sql")

FIRST_NAMES = ["Aarav", "Riya", "Zoya", "Arjun", "Meera", "Kabir", "Sana", "Vihaan",
               "Aisha", "Rohan", "Diya", "Karan", "Ishaan", "Neha", "Yusuf", "Priya",
               "Aditya", "Fatima", "Vivaan", "Ananya"]
LAST_NAMES = ["Sharma", "Khan", "Patel", "Verma", "Gupta", "Iqbal", "Reddy", "Malik",
              "Chowdhury", "Nair", "Rao", "Bhatt", "Sheikh", "Das", "Mehta"]
SEGMENTS = ["Consumer", "Corporate", "Home Office"]
REGIONS = ["North", "South", "East", "West"]

CATALOG = {
    "Technology": {
        "Phones": ["Smartphone X12", "Smartphone Lite", "5G Flagship"],
        "Laptops": ["UltraBook 14", "Gaming Laptop Pro", "Budget Notebook"],
        "Accessories": ["Wireless Mouse", "Mechanical Keyboard", "USB-C Hub"],
    },
    "Furniture": {
        "Chairs": ["Ergo Office Chair", "Study Chair", "Recliner"],
        "Tables": ["Study Table", "Conference Table", "Coffee Table"],
        "Storage": ["Bookshelf", "Filing Cabinet", "Wardrobe"],
    },
    "Office Supplies": {
        "Paper": ["A4 Ream", "Sticky Notes Pack", "Notebook Set"],
        "Binders": ["Ring Binder", "Lever Arch File", "Report Cover"],
        "Art": ["Marker Set", "Sketch Pad", "Poster Board"],
    },
}

PRICE_RANGE = {
    "Phones": (180, 900), "Laptops": (400, 1600), "Accessories": (8, 60),
    "Chairs": (60, 320), "Tables": (90, 500), "Storage": (70, 400),
    "Paper": (3, 15), "Binders": (2, 12), "Art": (4, 25),
}


def build_customers(n=400):
    customers = []
    start = date(2023, 1, 1)
    for cid in range(1, n + 1):
        name = f"{random.choice(FIRST_NAMES)} {random.choice(LAST_NAMES)}"
        join_offset = random.randint(0, 600)
        customers.append((
            cid, name, random.choice(SEGMENTS), random.choice(REGIONS),
            (start + timedelta(days=join_offset)).isoformat(),
        ))
    return customers


def build_products():
    products = []
    pid = 1
    for category, subs in CATALOG.items():
        for sub_category, names in subs.items():
            lo, hi = PRICE_RANGE[sub_category]
            for name in names:
                price = round(random.uniform(lo, hi), 2)
                products.append((pid, name, category, sub_category, price))
                pid += 1
    return products


def seasonal_weight(d: date) -> float:
    """More orders in Nov/Dec (holiday season), fewer in Feb — like a real retailer."""
    if d.month in (11, 12):
        return 1.8
    if d.month == 2:
        return 0.6
    return 1.0


def build_orders_and_items(customers, products, days=730):
    orders, items = [], []
    order_id, item_id = 1, 1
    end = date(2026, 9, 14)
    start = end - timedelta(days=days)
    d = start
    while d <= end:
        weight = seasonal_weight(d)
        n_orders_today = max(0, int(random.gauss(6 * weight, 2)))
        for _ in range(n_orders_today):
            cust = random.choice(customers)
            ship = d + timedelta(days=random.randint(1, 5))
            orders.append((order_id, cust[0], d.isoformat(), ship.isoformat(), cust[3]))

            for _ in range(random.randint(1, 4)):
                prod = random.choice(products)
                qty = random.randint(1, 5)
                discount = random.choice([0.0, 0.0, 0.0, 0.1, 0.15, 0.2])
                unit_price = prod[4]
                sales = round(unit_price * qty * (1 - discount), 2)
                margin = random.uniform(0.05, 0.35) - (discount * 0.5)
                profit = round(sales * margin, 2)
                items.append((item_id, order_id, prod[0], qty, discount, sales, profit))
                item_id += 1
            order_id += 1
        d += timedelta(days=1)
    return orders, items


def main():
    conn = sqlite3.connect(DB_PATH)
    conn.executescript("""
        DROP TABLE IF EXISTS order_items;
        DROP TABLE IF EXISTS orders;
        DROP TABLE IF EXISTS products;
        DROP TABLE IF EXISTS customers;
    """)
    with open(SCHEMA_PATH) as f:
        conn.executescript(f.read())

    customers = build_customers()
    products = build_products()
    orders, items = build_orders_and_items(customers, products)

    conn.executemany("INSERT INTO customers VALUES (?,?,?,?,?)", customers)
    conn.executemany("INSERT INTO products VALUES (?,?,?,?,?)", products)
    conn.executemany("INSERT INTO orders VALUES (?,?,?,?,?)", orders)
    conn.executemany("INSERT INTO order_items VALUES (?,?,?,?,?,?,?)", items)
    conn.commit()

    print(f"Seeded {DB_PATH}")
    print(f"  customers:   {len(customers)}")
    print(f"  products:    {len(products)}")
    print(f"  orders:      {len(orders)}")
    print(f"  order_items: {len(items)}")
    conn.close()


if __name__ == "__main__":
    main()
