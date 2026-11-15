#!/usr/bin/env python3
"""
Generates SmartShule_Staff_User_Manual.docx
Comprehensive user manual for Teaching and Non-Teaching Staff of Grace Seeds School.
"""

import os
import sys
from docx.shared import Inches, Pt, RGBColor
from manual_engine import (
    create_base_document, add_cover_page, add_heading_1, add_heading_2, add_heading_3,
    add_body_p, add_bullet_item, add_callout, add_screenshot, add_styled_table,
    DOCS_DIR
)

def build_staff_manual():
    doc = create_base_document("Staff Operations Manual (Teaching & Non-Teaching)")
    
    # 1. Cover Page
    add_cover_page(
        doc,
        main_title="Staff Operations & User Manual",
        subtitle="Standard Operating Procedures for Teaching Faculty and Non-Teaching Administrative Staff",
        audience="Teaching Faculty, Class Teachers, Subject Teachers, Bursars, Accountants, Storekeepers & Admissions Staff",
        manual_code="SMART-MAN-STF-2026-V1"
    )
    
    # 2. Table of Contents
    add_heading_1(doc, "Table of Contents")
    toc_data = [
        ["PART A: GENERAL STAFF INSTRUCTIONS", ""],
        ["Section 1: Introduction to Staff Operations", "Overview, institutional values, and role-based access control"],
        ["Section 2: Accessing SmartShule", "Web browser, native desktop app, and Android mobile client"],
        ["Section 3: Staff Authentication & Password Security", "Signing in, first-time setup, password changes, and 2FA protection"],
        ["Section 4: Navigating the Staff Interface", "Accordion navigation sidebar, top navigation bar, and active view switcher"],
        ["Section 5: Managing Permitted Profile Information", "TSC numbers, contact details, subject specialties, and emergency info"],
        ["Section 6: Staff Announcements & Notice Board", "Receiving official staff circulars and administrative alerts"],
        ["PART B: TEACHING STAFF (FACULTY)", ""],
        ["Section 7: Teacher Dashboard & Daily Command Centre", "Assigned classes, timetable summary, and daily register status"],
        ["Section 8: Assigned Classes, Streams & Learner Rosters", "Viewing class cohorts, student profiles, and guardian contacts"],
        ["Section 9: Daily Attendance Register (Roll Call)", "Marking PRESENT, ABSENT, LATE, and EXCUSED learners accurately"],
        ["Section 10: CBC Curriculum Management", "Learning areas, strands, sub-strands, and competency frameworks"],
        ["Section 11: Recording Formative CBC Assessments", "Continuous assessment tests (CATs), observation rubrics, and feedback"],
        ["Section 12: Summative Examination Marks Entry", "Batch marks entry modal, individual student scores, and rubric mapping"],
        ["Section 13: Verifying Saved Marks (Crucial Procedure)", "Step-by-step confirmation of marks persistence, badges, and audit confirmation"],
        ["Section 14: Competency Analytics & Master Broadsheets", "Class performance curves, learning area rankings, and broadsheet exports"],
        ["Section 15: Schemes of Work & Lesson Plans", "Digital scheme creation, lesson planning, and curriculum tracking"],
        ["Section 16: Records of Work & Curriculum Accountability", "Logging taught lessons, syllabus milestones, and HOD approvals"],
        ["Section 17: Daily Homefun (E-Diary) Homework Entry", "Assigning daily homework, tracking due dates, and reading parent notes"],
        ["Section 18: Class Timetables & Room Allocations", "Viewing weekly teaching slots, free periods, and room assignments"],
        ["Section 19: Salary Payment Acknowledgement", "Reviewing monthly salary records, payslips, and digital acknowledgements"],
        ["PART C: NON-TEACHING STAFF OPERATIONS", ""],
        ["Section 20: Non-Teaching Roles & Permission Boundaries", "Bursar, Accountant, Admissions Officer, and Inventory Storekeeper roles"],
        ["Section 21: Learner Fee Collection & Cashier Desk", "Searching student fee accounts, recording cash/bank/M-Pesa, and receipts"],
        ["Section 22: Forwarded Payments Queue (Audit & Approval)", "Reviewing parent-reported payment claims, bank slip matching, and verification"],
        ["Section 23: Fee Arrears, Defaulters & Payment Statements", "Generating balance statements, fee clearance certificates, and collection audits"],
        ["Section 24: Operating Expenses & Cash Flow Ledger", "Logging school disbursements, categorizing expenses, and attaching vouchers"],
        ["Section 25: Stores & Fixed Assets Inventory Management", "Stock items, categories, intake, issuance, and reorder alerts"],
        ["Section 26: Procurement & Purchase Requests", "Raising purchase requisitions, tracking approvals, and vendor deliveries"],
        ["Section 27: Admissions Desk & Onboard Queue", "Processing slot applications, admission vetting, and learner queue review"],
        ["PART D: TROUBLESHOOTING & GLOSSARY", ""],
        ["Section 28: Staff Troubleshooting & Technical Support", "Resolving locked accounts, marks saving errors, and network disconnects"],
        ["Appendix: CBC Academic & Institutional Glossary", "Definitions of teaching, grading, and non-teaching terminology"]
    ]
    add_styled_table(doc, ["Section", "Operational Focus"], toc_data, [Inches(3.0), Inches(3.8)])
    
    # PART A
    add_heading_1(doc, "PART A: GENERAL STAFF INSTRUCTIONS")
    
    add_heading_2(doc, "Section 1: Introduction to Staff Operations")
    add_body_p(doc, "The SmartShule platform at Grace Seeds School serves as the central operating system for all academic and administrative activities. Whether you are a teaching faculty member facilitating CBC curriculum competencies or a non-teaching professional managing school accounts, stores, or admissions, SmartShule standardizes your workflows and ensures institutional accountability.")
    add_body_p(doc, "Role-Based Access Control (RBAC):")
    add_body_p(doc, "Every employee is provisioned with a secure digital account governed by strictly enforced permission boundaries. You will only see the modules, learner records, and administrative controls relevant to your assigned institutional duties. A teacher cannot access financial ledgers, and a cashier cannot alter academic examination marks.")

    add_heading_2(doc, "Section 2: Accessing SmartShule")
    add_body_p(doc, "SmartShule is accessible across three environments:")
    add_bullet_item(doc, "1. Staff Web Portal:", "Open Google Chrome or Mozilla Firefox on any desktop computer, tablet, or laptop and visit https://smartshule.ac.ke.")
    add_bullet_item(doc, "2. Staff Desktop Application:", "For office desktops running Windows (Windows 10/11) or Linux (Kali, Ubuntu, Debian), run the SmartShule Desktop Client for fast offline-cached performance.")
    add_bullet_item(doc, "3. Android Tablet / Phone App:", "For teachers conducting roll call on the field or entering marks via tablet, launch the SmartShule Android application.")

    add_heading_2(doc, "Section 3: Staff Authentication & Password Security")
    add_body_p(doc, "Upon employment at Grace Seeds School, the IT administrator or Headteacher registers your official staff account. You receive an official welcome email containing your login ID (usually your school email address or mobile phone number) and a temporary password.")
    add_body_p(doc, "Standard Authentication Steps:")
    add_bullet_item(doc, "Step 1:", "Navigate to the SmartShule login screen.")
    add_bullet_item(doc, "Step 2:", "Enter your registered email address (e.g., sarah.mwangi@smartshule.ac.ke).")
    add_bullet_item(doc, "Step 3:", "Enter your confidential password.")
    add_bullet_item(doc, "Step 4:", "Click 'Sign In'.")
    add_callout(doc, "Do not share passwords. In accordance with data privacy regulations, all marks uploads, attendance changes, and payment receipts are digitally signed with your user ID and recorded in the immutable System Audit Log.", "IMPORTANT")

    add_screenshot(doc, "screen_01_login_page.png", "2.1", "SmartShule Staff Authentication Portal", "Secure login screen with role-aware authorization and credential validation.")

    add_heading_2(doc, "Section 4: Navigating the Staff Interface")
    add_body_p(doc, "The SmartShule staff interface is organized into two primary visual zones:")
    add_bullet_item(doc, "1. The Accordion Navigation Sidebar (Left):", "Grouped into collapsible institutional modules: Admissions & Enrolment, Staff Management, Academics & Learners, CBE Competencies & Grading, Curriculum & Timetable, Finance & Billing, Stores & Fixed Assets, and Digital Diary.")
    add_bullet_item(doc, "2. Top Application Bar (Header):", "Displays the school logo, current academic year (2026), current term (Term 1), active user profile badge, staff-to-parent view switcher (if you have enrolled children), and quick notifications.")
    add_callout(doc, "Staff With Enrolled Children: If you are a teacher or staff member who also has children admitted at Grace Seeds School, you do NOT need a second account. Use the 'Switch to Parent View' toggle in your profile menu to check your child's fees and report cards, then switch back to 'Staff View'.", "TIP")

    add_heading_2(doc, "Section 5: Managing Permitted Profile Information")
    add_body_p(doc, "Staff members can inspect and maintain their institutional profile under 'My Teacher Profile' or 'User Profile':")
    add_bullet_item(doc, "Teacher TSC Number:", "Teachers can confirm their Teachers Service Commission (TSC) registration number and national ID number.")
    add_bullet_item(doc, "Contact Details:", "Update your active mobile phone number and secondary emergency contact.")
    add_bullet_item(doc, "Assigned Learning Areas:", "Verify your officially assigned subjects (e.g., Grade 3 Mathematics, Grade 4 Science).")

    add_heading_2(doc, "Section 6: Staff Announcements & Notice Board")
    add_body_p(doc, "Under the 'Notice Board & Circulars' module, staff members can review internal administrative communications. Notices tagged 'STAFF' or 'ALL' appear here, including staff meeting dates, syllabus submission deadlines, examination moderation timetables, and school event duty rosters.")

    # PART B: TEACHING FACULTY
    add_heading_1(doc, "PART B: TEACHING STAFF (FACULTY)")

    add_heading_2(doc, "Section 7: Teacher Dashboard & Daily Command Centre")
    add_body_p(doc, "The Teacher Dashboard serves as the central pedagogical workstation. At the start of every school day, teachers use this dashboard to execute core responsibilities:")
    add_bullet_item(doc, "Class Assignment Summary:", "Displays your primary class teacher designation (e.g., Grade 3 East) and subject teacher assignments.")
    add_bullet_item(doc, "Today's Attendance Callout:", "Direct indicator showing whether morning roll call has been completed for your class.")
    add_bullet_item(doc, "Quick Action Buttons:", "One-click access to: 'Enter Formative Marks', 'Upload Exam Marks', 'Create Lesson Plan', and 'Generate Class Roster PDF'.")
    add_bullet_item(doc, "Geofence Clock-In Card:", "Allows faculty to verify on-campus arrival within school geographical coordinates.")
    add_bullet_item(doc, "Salary Acknowledgement Card:", "Provides one-click acknowledgement when monthly salary disbursement is confirmed.")

    add_screenshot(doc, "staff_01_teacher_dashboard.png", "2.2", "Teacher Pedagogical Dashboard", "Faculty control center displaying assigned classes, student roster counters, daily register status, and assessment quick actions.")

    add_heading_2(doc, "Section 8: Assigned Classes, Streams & Learner Rosters")
    add_body_p(doc, "Under 'Classes & Streams' and 'Learners & Guardians', teachers can view active class cohorts. Teachers can search learners by name or admission number, review student photo badges, view parent contact numbers for pastoral care, and export official PDF class registers with Grace Seeds School branding.")

    add_heading_2(doc, "Section 9: Daily Attendance Register (Roll Call)")
    add_body_p(doc, "Daily attendance recording is mandatory for all class teachers every morning before 8:30 AM.")
    add_body_p(doc, "Step-by-step Attendance Marking Procedure:")
    add_bullet_item(doc, "Step 1:", "From the dashboard or sidebar, select 'Daily Attendance'.")
    add_bullet_item(doc, "Step 2:", "Select your assigned Class and Stream (e.g., Grade 3 East). The date automatically defaults to today.")
    add_bullet_item(doc, "Step 3:", "The learner roster appears. By default, students are listed with their existing saved status.")
    add_bullet_item(doc, "Step 4:", "For each learner, select the appropriate status button:")
    add_bullet_item(doc, "  • PRESENT (Green):", "Learner is present in class.")
    add_bullet_item(doc, "  • ABSENT (Red):", "Learner is absent without prior authorization.")
    add_bullet_item(doc, "  • LATE (Amber):", "Learner arrived after morning assembly.")
    add_bullet_item(doc, "  • EXCUSED (Blue):", "Absence authorized due to illness or approved leave.")
    add_bullet_item(doc, "Step 5:", "Click the green 'Save Attendance Register' button.")
    add_bullet_item(doc, "Step 6:", "A green confirmation toast 'Attendance register saved successfully' appears, and the Admin Dashboard instantly updates the school attendance stats.")

    add_screenshot(doc, "staff_02_attendance_register.png", "2.3", "Daily Attendance Register Marking Interface", "Interactive roll call interface allowing teachers to classify learners as Present, Absent, Late, or Excused with single-click persistence.")

    add_heading_2(doc, "Section 10: CBC Curriculum Management")
    add_body_p(doc, "Grace Seeds School strictly adheres to the Kenya Institute of Curriculum Development (KICD) Competency-Based Curriculum framework. In SmartShule, curriculum content is structured hierarchically:")
    add_bullet_item(doc, "1. Learning Area (Subject):", "e.g., Mathematics Activities, Language Activities, Environmental Activities.")
    add_bullet_item(doc, "2. Strand (Thematic Topic):", "e.g., Numbers, Measurement, Geometry.")
    add_bullet_item(doc, "3. Sub-Strand (Specific Learning Concept):", "e.g., Addition with Regrouping, Multiplication Tables.")
    add_bullet_item(doc, "4. Specific Learning Outcomes:", "Observable competencies learners are expected to demonstrate.")

    add_heading_2(doc, "Section 11: Recording Formative CBC Assessments")
    add_body_p(doc, "Formative assessments capture ongoing learner progress during daily lessons:")
    add_bullet_item(doc, "Step 1:", "Navigate to 'Formative (Continuous / CATs)'.")
    add_bullet_item(doc, "Step 2:", "Select your Class, Learning Area, and specific Strand / Sub-Strand.")
    add_bullet_item(doc, "Step 3:", "For each student, assign a 4-point CBC rating: EE (Exceeding), ME (Meeting), AE (Approaching), or BE (Below).")
    add_bullet_item(doc, "Step 4:", "Type constructive, actionable teacher remarks highlighting areas of strength and required interventions.")
    add_bullet_item(doc, "Step 5:", "Click 'Save Formative Record'.")

    add_screenshot(doc, "staff_03_formative_entry.png", "2.4", "Formative Assessment & Competency Evaluation", "Interface for recording continuous learner performance across KICD rationalized learning strands.")

    add_heading_2(doc, "Section 12: Summative Examination Marks Entry")
    add_body_p(doc, "Summative examinations (Opener, Mid-Term, and End-of-Term Finals) require standardized percentage marks entry. Teachers can enter marks by individual student or via the unified Class Roster Entry modal.")
    add_body_p(doc, "Class Roster Marks Entry Procedure:")
    add_bullet_item(doc, "Step 1:", "From 'Summative (Terminal Exams)', click the burgundy 'Upload / Record Marks' button.")
    add_bullet_item(doc, "Step 2:", "Select the Academic Year (2026), Academic Term (Term 1), and Examination Type (e.g., End of Term Exam).")
    add_bullet_item(doc, "Step 3:", "Select your Class (Grade 3) and Learning Area (Mathematics). The maximum score defaults to 100.")
    add_bullet_item(doc, "Step 4:", "The class student list loads in an editable table. Enter each student's score (e.g., 88, 76, 92). The system automatically computes the CBC rubric level (EE, ME, AE, BE) and injects a standard remark.")

    add_screenshot(doc, "staff_04_summative_exams.png", "2.5", "Summative Examination Records & Marksheet", "Comprehensive mark entry grid mapping percentage examination scores to CBC competency performance levels.")

    add_heading_2(doc, "Section 13: Verifying Saved Marks (Crucial Procedure)")
    add_callout(doc, "CRITICAL VERIFICATION PROCEDURE: In previous academic terms, teachers occasionally closed their browsers before marks were committed to the database. Follow these mandatory verification steps every time you enter marks.", "IMPORTANT")
    add_body_p(doc, "How to verify that your marks have been saved permanently:")
    add_bullet_item(doc, "1. Click 'Save & Commit Marks':", "Always click the primary 'Save All Marks' button at the bottom of the modal.")
    add_bullet_item(doc, "2. Inspect Row Status Badges:", "Observe the 'Status' column on each student's row. The status badge MUST transition from an amber 'DRAFT' badge to a bright green 'SAVED' badge with a checkmark.")
    add_bullet_item(doc, "3. Confirm Toast Alert:", "Wait for the top-right green toast notification: 'Successfully saved and committed [N] marks records'.")
    add_bullet_item(doc, "4. Close and Re-Open Marksheet:", "Close the modal, wait 5 seconds, and reopen the marksheet for that class and subject. Confirm that all entered numbers reappear exactly as typed.")
    add_bullet_item(doc, "5. Check Master Broadsheet:", "Navigate to 'Master Broadsheets' on the sidebar. Verify that your learning area column displays the new scores for all students.")

    add_heading_2(doc, "Section 14: Competency Analytics & Master Broadsheets")
    add_body_p(doc, "Under 'Competency Analytics' and 'Master Broadsheets', teachers can inspect class performance distributions. The Master Broadsheet presents a cross-subject comparison table listing every learner, their marks across all subjects, aggregate points, and rank. Teachers can export this broadsheet to Excel or print official PDF copies for department meetings.")

    add_heading_2(doc, "Section 15: Schemes of Work & Lesson Plans")
    add_body_p(doc, "SmartShule provides a digital repository for Schemes of Work and Lesson Plans under 'Curriculum & Timetable'. Teachers can create schemes specifying the week, lesson number, strand, specific learning outcomes, learning activities, resources, and assessment methods. Plans can be submitted digitally to the Headteacher for approval.")

    add_screenshot(doc, "staff_05_schemes_plans.png", "2.6", "Schemes of Work & Lesson Planning Hub", "Digital curriculum preparation interface allowing teachers to draft, organize, and submit KICD-compliant learning schemes.")

    add_heading_2(doc, "Section 16: Records of Work & Curriculum Accountability")
    add_body_p(doc, "The 'Record of Work' module enforces syllabus delivery accountability. After teaching a lesson, the teacher logs the actual content covered, date completed, and reflections on learner comprehension. Department heads inspect these logs weekly to ensure the school remains on schedule.")

    add_heading_2(doc, "Section 17: Daily Homefun (E-Diary) Homework Entry")
    add_body_p(doc, "To assign homework to your learners:")
    add_bullet_item(doc, "Step 1:", "Select 'Daily Homefun & Communication Diary'.")
    add_bullet_item(doc, "Step 2:", "Click 'New Homefun Entry'. Select your Class and Subject.")
    add_bullet_item(doc, "Step 3:", "Enter the title, page numbers, workbook exercises, and submission due date.")
    add_bullet_item(doc, "Step 4:", "Click 'Publish to Parents'. All parents of children in that class immediately receive the assignment on their Parent Portal dashboard.")

    add_heading_2(doc, "Section 18: Class Timetables & Room Allocations")
    add_body_p(doc, "The 'Class Timetable' view displays your personalized teaching schedule. It highlights active periods, break intervals, co-curricular sports slots, and assigned classroom locations, preventing scheduling conflicts.")

    add_heading_2(doc, "Section 19: Salary Payment Acknowledgement")
    add_body_p(doc, "Grace Seeds School practices transparent, compliant payroll administration. When monthly staff compensation is disbursed, an electronic notification is sent to your account.")
    add_body_p(doc, "How to acknowledge your salary payment:")
    add_bullet_item(doc, "Step 1:", "Navigate to 'Salary Payment Acknowledgement' on the sidebar (or click the card on your Teacher Dashboard).")
    add_bullet_item(doc, "Step 2:", "Review the current pay slip record: Month, Year, Net Amount Disbursed, and Disbursement Channel (Bank / M-Pesa).")
    add_bullet_item(doc, "Step 3:", "Click 'Confirm & Acknowledge Receipt'.")
    add_bullet_item(doc, "Step 4:", "Your digital timestamped acknowledgement is logged for administrative and audit compliance.")

    add_screenshot(doc, "staff_06_salary_ack.png", "2.7", "Staff Salary Payment Acknowledgement", "Electronic compensation review screen where staff inspect monthly disbursements and submit digital receipt confirmations.")

    # PART C: NON-TEACHING STAFF
    add_heading_1(doc, "PART C: NON-TEACHING STAFF OPERATIONS")

    add_heading_2(doc, "Section 20: Non-Teaching Roles & Permission Boundaries")
    add_body_p(doc, "Non-teaching staff members support the vital institutional infrastructure of Grace Seeds School. Key non-teaching roles recognized by SmartShule include:")
    add_bullet_item(doc, "Bursar / School Accountant:", "Manages fee collections, invoices, forwarded payment verification, operating expenses, financial reports, and bank reconciliations.")
    add_bullet_item(doc, "Admissions Officer / Registrar:", "Processes new learner admissions, reviews slot applications, maintains guardian records, and manages student transfers.")
    add_bullet_item(doc, "Stores & Inventory Clerk:", "Oversees fixed assets, textbooks, cleaning supplies, food supplies, stock levels, and purchase requests.")

    add_heading_2(doc, "Section 21: Learner Fee Collection & Cashier Desk")
    add_body_p(doc, "The 'Fee Collection & Accounts' view is the primary workstation for school cashiers and accountants receiving in-person fee payments at the school finance office.")
    add_body_p(doc, "Cashier Desk Payment Processing Procedure:")
    add_bullet_item(doc, "Step 1:", "In 'Fee Collection & Accounts', enter the learner's name or admission number in the student search bar.")
    add_bullet_item(doc, "Step 2:", "The learner's complete financial account loads instantly, displaying: Total Invoiced, Previous Arrears, Total Paid, and Net Balance.")
    add_bullet_item(doc, "Step 3:", "Click the green 'Record Payment' button.")
    add_bullet_item(doc, "Step 4:", "Enter payment parameters: Amount Paid (KES), Payment Method (M-Pesa, Bank Deposit, Cash, or Cheque), Transaction Reference ID, and Date.")
    add_bullet_item(doc, "Step 5:", "Confirm fee allocation (automatically clears arrears first, then current term tuition).")
    add_bullet_item(doc, "Step 6:", "Click 'Save & Issue Receipt'. An official receipt is created and printed for the paying guardian.")

    add_screenshot(doc, "staff_07_fee_collection_desk.png", "2.8", "Learner Fee Collection & Cashier Desk", "Bursar workstation for searching student fee ledgers, recording inbound transactions, and issuing official school receipts.")

    add_heading_2(doc, "Section 22: Forwarded Payments Queue (Audit & Approval)")
    add_body_p(doc, "When parents report fee payments through their portal (as covered in the Parent Manual), those transactions do NOT credit student accounts immediately. They enter the 'Forwarded Payments Queue'.")
    add_body_p(doc, "Bursar Verification Workflow:")
    add_bullet_item(doc, "Step 1:", "Open 'Forwarded Payments Queue' on the sidebar. A badge indicates pending claims.")
    add_bullet_item(doc, "Step 2:", "Review the claimed transaction: Student Name, Parent Name, Amount, Reference Code, and attached payment screenshot.")
    add_bullet_item(doc, "Step 3:", "Cross-reference the reference code against the school's live bank statement or M-Pesa statement.")
    add_bullet_item(doc, "Step 4:", "If the funds exist: Click 'Approve & Issue Receipt'. The student fee account balance is instantly credited.")
    add_bullet_item(doc, "Step 5:", "If the code is invalid or missing: Click 'Reject', enter a polite explanatory reason (e.g., 'Code not found on bank statement, please check with your branch'), and the parent is notified.")

    add_heading_2(doc, "Section 23: Fee Arrears, Defaulters & Payment Statements")
    add_body_p(doc, "The 'Fee Arrears & Defaulters' module allows the finance team to generate class-level debt reports, filter learners by outstanding balances (e.g., > KES 5,000), and export official balance reminders for parents before term examinations.")

    add_heading_2(doc, "Section 24: Operating Expenses & Cash Flow Ledger")
    add_body_p(doc, "Accountants record institutional operating expenses under 'Operating Expenses'. Every payment—including electricity, water, security services, teaching supplies, and kitchen provisions—must be recorded with an attached expense category, payment voucher number, and recipient details for financial auditing.")

    add_heading_2(doc, "Section 25: Stores & Fixed Assets Inventory Management")
    add_body_p(doc, "The 'Inventory & Fixed Assets' module manages all school physical property:")
    add_bullet_item(doc, "Item Cataloguing:", "Desks, chairs, science lab apparatus, sports balls, textbooks, and computer equipment.")
    add_bullet_item(doc, "Stock Intake:", "Recording new inventory deliveries received from vendors with purchase order references.")
    add_bullet_item(doc, "Stock Issuance:", "Issuing stationery or supplies to teachers with recorded quantities and recipient signatures.")
    add_bullet_item(doc, "Reorder Thresholds:", "Alerts storekeepers when consumable items (e.g., printing paper, chalk, cleaning supplies) fall below minimum buffer stock.")

    add_screenshot(doc, "staff_08_inventory_stores.png", "2.9", "Stores & Inventory Control Centre", "Inventory ledger for registering assets, tracking stock movements, and managing department reorder levels.")

    add_heading_2(doc, "Section 26: Procurement & Purchase Requests")
    add_body_p(doc, "When departments require new materials, staff raise a digital 'Purchase Request'. Storekeepers verify existing inventory, and the request is routed to the Bursar and Headteacher for budget approval before procurement.")

    add_heading_2(doc, "Section 27: Admissions Desk & Onboard Queue")
    add_body_p(doc, "Admissions officers manage new applicant pipelines under 'Admissions & Enrolment'. Staff review online slot applications submitted by prospective parents, schedule interviews, and move vetted applicants into the Onboard Queue for final enrollment.")

    # PART D
    add_heading_1(doc, "PART D: TROUBLESHOOTING & GLOSSARY")

    add_heading_2(doc, "Section 28: Staff Troubleshooting & Technical Support")
    trouble_data = [
        ["I cannot see my assigned class in the marks dropdown", "Your teacher account has not been assigned to that class/subject in the academic setup. Contact the Deputy Headteacher or Academic Administrator to map your profile."],
        ["Marks upload modal gives 'Unauthorized Class' error", "SmartShule restricts teachers to their assigned learning areas. Confirm you selected your authorized grade and stream."],
        ["Attendance register shows wrong student count", "Ensure newly admitted students have been formally enrolled in that stream by Admissions. Inactive or archived students are excluded."],
        ["Receipt printer formatting is misaligned", "In your browser print dialog, set Paper Size to A4 or Receipt Roll, Margins to 'Default', and uncheck 'Headers and footers'."],
        ["System logs out unexpectedly during long sessions", "For data protection, SmartShule terminates inactive sessions after 60 minutes. Save your work periodically while entering detailed marks."]
    ]
    add_styled_table(doc, ["Issue / Scenario", "Resolution Procedure"], trouble_data, [Inches(2.5), Inches(4.3)])

    add_heading_2(doc, "Appendix: CBC Academic & Institutional Glossary")
    glossary = [
        ["CAT", "Continuous Assessment Test administered during the school term as formative evaluation."],
        ["Broadsheet", "Comprehensive institutional spreadsheet detailing marks across all subjects for a class."],
        ["KICD", "Kenya Institute of Curriculum Development, governing national CBC curricula and learning strands."],
        ["TSC", "Teachers Service Commission, the statutory regulatory body for Kenyan teachers."],
        ["Arrears", "Past due fee obligations carried forward into the active billing cycle."],
        ["Voucher", "Official payment authorization document justifying an operational school expense."],
        ["RBAC", "Role-Based Access Control, enforcing strict departmental permission boundaries across users."]
    ]
    add_styled_table(doc, ["Term / Acronym", "Definition & Institutional Context"], glossary, [Inches(1.8), Inches(5.0)])

    out_path = os.path.join(DOCS_DIR, "SmartShule_Staff_User_Manual.docx")
    doc.save(out_path)
    print(f"Staff User Manual generated successfully: {out_path}")

if __name__ == '__main__':
    build_staff_manual()
