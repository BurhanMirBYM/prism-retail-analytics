"""
PRISM Retail Sales Analytics Queries & Data Entry Helpers.
"""
import csv
import io
import random
import re
from datetime import date, timedelta

FORBIDDEN = re.compile(
    r"\b(insert|update|delete|drop|alter|create|replace|attach|detach|pragma|vacuum)\b",
    re.IGNORECASE,
)


def rows_to_dicts(cursor, rows):
    cols = [c[0] for c in cursor.description]
    return [dict(zip(cols, r)) for r in rows]


def get_kpis(conn):
    cur = conn.execute("""
        SELECT
            ROUND(SUM(sales), 2)          AS revenue,
            ROUND(SUM(profit), 2)         AS profit,
            COUNT(DISTINCT order_id)      AS orders,
            ROUND(SUM(sales) * 1.0 / COUNT(DISTINCT order_id), 2) AS avg_order_value
        FROM order_items;
    """)
    return rows_to_dicts(cur, cur.fetchall())[0]


def get_revenue_trend(conn):
    """Monthly revenue + profit — a GROUP BY on a formatted date."""
    cur = conn.execute("""
        SELECT
            strftime('%Y-%m', o.order_date) AS month,
            ROUND(SUM(oi.sales), 2)         AS revenue,
            ROUND(SUM(oi.profit), 2)        AS profit
        FROM order_items oi
        JOIN orders o ON o.order_id = oi.order_id
        GROUP BY month
        ORDER BY month;
    """)
    return rows_to_dicts(cur, cur.fetchall())


def get_top_products(conn, limit=10):
    cur = conn.execute("""
        SELECT
            p.name, p.category,
            ROUND(SUM(oi.sales), 2)  AS revenue,
            ROUND(SUM(oi.profit), 2) AS profit,
            SUM(oi.quantity)         AS units_sold
        FROM order_items oi
        JOIN products p ON p.product_id = oi.product_id
        GROUP BY p.product_id
        ORDER BY revenue DESC
        LIMIT ?;
    """, (limit,))
    return rows_to_dicts(cur, cur.fetchall())


def get_category_breakdown(conn):
    cur = conn.execute("""
        SELECT
            p.category,
            ROUND(SUM(oi.sales), 2)  AS revenue,
            ROUND(SUM(oi.profit), 2) AS profit,
            ROUND(SUM(oi.profit) * 100.0 / SUM(oi.sales), 1) AS margin_pct
        FROM order_items oi
        JOIN products p ON p.product_id = oi.product_id
        GROUP BY p.category
        ORDER BY revenue DESC;
    """)
    return rows_to_dicts(cur, cur.fetchall())


def get_region_performance(conn):
    cur = conn.execute("""
        SELECT
            o.region,
            ROUND(SUM(oi.sales), 2)   AS revenue,
            ROUND(SUM(oi.profit), 2)  AS profit,
            COUNT(DISTINCT o.order_id) AS orders
        FROM order_items oi
        JOIN orders o ON o.order_id = oi.order_id
        GROUP BY o.region
        ORDER BY revenue DESC;
    """)
    return rows_to_dicts(cur, cur.fetchall())


def get_top_customers(conn, limit=10):
    cur = conn.execute("""
        SELECT
            c.name, c.segment, c.region,
            COUNT(DISTINCT o.order_id) AS orders,
            ROUND(SUM(oi.sales), 2)    AS revenue
        FROM order_items oi
        JOIN orders o ON o.order_id = oi.order_id
        JOIN customers c ON c.customer_id = o.customer_id
        GROUP BY c.customer_id
        ORDER BY revenue DESC
        LIMIT ?;
    """, (limit,))
    return rows_to_dicts(cur, cur.fetchall())


def get_rfm_segments(conn):
    cur = conn.execute("""
        WITH per_customer AS (
            SELECT
                c.customer_id, c.name,
                (SELECT CAST(julianday((SELECT MAX(order_date) FROM orders)) -
                             julianday(MAX(o.order_date)) AS INTEGER)) AS recency_days,
                COUNT(DISTINCT o.order_id) AS frequency,
                ROUND(SUM(oi.sales), 2)    AS monetary
            FROM customers c
            JOIN orders o ON o.customer_id = c.customer_id
            JOIN order_items oi ON oi.order_id = o.order_id
            GROUP BY c.customer_id
        ),
        scored AS (
            SELECT *,
                NTILE(4) OVER (ORDER BY recency_days ASC)  AS r_score,
                NTILE(4) OVER (ORDER BY frequency DESC)    AS f_score,
                NTILE(4) OVER (ORDER BY monetary DESC)     AS m_score
            FROM per_customer
        )
        SELECT
            customer_id, name, recency_days, frequency, monetary,
            r_score, f_score, m_score,
            (r_score + f_score + m_score) AS rfm_total
        FROM scored
        ORDER BY rfm_total DESC;
    """)
    records = rows_to_dicts(cur, cur.fetchall())

    def label(rec):
        total = rec["rfm_total"]
        if total >= 10:
            return "Champions"
        if total >= 8:
            return "Loyal"
        if total >= 5:
            return "At Risk"
        return "Lost"

    for rec in records:
        rec["tier"] = label(rec)

    tiers = {"Champions": 0, "Loyal": 0, "At Risk": 0, "Lost": 0}
    for rec in records:
        tiers[rec["tier"]] += 1

    return {"customers": records[:50], "tier_counts": tiers}


def run_custom_query(conn, sql, max_rows=200):
    stripped = sql.strip().rstrip(";")
    if not re.match(r"^\s*SELECT\b", stripped, re.IGNORECASE):
        raise ValueError("Only SELECT statements are allowed.")
    if FORBIDDEN.search(stripped):
        raise ValueError("Query contains a disallowed keyword.")
    if ";" in stripped:
        raise ValueError("Only a single statement is allowed.")

    cur = conn.execute(f"SELECT * FROM ({stripped}) LIMIT ?", (max_rows,))
    rows = cur.fetchall()
    cols = [c[0] for c in cur.description]
    return {"columns": cols, "rows": [list(r) for r in rows], "row_count": len(rows)}


def get_form_options(conn):
    cur_cust = conn.execute("SELECT customer_id, name, segment, region FROM customers ORDER BY name ASC;")
    customers = rows_to_dicts(cur_cust, cur_cust.fetchall())

    cur_prod = conn.execute("SELECT product_id, name, category, sub_category, unit_price FROM products ORDER BY name ASC;")
    products = rows_to_dicts(cur_prod, cur_prod.fetchall())

    return {
        "customers": customers,
        "products": products,
        "segments": ["Consumer", "Corporate", "Home Office"],
        "regions": ["North", "South", "East", "West"],
        "categories": ["Furniture", "Office Supplies", "Technology"]
    }


def add_customer(conn, name, segment, region, join_date=None):
    if not name or not segment or not region:
        raise ValueError("Name, segment, and region are required.")
    if not join_date:
        join_date = date.today().isoformat()
    cur = conn.cursor()
    cur.execute(
        "INSERT INTO customers (name, segment, region, join_date) VALUES (?, ?, ?, ?);",
        (name.strip(), segment.strip(), region.strip(), join_date.strip())
    )
    cid = cur.lastrowid
    conn.commit()
    return {"customer_id": cid, "message": "Customer added successfully"}


def add_product(conn, name, category, sub_category, unit_price):
    if not name or not category or not sub_category:
        raise ValueError("Name, category, and sub-category are required.")
    try:
        price = float(unit_price)
        if price <= 0:
            raise ValueError()
    except Exception:
        raise ValueError("Unit price must be a positive number.")

    cur = conn.cursor()
    cur.execute(
        "INSERT INTO products (name, category, sub_category, unit_price) VALUES (?, ?, ?, ?);",
        (name.strip(), category.strip(), sub_category.strip(), price)
    )
    pid = cur.lastrowid
    conn.commit()
    return {"product_id": pid, "message": "Product added successfully"}


def add_order(conn, customer_id, product_id, quantity, discount=0.0, order_date=None, ship_date=None):
    cur = conn.cursor()
    cur.execute("SELECT region FROM customers WHERE customer_id = ?;", (customer_id,))
    c_row = cur.fetchone()
    if not c_row:
        raise ValueError("Selected customer does not exist.")
    region = c_row[0]

    cur.execute("SELECT unit_price FROM products WHERE product_id = ?;", (product_id,))
    p_row = cur.fetchone()
    if not p_row:
        raise ValueError("Selected product does not exist.")
    unit_price = p_row[0]

    try:
        qty = int(quantity)
        disc = float(discount)
        if qty <= 0 or disc < 0 or disc > 1:
            raise ValueError()
    except Exception:
        raise ValueError("Quantity must be >= 1 and discount must be between 0 and 1 (e.g. 0.10 for 10%).")

    if not order_date:
        order_date = date.today().isoformat()
    if not ship_date:
        ship_date = (date.today() + timedelta(days=3)).isoformat()

    sales = round(unit_price * qty * (1 - disc), 2)
    margin = 0.20 - (disc * 0.5)
    profit = round(sales * margin, 2)

    cur.execute(
        "INSERT INTO orders (customer_id, order_date, ship_date, region) VALUES (?, ?, ?, ?);",
        (customer_id, order_date, ship_date, region)
    )
    order_id = cur.lastrowid

    cur.execute(
        "INSERT INTO order_items (order_id, product_id, quantity, discount, sales, profit) VALUES (?, ?, ?, ?, ?, ?);",
        (order_id, product_id, qty, disc, sales, profit)
    )
    conn.commit()

    return {"order_id": order_id, "sales": sales, "profit": profit, "message": "Order placed successfully"}


def import_csv_data(conn, table_name, csv_text):
    valid_tables = ["customers", "products", "orders", "order_items"]
    if table_name not in valid_tables:
        raise ValueError(f"Invalid target table. Must be one of: {', '.join(valid_tables)}")

    f = io.StringIO(csv_text.strip())
    reader = csv.DictReader(f)
    if not reader.fieldnames:
        raise ValueError("CSV header missing or empty.")

    inserted_count = 0
    cur = conn.cursor()

    for row in reader:
        cols = [c.strip() for c in row.keys() if c and row[c] is not None]
        vals = [row[c].strip() for c in cols]
        placeholders = ", ".join(["?"] * len(cols))
        col_names = ", ".join(cols)

        sql = f"INSERT INTO {table_name} ({col_names}) VALUES ({placeholders})"
        cur.execute(sql, vals)
        inserted_count += 1

    conn.commit()
    return {"inserted_count": inserted_count, "table": table_name, "message": f"Successfully imported {inserted_count} row(s) into {table_name}."}


SAMPLE_CSVS = {
    "customers": (
        "name,segment,region,join_date\n"
        "Alex Rivera,Consumer,North,2024-01-15\n"
        "Samantha Chen,Corporate,East,2024-02-20\n"
        "Marcus Vance,Home Office,West,2024-03-10\n"
        "Elena Rostova,Consumer,South,2024-04-05"
    ),
    "products": (
        "name,category,sub_category,unit_price\n"
        "UltraWide Monitor 34,Technology,Accessories,499.99\n"
        "Ergonomic Standing Desk,Furniture,Tables,649.00\n"
        "Executive Leather Chair,Furniture,Chairs,280.50\n"
        "Wireless Noise-Canceling Headset,Technology,Accessories,129.95"
    ),
    "orders": (
        "customer_id,order_date,ship_date,region\n"
        "1,2024-05-01,2024-05-04,North\n"
        "2,2024-05-02,2024-05-05,East\n"
        "3,2024-05-03,2024-05-06,West"
    ),
    "order_items": (
        "order_id,product_id,quantity,discount,sales,profit\n"
        "1,1,2,0.05,949.98,142.50\n"
        "2,2,1,0.10,584.10,87.62\n"
        "3,3,3,0.00,841.50,168.30"
    )
}


def get_sample_csv(table_name):
    if table_name not in SAMPLE_CSVS:
        raise ValueError(f"No sample CSV available for table: {table_name}")
    return SAMPLE_CSVS[table_name]


def generate_sample_orders(conn, count=5):
    cur = conn.cursor()
    cur.execute("SELECT customer_id, region FROM customers;")
    customers = cur.fetchall()
    if not customers:
        raise ValueError("No customers found in database to generate orders.")

    cur.execute("SELECT product_id, unit_price FROM products;")
    products = cur.fetchall()
    if not products:
        raise ValueError("No products found in database to generate orders.")

    created_orders = []
    today = date.today()

    for i in range(count):
        cust_id, region = random.choice(customers)
        prod_id, unit_price = random.choice(products)
        qty = random.randint(1, 5)
        disc = random.choice([0.0, 0.05, 0.10, 0.15])

        order_days_ago = random.randint(0, 30)
        order_date = (today - timedelta(days=order_days_ago)).isoformat()
        ship_date = (today - timedelta(days=max(0, order_days_ago - 3))).isoformat()

        sales = round(unit_price * qty * (1 - disc), 2)
        margin = 0.20 - (disc * 0.5)
        profit = round(sales * margin, 2)

        cur.execute(
            "INSERT INTO orders (customer_id, order_date, ship_date, region) VALUES (?, ?, ?, ?);",
            (cust_id, order_date, ship_date, region)
        )
        order_id = cur.lastrowid

        cur.execute(
            "INSERT INTO order_items (order_id, product_id, quantity, discount, sales, profit) VALUES (?, ?, ?, ?, ?, ?);",
            (order_id, prod_id, qty, disc, sales, profit)
        )
        created_orders.append({"order_id": order_id, "sales": sales, "profit": profit})

    conn.commit()
    total_sales = round(sum(o["sales"] for o in created_orders), 2)
    return {
        "count": len(created_orders),
        "total_sales": total_sales,
        "message": f"Successfully generated {len(created_orders)} sample transactions ($ {total_sales:,.2f} total revenue)."
    }
