#!/usr/bin/env python3
"""
SmartShule - Admission Number Standardization Script
Standardizes learner admission numbers to clean 4-digit zero-padded numbers ('0001' - '9999').
Runs in a single transaction with two-pass collision avoidance and automatic rollback on any failure.
"""

import sys
import os
import re
import json
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

def extract_numeric_suffix(adm):
    m = re.findall(r'\d+', adm or '')
    return int(m[-1]) if m else 0

def compute_mapping(students, ordering="seniority"):
    # Seniority order: Senior classes were admitted first (Grade 4 -> 3 -> 2 -> 1 -> PP2 -> PP1 -> Playgroup)
    seniority_order = ['GRADE_4', 'GRADE_3', 'GRADE_2', 'GRADE_1', 'PP2', 'PP1', 'PLAYGROUP']
    junior_order = list(reversed(seniority_order))
    grade_order = seniority_order if ordering == "seniority" else junior_order

    def sort_key(s):
        # s: (id, admission_number, first_name, middle_name, last_name, grade_level, classroom_id, stream_id, school_id)
        grade = s[5]
        grade_rank = grade_order.index(grade) if grade in grade_order else 999
        num_suffix = extract_numeric_suffix(s[1])
        return (grade_rank, num_suffix)

    sorted_students = sorted(students, key=sort_key)
    mapping = []
    for idx, s in enumerate(sorted_students, start=1):
        new_adm = f"{idx:04d}"
        full_name = " ".join(filter(None, [s[2], s[3], s[4]]))
        mapping.append({
            "index": idx,
            "id": s[0],
            "old_adm": s[1],
            "new_adm": new_adm,
            "name": full_name,
            "grade": s[5],
            "classroom_id": s[6],
            "stream_id": s[7],
            "school_id": s[8]
        })
    return mapping

def main():
    parser = argparse.ArgumentParser(description="Standardize admission numbers in SmartShule")
    parser.add_argument("--target", choices=["online", "local"], default="online", help="Database target")
    parser.add_argument("--ordering", choices=["seniority", "junior"], default="seniority", help="Ordering strategy (seniority: Grade 4 to Playgroup)")
    parser.add_argument("--execute", action="store_true", help="Execute database changes. If omitted, runs in dry-run mode.")
    args = parser.parse_args()

    db_url = get_db_url(args.target)
    conn = psycopg2.connect(db_url)
    cur = conn.cursor()

    print(f"[{datetime.now().isoformat()}] Connecting to {args.target} database...")
    
    # Fetch existing students
    cur.execute("""
        SELECT id, admission_number, first_name, middle_name, last_name, grade_level, classroom_id, stream_id, school_id
        FROM public.students
        ORDER BY school_id, grade_level, admission_number;
    """)
    students = cur.fetchall()
    total_students = len(students)
    print(f"Total students found: {total_students}")

    # Fetch sponsorships
    cur.execute("SELECT id, student_id, admission_number FROM public.student_sponsorships;")
    sponsorships = cur.fetchall()
    print(f"Total student sponsorships found: {len(sponsorships)}")

    # Compute mapping
    mapping = compute_mapping(students, ordering=args.ordering)

    # Verification of proposed mapping
    new_adms = [m["new_adm"] for m in mapping]
    if len(new_adms) != len(set(new_adms)):
        raise RuntimeError("FATAL: Collision detected in computed mapping!")
    if len(new_adms) != total_students:
        raise RuntimeError("FATAL: Mapping length does not match total student count!")
    for adm in new_adms:
        if not re.match(r'^\d{4,}$', adm):
            raise RuntimeError(f"FATAL: Target admission number '{adm}' does not match 4+ digit numeric requirement!")

    print(f"\nComputed {len(mapping)} clean mappings ({mapping[0]['new_adm']} to {mapping[-1]['new_adm']}). Zero collisions.")

    if not args.execute:
        print("\n=== DRY RUN MODE (No changes written to database) ===")
        print("Sample mappings:")
        for m in mapping[:5]:
            print(f"  [{m['grade']}] {m['name']} ({m['id']}): '{m['old_adm']}' -> '{m['new_adm']}'")
        print("  ...")
        for m in mapping[-5:]:
            print(f"  [{m['grade']}] {m['name']} ({m['id']}): '{m['old_adm']}' -> '{m['new_adm']}'")
        
        print("\nSponsorships to update:")
        for sp in sponsorships:
            match = next((m for m in mapping if m['id'] == sp[1]), None)
            if match:
                print(f"  Sponsorship {sp[0]} ({match['name']}): '{sp[2]}' -> '{match['new_adm']}'")
        
        print("\nDry-run completed successfully. To execute live migration, pass --execute.")
        cur.close()
        conn.close()
        return

    # EXECUTE MODE: In a single atomic transaction
    print("\n=== EXECUTING LIVE MIGRATION ===")
    try:
        # 1. Create DB backup tables
        timestamp_str = datetime.now().strftime("%Y%m%d_%H%M%S")
        backup_students_table = f"students_backup_{timestamp_str}"
        backup_sponsorships_table = f"student_sponsorships_backup_{timestamp_str}"

        print(f"Creating database backup table '{backup_students_table}'...")
        cur.execute(f"CREATE TABLE {backup_students_table} AS SELECT * FROM public.students;")
        
        print(f"Creating database backup table '{backup_sponsorships_table}'...")
        cur.execute(f"CREATE TABLE {backup_sponsorships_table} AS SELECT * FROM public.student_sponsorships;")

        # 2. Export local JSON backup file
        os.makedirs("backups", exist_ok=True)
        json_backup_path = f"backups/admission_numbers_backup_{timestamp_str}.json"
        with open(json_backup_path, "w") as f:
            json.dump({
                "timestamp": timestamp_str,
                "total_students": total_students,
                "students": [
                    {"id": s[0], "admission_number": s[1], "name": f"{s[2]} {s[4]}", "grade_level": s[5]}
                    for s in students
                ],
                "sponsorships": [
                    {"id": sp[0], "student_id": sp[1], "admission_number": sp[2]}
                    for sp in sponsorships
                ],
                "mapping": mapping
            }, f, indent=2)
        print(f"JSON backup file written to '{json_backup_path}'")

        # 3. Two-Pass Update:
        # Pass 1: Set temporary collision-proof IDs
        print("Pass 1: Assigning temporary collision-proof keys to avoid unique constraint collisions...")
        for m in mapping:
            cur.execute(
                "UPDATE public.students SET admission_number = %s WHERE id = %s;",
                (f"__TMP__{m['id']}", m['id'])
            )

        # Pass 2: Assign final 4-digit standardized admission numbers
        print("Pass 2: Assigning standardized 4-digit admission numbers...")
        for m in mapping:
            cur.execute(
                "UPDATE public.students SET admission_number = %s, updated_at = NOW() WHERE id = %s;",
                (m['new_adm'], m['id'])
            )

        # 4. Synchronize student_sponsorships
        print("Updating student_sponsorships to match standardized admission numbers...")
        cur.execute("""
            UPDATE public.student_sponsorships sp
            SET admission_number = s.admission_number, updated_at = NOW()
            FROM public.students s
            WHERE sp.student_id = s.id;
        """)
        updated_sponsorships = cur.rowcount
        print(f"Updated {updated_sponsorships} sponsorship rows.")

        # 5. Strict Verification & Invariant Checks
        print("Verifying database invariants...")
        
        # Check student row count
        cur.execute("SELECT count(*), count(DISTINCT admission_number) FROM public.students;")
        cnt, distinct_cnt = cur.fetchone()
        if cnt != total_students:
            raise RuntimeError(f"Assertion failed: Count mismatch (expected {total_students}, got {cnt})")
        if distinct_cnt != total_students:
            raise RuntimeError(f"Assertion failed: Duplicate admission numbers detected ({distinct_cnt} distinct / {total_students} total)")

        # Check all are pure digits of length >= 4
        cur.execute("SELECT count(*) FROM public.students WHERE admission_number !~ '^[0-9]{4,}$';")
        invalid_fmt = cur.fetchone()[0]
        if invalid_fmt > 0:
            raise RuntimeError(f"Assertion failed: {invalid_fmt} students have invalid admission number format")

        # Check min and max
        cur.execute("SELECT min(admission_number), max(admission_number) FROM public.students;")
        min_adm, max_adm = cur.fetchone()
        if min_adm != "0001":
            raise RuntimeError(f"Assertion failed: Min admission number is {min_adm}, expected '0001'")
        if max_adm != f"{total_students:04d}":
            raise RuntimeError(f"Assertion failed: Max admission number is {max_adm}, expected '{total_students:04d}'")

        # Check sponsorships match students exactly
        cur.execute("""
            SELECT count(*) 
            FROM public.student_sponsorships sp
            JOIN public.students s ON sp.student_id = s.id
            WHERE sp.admission_number != s.admission_number;
        """)
        mismatched_sp = cur.fetchone()[0]
        if mismatched_sp > 0:
            raise RuntimeError(f"Assertion failed: {mismatched_sp} sponsorships do not match student admission numbers")

        # Commit transaction
        conn.commit()
        print(f"\nSUCCESS: Transaction committed cleanly! All {total_students} students standardized to '0001'-'{total_students:04d}'.")
        print(f"Backup table '{backup_students_table}' preserved in database.")
    except Exception as e:
        conn.rollback()
        print(f"\nERROR ENCOUNTERED: {e}")
        print("Transaction rolled back completely. No changes made to database.")
        sys.exit(1)
    finally:
        cur.close()
        conn.close()

if __name__ == "__main__":
    main()
