"""Read-only probe of the SmartCompliance database.
Prints the columns of key tables, row counts and finding distribution.
Connection settings come from environment variables; nothing is stored in the repo."""
import os
import psycopg
from psycopg import sql

DSN = dict(
    host=os.getenv("PGHOST", "127.0.0.1"),
    port=os.getenv("PGPORT", "5432"),
    dbname=os.getenv("PGDATABASE", "SmartCompliance"),
    user=os.getenv("PGUSER", "smartcompliance_app"),
    password=os.environ["PGPASSWORD"],
    connect_timeout=5,
)

TABLES = ["analysis_snapshot", "data_quality_finding", "payroll_batch", "payroll_record",
          "return_version", "payment_transaction", "payment_allocation", "compliance_finding"]

COLS = """SELECT column_name, data_type, is_nullable
          FROM information_schema.columns WHERE table_name = %s ORDER BY ordinal_position"""

def run(conn, title, query, params=None):
    print(f"\n== {title}")
    try:
        for row in conn.execute(query, params).fetchall():
            print("  ", row)
    except psycopg.Error as e:
        conn.rollback()
        print("   (failed:", str(e).splitlines()[0], ")")

with psycopg.connect(**DSN) as conn:
    conn.read_only = True          # the session cannot modify data
    for t in TABLES:
        run(conn, f"columns: {t}", COLS, (t,))
        run(conn, f"row count: {t}", sql.SQL("SELECT count(*) FROM {}").format(sql.Identifier(t)))
    run(conn, "findings by method and category",
        "SELECT detection_method, category, count(*) FROM compliance_finding GROUP BY 1,2 ORDER BY 1,2")
    run(conn, "payroll batches by status",
        "SELECT status, count(*) FROM payroll_batch GROUP BY 1")
    run(conn, "periods of payroll history per employer (top 10)",
        "SELECT employer_id, count(DISTINCT period_id) FROM payroll_batch GROUP BY 1 ORDER BY 2 DESC LIMIT 10")

