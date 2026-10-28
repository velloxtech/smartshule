#!/usr/bin/env python3
"""
SmartShule - Rollback Admission Number Standardization Script
Restores previous admission numbers from backup table in a single transaction.
"""

import sys
import argparse
from datetime import datetime
import psycopg2
from dotenv import dotenv_values

def get_db_url(target="online"):
    config = dotenv_values(".env")
    if target == "online":
        url = config.get("ONLINE_DIRECT_URL") or config.get("DIRECT_URL") or config.get("DATABASE_URL")
    else:
        url = config.get("DATABASE_URL") or config.get("DIRECT_URL")
    if not url:
        raise ValueError(f"No database URL found in .env for target '{target}'")
    return url

def main():
    parser = argparse.ArgumentParser(description="Rollback admission number standardization")
    parser.add_argument("--target", choices=["online", "local"], default="online", help="Database target")
    parser.add_argument("--backup-table", required=True, help="Name of backup students table (e.g. students_backup_20261028_103000)")
    parser.add_argument("--execute", action="store_true", help="Execute rollback. If omitted, runs in dry-run mode.")
    args = parser.parse_args()

    db_url = get_db_url(args.target)
    conn = psycopg2.connect(db_url)
    cur = conn.cursor()

    print(f"[{datetime.now().isoformat()}] Connecting to {args.target} database...")

    # Check that backup table exists
    cur.execute("""
        SELECT count(*) FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = %s;
    """, (args.backup_table,))
    if cur.fetchone()[0] == 0:
        print(f"Error: Backup table '{args.backup_table}' not found in public schema!")
        sys.exit(1)

    # Check rows in backup table
    cur.execute(f"SELECT count(*), count(DISTINCT admission_number) FROM public.{args.backup_table};")
    b_count, b_distinct = cur.fetchone()
    print(f"Found {b_count} records in backup table '{args.backup_table}' ({b_distinct} distinct admission numbers).")

    if not args.execute:
        print("\n=== DRY RUN MODE ===")
        cur.execute(f"SELECT id, admission_number, first_name, last_name FROM public.{args.backup_table} LIMIT 5;")
        print("Sample backup rows that will be restored:")
        for r in cur.fetchall():
            print(f"  {r[0]}: {r[2]} {r[3]} -> {r[1]}")
        print("\nDry-run completed. Pass --execute to restore.")
        cur.close()
        conn.close()
        return

    print("\n=== EXECUTING ROLLBACK ===")
    try:
        # Two-pass restore to prevent unique constraint violations
        # Pass 1: Set temporary values
        cur.execute("UPDATE public.students SET admission_number = '__RESTORE__' || id;")

        # Pass 2: Restore from backup table
        cur.execute(f"""
            UPDATE public.students s
            SET admission_number = b.admission_number, updated_at = NOW()
            FROM public.{args.backup_table} b
            WHERE s.id = b.id;
        """)
        restored_students = cur.rowcount
        print(f"Restored {restored_students} students.")

        # Restore sponsorships if backup table exists
        sponsorship_backup_table = args.backup_table.replace("students_backup_", "student_sponsorships_backup_")
        cur.execute("""
            SELECT count(*) FROM information_schema.tables 
            WHERE table_schema = 'public' AND table_name = %s;
        """, (sponsorship_backup_table,))
        if cur.fetchone()[0] > 0:
            cur.execute(f"""
                UPDATE public.student_sponsorships sp
                SET admission_number = b.admission_number, updated_at = NOW()
                FROM public.{sponsorship_backup_table} b
                WHERE sp.id = b.id;
            """)
            print(f"Restored {cur.rowcount} sponsorships from '{sponsorship_backup_table}'.")

        conn.commit()
        print("\nSUCCESS: Rollback committed cleanly! Original admission numbers restored.")
    except Exception as e:
        conn.rollback()
        print(f"\nERROR DURING ROLLBACK: {e}")
        print("Rollback aborted and transaction rolled back.")
        sys.exit(1)
    finally:
        cur.close()
        conn.close()

if __name__ == "__main__":
    main()
