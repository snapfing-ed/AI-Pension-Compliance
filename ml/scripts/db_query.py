r"""Read-only SQL runner for exploration.  Usage: python scripts\db_query.py "SELECT ..." ["SELECT ..."]"""
import os, sys, psycopg

DSN = dict(host=os.getenv("PGHOST", "127.0.0.1"), port=os.getenv("PGPORT", "5432"),
           dbname=os.getenv("PGDATABASE", "SmartCompliance"),
           user=os.getenv("PGUSER", "smartcompliance_app"),
           password=os.environ["PGPASSWORD"], connect_timeout=5)

with psycopg.connect(**DSN) as conn:
    conn.read_only = True
    for q in sys.argv[1:]:
        print("\n>>", q)
        try:
            cur = conn.execute(q)
            print("  ", [d.name for d in cur.description])
            for row in cur.fetchall():
                print("  ", row)
        except psycopg.Error as e:
            conn.rollback()
            print("   (failed:", str(e).splitlines()[0], ")")

