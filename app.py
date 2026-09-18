"""
PRISM Retail Sales Analytics Backend.
"""
import os
import sqlite3
from flask import Flask, jsonify, request, send_from_directory

import queries
from database import seed_data

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.path.join(BASE_DIR, "prism.db")
PUBLIC_DIR = os.path.join(BASE_DIR, "public")

app = Flask(__name__, static_folder=None)


def get_conn():
    conn = sqlite3.connect(DB_PATH)
    return conn


def ensure_db():
    if not os.path.exists(DB_PATH):
        print("No database found — seeding a fresh one (this happens once).")
        seed_data.main()


# ---------- static frontend ----------

@app.route("/")
def index():
    return send_from_directory(PUBLIC_DIR, "index.html")


@app.route("/<path:filename>")
def public_files(filename):
    return send_from_directory(PUBLIC_DIR, filename)


# ---------- API ----------

@app.route("/api/kpis")
def api_kpis():
    conn = get_conn()
    try:
        return jsonify(queries.get_kpis(conn))
    finally:
        conn.close()


@app.route("/api/revenue-trend")
def api_revenue_trend():
    conn = get_conn()
    try:
        return jsonify(queries.get_revenue_trend(conn))
    finally:
        conn.close()


@app.route("/api/top-products")
def api_top_products():
    limit = request.args.get("limit", 10, type=int)
    conn = get_conn()
    try:
        return jsonify(queries.get_top_products(conn, limit))
    finally:
        conn.close()


@app.route("/api/category-breakdown")
def api_category_breakdown():
    conn = get_conn()
    try:
        return jsonify(queries.get_category_breakdown(conn))
    finally:
        conn.close()


@app.route("/api/region-performance")
def api_region_performance():
    conn = get_conn()
    try:
        return jsonify(queries.get_region_performance(conn))
    finally:
        conn.close()


@app.route("/api/top-customers")
def api_top_customers():
    limit = request.args.get("limit", 10, type=int)
    conn = get_conn()
    try:
        return jsonify(queries.get_top_customers(conn, limit))
    finally:
        conn.close()


@app.route("/api/rfm")
def api_rfm():
    conn = get_conn()
    try:
        return jsonify(queries.get_rfm_segments(conn))
    finally:
        conn.close()


@app.route("/api/query", methods=["POST"])
def api_query():
    sql = (request.get_json(silent=True) or {}).get("sql", "")
    conn = get_conn()
    try:
        result = queries.run_custom_query(conn, sql)
        return jsonify(result)
    except ValueError as e:
        return jsonify({"error": str(e)}), 400
    except sqlite3.Error as e:
        return jsonify({"error": f"SQL error: {e}"}), 400
    finally:
        conn.close()


@app.route("/api/form-options")
def api_form_options():
    conn = get_conn()
    try:
        return jsonify(queries.get_form_options(conn))
    finally:
        conn.close()


@app.route("/api/add-customer", methods=["POST"])
def api_add_customer():
    data = request.get_json(silent=True) or {}
    conn = get_conn()
    try:
        res = queries.add_customer(
            conn,
            name=data.get("name"),
            segment=data.get("segment"),
            region=data.get("region"),
            join_date=data.get("join_date")
        )
        return jsonify(res)
    except Exception as e:
        return jsonify({"error": str(e)}), 400
    finally:
        conn.close()


@app.route("/api/add-product", methods=["POST"])
def api_add_product():
    data = request.get_json(silent=True) or {}
    conn = get_conn()
    try:
        res = queries.add_product(
            conn,
            name=data.get("name"),
            category=data.get("category"),
            sub_category=data.get("sub_category"),
            unit_price=data.get("unit_price")
        )
        return jsonify(res)
    except Exception as e:
        return jsonify({"error": str(e)}), 400
    finally:
        conn.close()


@app.route("/api/add-order", methods=["POST"])
def api_add_order():
    data = request.get_json(silent=True) or {}
    conn = get_conn()
    try:
        res = queries.add_order(
            conn,
            customer_id=data.get("customer_id"),
            product_id=data.get("product_id"),
            quantity=data.get("quantity"),
            discount=data.get("discount", 0.0),
            order_date=data.get("order_date"),
            ship_date=data.get("ship_date")
        )
        return jsonify(res)
    except Exception as e:
        return jsonify({"error": str(e)}), 400
    finally:
        conn.close()


@app.route("/api/import-csv", methods=["POST"])
def api_import_csv():
    data = request.get_json(silent=True) or {}
    table_name = data.get("table_name", "")
    csv_data = data.get("csv_data", "")
    conn = get_conn()
    try:
        res = queries.import_csv_data(conn, table_name, csv_data)
        return jsonify(res)
    except Exception as e:
        return jsonify({"error": str(e)}), 400
    finally:
        conn.close()


@app.route("/api/generate-sample-orders", methods=["POST"])
def api_generate_sample_orders():
    data = request.get_json(silent=True) or {}
    count = data.get("count", 5)
    conn = get_conn()
    try:
        res = queries.generate_sample_orders(conn, count=count)
        return jsonify(res)
    except Exception as e:
        return jsonify({"error": str(e)}), 400
    finally:
        conn.close()


@app.route("/api/sample-csv")
def api_sample_csv():
    table = request.args.get("table", "customers")
    try:
        csv_text = queries.get_sample_csv(table)
        return jsonify({"table": table, "sample_csv": csv_text})
    except Exception as e:
        return jsonify({"error": str(e)}), 400


@app.route("/api/reset-database", methods=["POST"])
def api_reset_database():
    try:
        seed_data.main()
        return jsonify({"message": "Database reset to original sample dataset successfully."})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


if __name__ == "__main__":
    ensure_db()
    print("PRISM Retail Analytics is running -> http://localhost:5000")
    app.run(host="0.0.0.0", port=5000, debug=True)
