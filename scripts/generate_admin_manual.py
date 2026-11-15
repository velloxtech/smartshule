#!/usr/bin/env python3
"""
Generates SmartShule_Administrator_Director_Manual.docx
Comprehensive strategic and operational manual for School Directors and Administrators.
"""

import os
import sys
from docx.shared import Inches, Pt, RGBColor
from manual_engine import (
    create_base_document, add_cover_page, add_heading_1, add_heading_2, add_heading_3,
    add_body_p, add_bullet_item, add_callout, add_screenshot, add_styled_table,
    DOCS_DIR
)

def build_admin_manual():
    doc = create_base_document("Administrator & Director Strategic Manual")
    
    # 1. Cover Page
    add_cover_page(
        doc,
        main_title="Administrator & Director Manual",
        subtitle="Institutional Governance, Academic Configuration, Financial Engineering, and System Administration",
        audience="School Directors, Board of Management, Headteacher, Deputy Headteacher & Authorized School Administrators",
        manual_code="SMART-MAN-ADM-2026-V1"
    )
    
    # 2. Table of Contents
    add_heading_1(doc, "Table of Contents")
    toc_data = [
        ["PART A: EXECUTIVE OVERSIGHT & DASHBOARDS", ""],
        ["Chapter 1: Institutional Governance Overview", "Architecture, multi-role security, and executive oversight"],
        ["Chapter 2: Director Executive Dashboard", "Real-time enrollment, revenue collection, attendance rates, and KPI cards"],
        ["Chapter 3: System Health, Real-Time Monitoring & Alerts", "Operational notifications, pending task queues, and automated audit checks"],
        ["PART B: STUDENT & GUARDIAN ADMINISTRATION", ""],
        ["Chapter 4: Student Onboarding & Admissions Pipeline", "Slot applications, admissions review, and digital onboarding queue"],
        ["Chapter 5: The 'Admit New Learner' Workflow", "Step-by-step learner enrollment, bio-data, birth certs, and admission numbers"],
        ["Chapter 6: Learner Records, Classes & Stream Placement", "Cohort management, classroom capacities, and transfer between streams"],
        ["Chapter 7: Guardian & Parent Account Linking", "Linking guardians to learners, multi-child associations, and portal access"],
        ["Chapter 8: Promotions, Archive Vault & Student Exits", "Annual cohort promotion, balance rollover, and archived data retrieval"],
        ["PART C: STAFF & PAYROLL ADMINISTRATION", ""],
        ["Chapter 9: The 'Onboard Staff' Workflow", "Recruiting faculty and non-teaching personnel, vetting, and profile setup"],
        ["Chapter 10: Role-Based Access Control (RBAC) Administration", "Assigning granular permissions: Super Admin, Admin, Headteacher, Bursar, Teacher"],
        ["Chapter 11: Faculty Attendance & Geofence Clock-In", "Monitoring teacher arrival times, physical campus boundaries, and rosters"],
        ["Chapter 12: Staff Payroll Processing & Salary Disbursement", "Salary computation, allowances, statutory deductions, and payslip generation"],
        ["Chapter 13: Salary Disbursement Logging & Acknowledgement Review", "Recording bank/M-Pesa transfers and auditing faculty digital signatures"],
        ["PART D: ACADEMIC & CBC CURRICULUM GOVERNANCE", ""],
        ["Chapter 14: Academic Calendar & Term Initialization", "Strictly restricted setup of academic years, terms, and auto-billing dates"],
        ["Chapter 15: Classes, Streams & Curriculum Mapping", "Configuring playgroup to junior school grades and subject allocations"],
        ["Chapter 16: KICD Rationalized CBC Curriculum Management", "Learning areas, strands, sub-strands, and competency rubric matrices"],
        ["Chapter 17: Examination Management & Moderation Oversight", "Opening examination windows, deadline enforcement, and lock controls"],
        ["Chapter 18: Reviewing Teacher Submissions & Academic Broadsheets", "Auditing uploaded marks, teacher remark consistency, and class rankings"],
        ["Chapter 19: Term Report Card Generation & Endorsement", "Batch PDF report generation, headteacher comments, and institutional sealing"],
        ["PART E: FINANCIAL ENGINEERING & LEDGER OVERSIGHT", ""],
        ["Chapter 20: Fee Structures & Term Billing Rates", "Configuring tuition, lunch, activities, and grade-specific fee components"],
        ["Chapter 21: Student Fee Invoicing & Automated Billing Engine", "Batch term billing, individual student invoices, and carry-forward debt"],
        ["Chapter 22: Student Fee Accounts & Payment Reconciliation", "Billed liabilities, payments received, overpayments, and balance tracking"],
        ["Chapter 23: Overpayment Handling & Fee Credit Application", "Automated credit rollovers, offsetting subsequent terms, and credit receipts"],
        ["Chapter 24: Payment Verification & Transaction Reversals", "Auditing cashier receipts, managing error corrections, and reversal approval"],
        ["Chapter 25: Institutional Financial Reports & Statements", "Income & expenditure, revenue collection efficiency, and cash flow ledgers"],
        ["PART F: STORES, INVENTORY & ASSET MANAGEMENT", ""],
        ["Chapter 26: Fixed Asset Registration & Depreciation", "Physical asset registry, location tracking, and institutional inventory"],
        ["Chapter 27: Consumables & Stock Movement Auditing", "Deliveries received, department issuance logs, and reorder alerts"],
        ["Chapter 28: Purchase Requisitions & Approval Workflows", "Procurement requests, budget compliance checks, and approval queues"],
        ["PART G: PARENT ENGAGEMENT & INSTITUTIONAL SECURITY", ""],
        ["Chapter 29: Official School Announcements & Audience Targeting", "Publishing circulars with role isolation (Parents, Staff, All)"],
        ["Chapter 30: Parent Consent Management & Verification", "Authorizing trips, sports, medical consents, and auditing digital signatures"],
        ["Chapter 31: User Account Administration & Access Revocation", "Creating accounts, resetting credentials, and deactivating former staff"],
        ["Chapter 32: System Audit Logs & Data Protection Compliance", "Tracking all system changes, IP addresses, timestamps, and database backups"],
        ["Appendix: Administrative & Legal Reference Guide", "Regulatory statutory requirements and technical architecture specs"]
    ]
    add_styled_table(doc, ["Chapter / Operational Module", "Governance Focus"], toc_data, [Inches(3.2), Inches(3.6)])

    # PART A
    add_heading_1(doc, "PART A: EXECUTIVE OVERSIGHT & DASHBOARDS")
    
    add_heading_2(doc, "Chapter 1: Institutional Governance Overview")
    add_body_p(doc, "SmartShule provides executive leadership at Grace Seeds School—including the School Director, Board of Management, Headteacher, and Senior Administrators—with complete administrative visibility over every facet of school operations. Designed with a clean hexagonal architecture, the platform unifies student records, academic grading, fee collection, staff payroll, inventory control, and parental communication into a single, tamper-evident institutional database.")
    add_body_p(doc, "Multi-Tiered Administrative Hierarchy:")
    add_bullet_item(doc, "1. Super Administrator (Director / System Lead):", "Unrestricted global authority across all campuses, academic terms, database configurations, fee structures, payroll records, and user permissions.")
    add_bullet_item(doc, "2. School Administrator / Headteacher:", "Full operational control over student admissions, staff assignments, academic terms, fee billing, examination moderation, report card endorsement, and notice board publishing.")
    add_bullet_item(doc, "3. Deputy Headteacher:", "Curriculum oversight, faculty attendance tracking, timetable allocation, teacher lesson plan approval, and student discipline monitoring.")

    add_heading_2(doc, "Chapter 2: Director Executive Dashboard")
    add_body_p(doc, "Upon signing in with an administrative profile, leadership is presented with the Director Executive Dashboard. This command center displays high-level key performance indicators (KPIs) calculated in real time directly from the underlying ledger and student registers.")
    add_body_p(doc, "Core Executive Metrics:")
    add_bullet_item(doc, "Total Enrollment & Capacity:", "Active student census categorized by education level (Playgroup, Pre-Primary, Lower Primary, Upper Primary, and Junior School) alongside gender distributions.")
    add_bullet_item(doc, "Financial Collection Efficiency:", "Real-time fee collection rate (e.g., 92.1%), total invoiced revenue, verified cash collected, and aggregate outstanding balance.")
    add_bullet_item(doc, "Campus Attendance Health:", "Today's learner attendance percentage, total present, unexcused absentees, and faculty presence rate.")
    add_bullet_item(doc, "Active Operational Alerts:", "Immediate notifications regarding pending admissions, unverified forwarded payments, low inventory supplies, and pending teacher lesson plans.")

    add_screenshot(doc, "admin_01_executive_dashboard.png", "3.1", "Director Executive Operations Dashboard", "High-level management cockpit displaying enrollment totals, fee collection velocity, attendance percentages, and pending administrative queues.")

    add_heading_2(doc, "Chapter 3: System Health, Real-Time Monitoring & Alerts")
    add_body_p(doc, "The top navigation bar features real-time badge counters that alert administrators whenever attention is required. Red and amber badges indicate pending forwarded payments awaiting verification, unreviewed slot applications, or student admissions pending clearance. Clicking any alert routes leadership directly to the relevant review queue.")

    # PART B
    add_heading_1(doc, "PART B: STUDENT & GUARDIAN ADMINISTRATION")

    add_heading_2(doc, "Chapter 4: Student Onboarding & Admissions Pipeline")
    add_body_p(doc, "The 'Admissions & Enrolment Hub' manages prospective students from initial inquiry through application review, placement assessment, and final enrollment.")
    add_body_p(doc, "The Admissions Pipeline Stages:")
    add_bullet_item(doc, "1. Slot Applications:", "Online applications submitted by parents through the public school portal.")
    add_bullet_item(doc, "2. Application Review:", "Registrar verification of submitted birth certificates, previous school report cards, and immunization records.")
    add_bullet_item(doc, "3. Entrance Assessment:", "Recording candidate evaluation scores for class readiness.")
    add_bullet_item(doc, "4. Onboard Queue:", "Vetted learners ready for official admission number assignment and class stream allocation.")

    add_screenshot(doc, "admin_02_admissions_hub.png", "3.2", "Admissions & Enrolment Management Hub", "Centralized applicant tracking interface showing pending slot applications, candidate review status, and admission statistics.")

    add_heading_2(doc, "Chapter 5: The 'Admit New Learner' Workflow")
    add_body_p(doc, "When a learner is formally accepted, administrators execute the official 'Admit New Learner' workflow under 'Admissions & Enrolment':")
    add_body_p(doc, "Step-by-Step Enrollment Procedure:")
    add_bullet_item(doc, "Step 1 - Basic Bio-Data:", "Enter First Name, Middle Name, Surname, Gender, and Date of Birth.")
    add_bullet_item(doc, "Step 2 - Institutional Placement:", "Assign the Admission Number (format: GSS-YYYY-XXXX, e.g., GSS-2026-0042), Admission Date, Academic Grade (e.g., Grade 3), and Stream (e.g., East).")
    add_bullet_item(doc, "Step 3 - Guardian Information:", "Input primary guardian name, mobile phone number, email address, national ID, and relationship (Father, Mother, Legal Guardian).")
    add_bullet_item(doc, "Step 4 - Medical & Dietary Notes:", "Record blood group, known allergies, chronic conditions, and emergency medical contacts.")
    add_bullet_item(doc, "Step 5 - Term Fee Billing Trigger:", "Check 'Generate Initial Term Invoice' to automatically bill the learner for tuition, lunch, and activities based on the grade's fee structure.")
    add_bullet_item(doc, "Step 6 - Finalize Admission:", "Click 'Admit Learner'. The student record is committed, an official admission letter can be printed, and guardian login credentials are automatically dispatched.")

    add_screenshot(doc, "admin_03_admit_learner.png", "3.3", "Admit New Learner Registration Interface", "Comprehensive student registration modal capturing personal bio-data, academic placement, guardian linking, and initial term billing.")

    add_heading_2(doc, "Chapter 6: Learner Records, Classes & Stream Placement")
    add_body_p(doc, "Under 'Classes & Streams', administrators configure the institutional classroom structure. Administrators can create new streams (e.g., Grade 1 East, Grade 1 West), define maximum seating capacities, assign Class Teachers, and transfer students between streams with complete historical auditing.")

    add_screenshot(doc, "admin_06_classes_streams.png", "3.4", "Classes & Streams Management Centre", "Configuration view for academic grade levels, class streams, classroom seating capacity, and class teacher allocations.")

    add_heading_2(doc, "Chapter 7: Guardian & Parent Account Linking")
    add_body_p(doc, "To enable multi-child parental access, administrators use the 'Parent Linking' desk. If a parent has multiple children enrolled (e.g., a sibling in PP1 and another in Grade 5), the administrator links both student admission numbers to the single guardian account. This enables the parent to toggle between both learners on their portal with zero friction.")

    add_heading_2(doc, "Chapter 8: Promotions, Archive Vault & Student Exits")
    add_body_p(doc, "At the conclusion of each academic year, administrators execute the 'Annual Promotion' engine. Entire classes are promoted to the next grade level (e.g., Grade 2 -> Grade 3). Students who graduate, relocate, or transfer are moved to the 'Archived Data Vault', preserving their complete financial ledgers, assessment scores, and attendance history indefinitely without cluttering active classroom registers.")

    # PART C
    add_heading_1(doc, "PART C: STAFF & PAYROLL ADMINISTRATION")

    add_heading_2(doc, "Chapter 9: The 'Onboard Staff' Workflow")
    add_body_p(doc, "The 'Onboard Staff' pipeline under 'Staff Management' registers both teaching faculty and non-teaching personnel:")
    add_bullet_item(doc, "Personal Details:", "Full legal name, national ID / passport number, gender, date of birth, personal phone, and official email.")
    add_bullet_item(doc, "Professional Qualifications:", "TSC registration number (for teachers), highest educational degree, specialization, and employment start date.")
    add_bullet_item(doc, "Role Allocation:", "Assign institutional role (TEACHER, BURSAR, ACCOUNTANT, ADMISSIONS, DEPUTY_HEAD_TEACHER, or ADMIN).")
    add_bullet_item(doc, "Remuneration Details:", "Basic contract salary, standard allowances (house, commuter), bank account details, and statutory numbers (KRA PIN, NSSF, NHIF / SHA).")

    add_screenshot(doc, "admin_05_onboard_staff.png", "3.5", "Staff Onboarding & Recruitment Pipeline", "Interface for provisioning employee profiles, professional credentials, salary contracts, and institutional responsibilities.")

    add_heading_2(doc, "Chapter 10: Role-Based Access Control (RBAC) Administration")
    add_body_p(doc, "Administrators manage institutional permissions under 'User Management & Access'. Administrators can reset locked staff accounts, force password changes, adjust role privileges, or immediately revoke access for exiting employees.")

    add_screenshot(doc, "admin_09_user_management.png", "3.6", "User Management & Role Permissions Hub", "Security administration console governing user accounts, credential status, last login timestamps, and departmental access rights.")

    add_heading_2(doc, "Chapter 11: Faculty Attendance & Geofence Clock-In")
    add_body_p(doc, "Under 'Faculty Attendance Roster' and 'School Geofencing', leadership monitors staff arrival times and presence. The geofencing module defines the physical geographical radius (latitude, longitude, and buffer radius in meters) of Grace Seeds School, preventing clock-in from remote locations.")

    add_heading_2(doc, "Chapter 12: Staff Payroll Processing & Salary Disbursement")
    add_body_p(doc, "SmartShule includes an integrated, statutory-compliant payroll engine under 'Staff Payroll':")
    add_body_p(doc, "Monthly Payroll Processing Workflow:")
    add_bullet_item(doc, "Step 1:", "Select the Payroll Month and Year (e.g., February 2026).")
    add_bullet_item(doc, "Step 2:", "Click 'Initialize Monthly Payroll'. The system loads all active staff contracts.")
    add_bullet_item(doc, "Step 3:", "Review earnings: Basic Salary + Commuter Allowance + House Allowance.")
    add_bullet_item(doc, "Step 4:", "Review deductions: PAYE Income Tax, NSSF Tier I & II, NHIF / SHA, and internal advances.")
    add_bullet_item(doc, "Step 5:", "The system computes Net Pay for each employee.")
    add_bullet_item(doc, "Step 6:", "Click 'Approve & Finalize Payroll'. Official PDF payslips are generated automatically.")

    add_screenshot(doc, "admin_08_payroll_processing.png", "3.7", "Staff Payroll & Statutory Remittance Register", "Monthly payroll processing ledger calculating gross earnings, tax liabilities, statutory deductions, and net salary disbursements.")

    add_heading_2(doc, "Chapter 13: Salary Disbursement Logging & Acknowledgement Review")
    add_body_p(doc, "Once salaries are disbursed via bank transfer or M-Pesa B2C, the Bursar logs the transaction batch reference. When staff log in and click 'Acknowledge Salary Payment' (as documented in the Staff Manual), the Administrator Payroll Register displays an audited green 'ACKNOWLEDGED' badge alongside the staff member's digital timestamp.")

    # PART D
    add_heading_1(doc, "PART D: ACADEMIC & CBC CURRICULUM GOVERNANCE")

    add_heading_2(doc, "Chapter 14: Academic Calendar & Term Initialization")
    add_callout(doc, "RESTRICTED GOVERNANCE: Academic Term Initialization is strictly restricted by system security to the Super Administrator, School Administrator, and Headteacher. No other user role can open or close academic terms.", "IMPORTANT")
    add_body_p(doc, "The Term Management Engine controls the institutional calendar. When opening a new term (e.g., Term 1 2026):")
    add_bullet_item(doc, "1. Set Term Parameters:", "Input Opening Date, Mid-Term Break, and Closing Date.")
    add_bullet_item(doc, "2. Select Fee Structure:", "Attach the approved fee structure for each grade.")
    add_bullet_item(doc, "3. Execute Auto-Billing:", "The system executes the batch invoicing engine, billing all active learners and carrying forward prior arrears.")
    add_bullet_item(doc, "4. Activate Attendance Register:", "Initializes new daily roll-call registers across all streams.")

    add_heading_2(doc, "Chapter 15: Classes, Streams & Curriculum Mapping")
    add_body_p(doc, "Leadership maps subjects to grades under 'Subjects & Learning Areas'. For junior school grades (Grade 7 - 9), administrators configure core compulsory subjects (English, Kiswahili, Mathematics, Integrated Science, Social Studies) alongside elective pathways (Pre-Technical, Agriculture, Visual Arts, Computer Science).")

    add_heading_2(doc, "Chapter 16: KICD Rationalized CBC Curriculum Management")
    add_body_p(doc, "Under 'Strands & Outcomes', administrators configure curriculum rationalization updates released by the Ministry of Education and KICD. Strands and sub-strands can be adjusted per grade, ensuring teachers record assessments against compliant learning outcomes.")

    add_heading_2(doc, "Chapter 17: Examination Management & Moderation Oversight")
    add_body_p(doc, "Under 'Summative Assessments', administrators supervise examination cycles. Administrators set score submission deadlines, monitor teacher marks completion percentages, and execute the 'Lock Marksheet' command to prevent retroactive tampering once marks are audited.")

    add_heading_2(doc, "Chapter 18: Reviewing Teacher Submissions & Academic Broadsheets")
    add_body_p(doc, "Administrators inspect class performance using 'Master Broadsheets'. The system highlights outliers (e.g., subjects with unusually high 'BE' rates), enabling the Headteacher to schedule pedagogical interventions before term report cards are released.")

    add_heading_2(doc, "Chapter 19: Term Report Card Generation & Endorsement")
    add_body_p(doc, "Once all subject marks are approved, administrators generate official report cards in batch. The Headteacher inputs institutional remarks (e.g., 'An exemplary term. Keep up the high standard of excellence.') and applies the official Grace Seeds School digital crest and signature.")

    # PART E
    add_heading_1(doc, "PART E: FINANCIAL ENGINEERING & LEDGER OVERSIGHT")

    add_heading_2(doc, "Chapter 20: Fee Structures & Term Billing Rates")
    add_body_p(doc, "Under 'Fee Structures', the finance team creates approved institutional tariffs. Each grade level can have distinct rates for:")
    add_bullet_item(doc, "Tuition Fees:", "Core educational instruction.")
    add_bullet_item(doc, "Lunch Program Fees:", "Optional or compulsory daily catering.")
    add_bullet_item(doc, "Activity & Co-Curricular Fees:", "Physical education, clubs, and sports.")
    add_bullet_item(doc, "Transport Levies (Optional):", "Zoned bus transport rates.")

    add_screenshot(doc, "admin_07_fee_structures.png", "3.8", "Fee Structure Architecture & Tariff Configuration", "Institutional fee tariff matrix configuring term charges across Playgroup, Pre-Primary, Primary, and Junior School tiers.")

    add_heading_2(doc, "Chapter 21: Student Fee Invoicing & Automated Billing Engine")
    add_body_p(doc, "SmartShule eliminates discrepancies by calculating student fee balances from the unified invoice ledger. Invoicing rules enforced by the engine:")
    add_bullet_item(doc, "Batch Invoicing:", "When a term is initialized, every enrolled pupil is billed the exact fee structure for their grade.")
    add_bullet_item(doc, "Individual Invoicing:", "When mid-term transfers arrive, cashiers generate pro-rated individual invoices under 'Fee Collection & Accounts'.")
    add_bullet_item(doc, "Unified Balance Calculation:", "Balance = Total Unpaid Invoices + Prior Unpaid Arrears - Fee Credits.")

    add_heading_2(doc, "Chapter 22: Student Fee Accounts & Payment Reconciliation")
    add_body_p(doc, "Administrators monitor fee collection velocity under 'Fee Collection & Accounts' and 'Financial Reports'. Every payment entered at the cashier desk or approved from the forwarded queue immediately credits the student ledger and updates overall school collection rates.")

    add_heading_2(doc, "Chapter 23: Overpayment Handling & Fee Credit Application")
    add_body_p(doc, "SmartShule strictly protects guardian funds. When a guardian deposits an amount exceeding their total liability, the excess is recorded as a 'Fee Credit'. When next term's invoices are generated, the system automatically applies existing fee credits, reducing the guardian's new bill and generating an official Credit Utilization Receipt.")

    add_heading_2(doc, "Chapter 24: Payment Verification & Transaction Reversals")
    add_body_p(doc, "To prevent financial malfeasance, SmartShule does not allow deletion of payment receipts. If a cashier enters an incorrect receipt, they must raise a digital 'Transaction Reversal Request' stating the audit reason. The reversal only takes effect when approved by the School Director or Headteacher.")

    add_heading_2(doc, "Chapter 25: Institutional Financial Reports & Statements")
    add_body_p(doc, "Under 'Financial Reports & Statements', leadership can generate:")
    add_bullet_item(doc, "Fee Collection Summary:", "Total collections broken down by payment channel (M-Pesa, KCB, Equity, Cash).")
    add_bullet_item(doc, "Term Defaulters Broadsheet:", "List of all students with outstanding balances categorized by grade and amount.")
    add_bullet_item(doc, "Operating Cash Flow Statement:", "Net operational surplus/deficit (Total Inbound Revenue minus Total Operating Expenses).")

    # PART F
    add_heading_1(doc, "PART F: STORES, INVENTORY & ASSET MANAGEMENT")

    add_heading_2(doc, "Chapter 26: Fixed Asset Registration & Depreciation")
    add_body_p(doc, "The 'Inventory & Fixed Assets' module manages all capital investments of Grace Seeds School, including school buses, laboratory computers, classroom furniture, and kitchen commercial cookers. Assets are tagged with serial numbers, acquisition dates, purchase costs, and room locations.")

    add_heading_2(doc, "Chapter 27: Consumables & Stock Movement Auditing")
    add_body_p(doc, "Stores personnel log consumable stock movements. Leadership reviews monthly inventory audit sheets to verify that textbook sets, laboratory chemicals, and stationery correlate with classroom consumption.")

    add_heading_2(doc, "Chapter 28: Purchase Requisitions & Approval Workflows")
    add_body_p(doc, "All departmental purchase requests require digital approval. Headteachers review requisition justification, budget allocation, and vendor quotations before authorizing purchase orders.")

    # PART G
    add_heading_1(doc, "PART G: PARENT ENGAGEMENT & INSTITUTIONAL SECURITY")

    add_heading_2(doc, "Chapter 29: Official School Announcements & Audience Targeting")
    add_body_p(doc, "When publishing notices under 'Notice Board & Circulars', administrators select the targeted audience:")
    add_bullet_item(doc, "ALL:", "Visible to both staff and parents (e.g., Term Opening Dates, Public Holidays).")
    add_bullet_item(doc, "PARENTS:", "Exclusive to parents and guardians (e.g., Fee Payment Deadlines, Visiting Days).")
    add_bullet_item(doc, "STAFF:", "Confidential internal notices (e.g., Staff Meetings, Examination Moderation schedules).")

    add_heading_2(doc, "Chapter 30: Parent Consent Management & Verification")
    add_body_p(doc, "Under 'Parent Consent Records', administrators track parental authorization for extracurricular activities, school trips, and media publications. Real-time counters show total consents granted, declined, and pending, ensuring child protection compliance before excursions.")

    add_heading_2(doc, "Chapter 31: User Account Administration & Access Revocation")
    add_body_p(doc, "Administrators manage the user lifecycle under 'User Management'. For departing staff, administrators click 'Deactivate Account', instantly invalidating active JWT session tokens and blocking access to school data.")

    add_heading_2(doc, "Chapter 32: System Audit Logs & Data Protection Compliance")
    add_body_p(doc, "Under 'System Audit Logs', leadership can inspect an immutable chronological audit trail of all platform activities. Every login attempt, mark modification, fee receipt generation, payment reversal, and student deletion is recorded with the actor's email, IP address, timestamp, and previous vs. new values.")

    add_screenshot(doc, "admin_10_system_logs.png", "3.9", "Immutable System Audit & Security Logs", "Administrative forensic log recording all user actions, security events, authentication attempts, and financial transactions.")

    # Appendix
    add_heading_1(doc, "Appendix: Administrative & Legal Reference Guide")
    admin_ref = [
        ["Statutory Data Protection", "Compliance with the Kenya Data Protection Act (2019) regarding learner bio-data, medical records, and digital consents."],
        ["KICD CBC Guidelines", "Adherence to national curriculum outcomes, continuous assessment records, and competency grading standards."],
        ["KRA & Statutory Deductions", "Monthly PAYE, NSSF, and NHIF / SHA tax compliance parameters enforced in staff payroll processing."],
        ["Database Backup Protocols", "Automated daily PostgreSQL cloud snapshots and redundant off-site transactional archival."],
        ["Emergency Support Escalation", "Contact Vellox Tech Solutions technical engineering team: emergency@velloxtech.com  |  +254 700 000 000"]
    ]
    add_styled_table(doc, ["Regulatory / Technical Pillar", "Institutional Standard & Operational Protocol"], admin_ref, [Inches(2.5), Inches(4.3)])

    out_path = os.path.join(DOCS_DIR, "SmartShule_Administrator_Director_Manual.docx")
    doc.save(out_path)
    print(f"Administrator Manual generated successfully: {out_path}")

if __name__ == '__main__':
    build_admin_manual()
