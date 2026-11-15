#!/usr/bin/env python3
"""
Generates SmartShule_Parent_User_Manual.docx
Comprehensive user manual for Parents and Guardians of Grace Seeds School.
"""

import os
import sys
from docx.shared import Inches, Pt, RGBColor
from manual_engine import (
    create_base_document, add_cover_page, add_heading_1, add_heading_2, add_heading_3,
    add_body_p, add_bullet_item, add_callout, add_screenshot, add_styled_table,
    DOCS_DIR
)

def build_parent_manual():
    doc = create_base_document("Parent & Guardian User Manual")
    
    # 1. Cover Page
    add_cover_page(
        doc,
        main_title="Parent & Guardian User Manual",
        subtitle="Complete Practical Guide to Accessing Learner Records, School Fees, CBC Assessments, and School Communications",
        audience="Parents, Guardians, and Sponsors of Grace Seeds School Learners",
        manual_code="SMART-MAN-PRN-2026-V1"
    )
    
    # 2. Table of Contents Overview
    add_heading_1(doc, "Table of Contents")
    toc_items = [
        ("Chapter 1: Welcome to SmartShule", "Introduction, school mission, and portal purpose"),
        ("Chapter 2: Accessing the Parent Portal", "Web browser, Android mobile application, and Desktop client"),
        ("Chapter 3: First-Time Login & Account Activation", "Receiving credentials, initial sign-in, and verification"),
        ("Chapter 4: Daily Sign-In & Secure Sign-Out", "Standard authentication and session management"),
        ("Chapter 5: Password Recovery & Account Protection", "Forgot password workflow, OTP verification, and password safety"),
        ("Chapter 6: Understanding Your Parent Dashboard", "Executive overview, quick indicators, and navigation cards"),
        ("Chapter 7: Viewing Linked Learners", "Child cards, admission numbers, class allocation, and streams"),
        ("Chapter 8: Multi-Child Account Switching", "How to seamlessly switch between siblings in Grace Seeds School"),
        ("Chapter 9: Learner Profiles & Personal Details", "Bio-data, emergency contacts, medical notes, and photo records"),
        ("Chapter 10: School Fees, Invoices & Current Balance", "Understanding term billing, tuition, lunch, and activity charges"),
        ("Chapter 11: Term Arrears vs. Current-Term Billed Fees", "Distinguishing past arrears from current period invoices"),
        ("Chapter 12: Overpayments & Fee Credits", "How advance payments and fee credits roll over into future terms"),
        ("Chapter 13: Reporting a Fee Payment to the School", "Forward Payment form, M-Pesa codes, bank slips, and verification"),
        ("Chapter 14: Payment History & Official PDF Receipts", "Reviewing audited transactions and downloading tax-compliant receipts"),
        ("Chapter 15: Tracking Daily Learner Attendance", "Attendance registers, presence rates, excused absences, and late arrivals"),
        ("Chapter 16: CBC Formative & Summative Assessments", "Continuous assessment tests (CATs), term exams, and 4-point rubrics"),
        ("Chapter 17: Official CBC Report Cards & Progress Reports", "Viewing, printing, and understanding competency-based report cards"),
        ("Chapter 18: Digital Communication & Daily Homefun (E-Diary)", "Reviewing homework, assignments, and submitting parent notes"),
        ("Chapter 19: School Announcements & Official Circulars", "Viewing school events, visiting days, and holiday reopening dates"),
        ("Chapter 20: Parent Consent & Document Signing", "Reviewing trip authorizations, medical forms, and applying digital consent"),
        ("Chapter 21: Updating Personal Profile & Contacts", "Keeping phone numbers, email addresses, and home addresses updated"),
        ("Chapter 22: Troubleshooting & Frequently Asked Questions", "Solutions to common sign-in, fee display, and network errors"),
        ("Chapter 23: School Administration Contacts & Support", "Direct communication channels with Grace Seeds School finance and offices"),
        ("Appendix: CBC & Technical Glossary", "Definitions of Competency-Based Curriculum and financial terms")
    ]
    add_styled_table(
        doc,
        ["Chapter / Topic", "Description"],
        toc_items,
        [Inches(2.8), Inches(4.0)]
    )
    
    # Chapter 1
    add_heading_1(doc, "Chapter 1: Welcome to SmartShule")
    add_body_p(doc, "Welcome to SmartShule, the official modern school management and Competency-Based Curriculum (CBC) performance tracking platform for Grace Seeds School. Developed by Vellox Tech under the guiding philosophy of 'Building a Smarter Tomorrow', SmartShule provides parents and guardians with direct, transparent, and secure access to their children's educational journey.")
    add_body_p(doc, "As a parent or guardian at Grace Seeds School, you play an integral role in your child's academic development. SmartShule is engineered to keep you fully informed about your child's continuous assessments, term examinations, fee obligations, attendance records, and day-to-day school communications without requiring physical visits to the school administrative offices for routine inquiries.")
    add_callout(doc, "SmartShule operates as a secure cloud platform connecting your home directly to Grace Seeds School. All data is encrypted, confidential, and accessible only to authorized guardians.", "NOTE")
    
    # Chapter 2
    add_heading_1(doc, "Chapter 2: Accessing the Parent Portal")
    add_body_p(doc, "You can access the Grace Seeds School Parent Portal through any of the three supported channels:")
    add_bullet_item(doc, "1. Modern Web Browser:", "Navigate to https://smartshule.ac.ke on any smartphone, tablet, laptop, or desktop computer using Google Chrome, Mozilla Firefox, Apple Safari, or Microsoft Edge.")
    add_bullet_item(doc, "2. Android Mobile Application:", "Install the native SmartShule Android application (SmartShule.apk) on your Android phone or tablet for fast, touch-friendly access.")
    add_bullet_item(doc, "3. Standalone Desktop Client:", "For desktop users, SmartShule is available as a standalone native desktop application for Windows (SmartShule-Setup.exe / SmartShule-Portable.exe), Linux (.AppImage / .deb), and macOS (.dmg / .zip).")
    add_callout(doc, "Do not use outdated browsers such as Internet Explorer. Ensure your smartphone or computer has an active internet connection (Wi-Fi or mobile data bundle) when signing in.", "TIP")
    
    # Chapter 3 & 4
    add_heading_1(doc, "Chapter 3: First-Time Login & Account Activation")
    add_body_p(doc, "When your child is admitted to Grace Seeds School, the admissions office registers your primary guardian contact details (email address and phone number) in the system database. An automated welcome notification or onboarding notice is issued containing your initial login credentials.")
    add_body_p(doc, "To activate your account for the first time:")
    add_bullet_item(doc, "Step 1:", "Open your browser or launch the SmartShule app.")
    add_bullet_item(doc, "Step 2:", "Enter your registered email address or mobile phone number in the Username field.")
    add_bullet_item(doc, "Step 3:", "Enter the temporary password provided by the school administration.")
    add_bullet_item(doc, "Step 4:", "Click the burgundy 'Sign In' button.")
    add_bullet_item(doc, "Step 5:", "Upon your first successful login, the system will prompt you to change your temporary password to a private password known only to you.")
    
    add_screenshot(doc, "screen_01_login_page.png", "1.1", "SmartShule Secure Sign-In Portal", "The unified authentication interface for parents, staff, and administrators with password visibility toggle and recovery links.")
    
    add_heading_1(doc, "Chapter 4: Daily Sign-In & Secure Sign-Out")
    add_body_p(doc, "For your daily interactions with Grace Seeds School:")
    add_bullet_item(doc, "Signing In:", "Visit the portal, enter your verified email/phone and password, and click 'Sign In'. You can check 'Remember Me' on your personal device to stay signed in securely.")
    add_bullet_item(doc, "Signing Out:", "Always sign out when using a shared or public computer. To sign out, click your profile name or avatar in the upper right-hand corner of the screen, or scroll to the bottom of the navigation sidebar and click the red 'Sign Out' button.")
    add_callout(doc, "Never disclose your password to third parties. Grace Seeds School administrative staff will never ask you for your account password.", "WARNING")

    # Chapter 5
    add_heading_1(doc, "Chapter 5: Password Recovery & Account Protection")
    add_body_p(doc, "If you forget your password or suspect unauthorized access to your account, you can reset it independently at any time:")
    add_bullet_item(doc, "Step 1:", "On the login screen, click the 'Forgot Password?' link located beneath the password field.")
    add_bullet_item(doc, "Step 2:", "Enter your registered email address and click 'Send Reset Instructions'.")
    add_bullet_item(doc, "Step 3:", "Check your email inbox (and spam/junk folder) for a message from Grace Seeds School containing a 6-digit verification code.")
    add_bullet_item(doc, "Step 4:", "Enter the 6-digit code on the verification screen, type your new secure password, confirm it, and click 'Reset Password'.")
    add_bullet_item(doc, "Step 5:", "You can now log in immediately with your new password.")
    
    add_screenshot(doc, "screen_02_forgot_password.png", "1.2", "Password Recovery Interface", "Self-service password recovery interface allowing parents to securely regain account access via email verification code.")

    # Chapter 6, 7 & 8
    add_heading_1(doc, "Chapter 6: Understanding Your Parent Dashboard")
    add_body_p(doc, "Upon signing in, you are greeted by the Parent Portal Dashboard. The dashboard is specifically tailored to provide a 360-degree executive view of your children's standing at Grace Seeds School.")
    add_body_p(doc, "Key dashboard components include:")
    add_bullet_item(doc, "Learner Bio Header:", "Displays the active child's full name, admission number, grade level, stream, and class teacher.")
    add_bullet_item(doc, "Fee Obligation Card:", "Highlights current term billed fees, previous arrears, total payments credited, and net outstanding balance.")
    add_bullet_item(doc, "Attendance Health Gauge:", "Shows total school days, days attended, absent days, and overall attendance percentage.")
    add_bullet_item(doc, "Latest CBC Competency Snapshot:", "Summarizes recent continuous assessments (EE, ME, AE, BE) across key learning areas.")
    add_bullet_item(doc, "Daily Homefun (E-Diary) Feed:", "Lists assigned homework with due dates and submission statuses.")
    add_bullet_item(doc, "School Notice Board:", "Displays recent circulars, holiday notices, and reopening schedules.")

    add_screenshot(doc, "parent_01_dashboard.png", "1.3", "Parent Portal Executive Dashboard", "Comprehensive parent dashboard displaying learner bio-card, fee clearance status, attendance summaries, and quick navigation actions.")

    add_heading_1(doc, "Chapter 7: Viewing Linked Learners")
    add_body_p(doc, "All learners biologically linked or formally assigned to your guardianship by Grace Seeds School admissions appear on your account. Each learner profile card displays their official admission number (e.g., GSS-2026-0042), assigned grade (e.g., Grade 3 East), date of birth, emergency contact, and enrollment status.")

    add_screenshot(doc, "parent_02_child_profile.png", "1.4", "Learner Profile & Academic Information", "Detailed learner profile screen showing personal bio-data, class placement, stream assignment, and medical/emergency contacts.")

    add_heading_1(doc, "Chapter 8: Multi-Child Account Switching")
    add_body_p(doc, "If you have more than one child enrolled at Grace Seeds School (e.g., a child in PP2 and another in Grade 4), you do NOT need separate login accounts.")
    add_body_p(doc, "How to switch between children:")
    add_bullet_item(doc, "Locate the Child Switcher:", "At the very top of your Parent Dashboard, you will see horizontal tabs or cards displaying each of your enrolled children's names.")
    add_bullet_item(doc, "Click the Desired Child:", "Click on the name or photo of the child you wish to inspect.")
    add_bullet_item(doc, "Instant Synchronization:", "The entire dashboard—including fee balances, attendance records, exam results, and homework—instantly updates to reflect the selected child.")
    add_callout(doc, "If one of your children is missing from your parent account, contact the Grace Seeds School admissions office to link the learner's admission number to your guardian ID.", "IMPORTANT")

    # Chapter 9, 10, 11, 12, 13 & 14 (FINANCE & FEES)
    add_heading_1(doc, "Chapter 9: Learner Profiles & Personal Details")
    add_body_p(doc, "Under the 'My Profile & Children' tab on the sidebar, parents can review the complete institutional file for each child. This includes admission date, birth certificate records, medical allergies, emergency phone numbers, and designated pickup persons. If any personal information changes, please notify the school registrar promptly.")

    add_heading_1(doc, "Chapter 10: School Fees, Invoices & Current Balance")
    add_body_p(doc, "Grace Seeds School operates an automated, transparent invoicing system. At the start of each academic term, the system generates an official Term Invoice based on the approved fee structure for your child's grade level.")
    add_body_p(doc, "An invoice typically itemizes:")
    add_bullet_item(doc, "Tuition Fees:", "Instructional delivery, teacher facilitation, and curriculum learning materials.")
    add_bullet_item(doc, "Lunch Program Fees:", "Nutritious daily meals prepared under school catering guidelines.")
    add_bullet_item(doc, "Activity & Co-Curricular Fees:", "Physical education, music, arts, clubs, and sports.")
    add_bullet_item(doc, "Specialized Levies (where applicable):", "CBC practical learning assessments, scouts, or computer lab levies.")

    add_screenshot(doc, "parent_03_fees_invoices.png", "1.5", "School Fees Ledger & Invoices View", "Itemized term invoices, payment receipts, fee clearance certificates, and payment reporting interface.")

    add_heading_1(doc, "Chapter 11: Term Arrears vs. Current-Term Billed Fees")
    add_body_p(doc, "To ensure financial clarity, SmartShule strictly separates prior debt from current obligations:")
    add_bullet_item(doc, "Previous Term Arrears:", "Any unpaid balance carried forward from previous academic terms.")
    add_bullet_item(doc, "Current Term Billed:", "The newly invoiced fee amount for the ongoing academic term.")
    add_bullet_item(doc, "Total Amount Due:", "Previous Arrears + Current Term Billed.")
    add_bullet_item(doc, "Total Paid:", "All verified payments credited to your child's account for this period.")
    add_bullet_item(doc, "Net Outstanding Balance:", "Total Amount Due minus Total Paid.")
    add_callout(doc, "Payments made to Grace Seeds School are automatically applied first to clear any previous arrears before crediting the current term's tuition.", "NOTE")

    add_heading_1(doc, "Chapter 12: Overpayments & Fee Credits")
    add_body_p(doc, "If a parent deposits more money than the total invoiced amount (for example, paying KES 35,000 against a total bill of KES 27,000), SmartShule automatically classifies the difference as an Overpayment / Fee Credit (KES 8,000).")
    add_body_p(doc, "Key rules governing fee credits:")
    add_bullet_item(doc, "1. Zero Outstanding Debt:", "A payment is only recorded as an overpayment when all previous arrears AND all current term invoices are completely zero.")
    add_bullet_item(doc, "2. Automatic Rollover:", "Fee credits are safely retained in the school ledger and automatically applied to offset your child's next term invoice.")
    add_bullet_item(doc, "3. Official Credit Receipt:", "A Fee Credit Utilization receipt is issued when credits are applied.")

    add_heading_1(doc, "Chapter 13: Reporting a Fee Payment to the School")
    add_body_p(doc, "Grace Seeds School provides an official 'Forward Payment' workflow so parents can report bank deposits, M-Pesa paybill transfers, and cheque payments directly through the portal.")
    add_body_p(doc, "Important Payment Procedure:")
    add_callout(doc, "SmartShule does NOT perform unverified automatic reconciliation. Every payment reported by a parent is forwarded to the school bursar's verification queue. The bursar verifies the transaction against the school's official bank and M-Pesa statements before issuing an official receipt. Please allow up to 24 hours during working days for verification.", "IMPORTANT")
    add_body_p(doc, "How to report your payment:")
    add_bullet_item(doc, "Step 1:", "Log in to the Parent Portal and navigate to the 'Payments & Receipts' tab.")
    add_bullet_item(doc, "Step 2:", "Click the green 'Forward Payment' button.")
    add_bullet_item(doc, "Step 3:", "Select the child for whom the payment was made.")
    add_bullet_item(doc, "Step 4:", "Select the Payment Channel (M-Pesa Paybill, KCB Bank Deposit, Equity Bank Deposit, Co-op Bank, or Direct Bank Transfer).")
    add_bullet_item(doc, "Step 5:", "Enter the exact Transaction Reference Code (e.g., M-Pesa transaction ID such as QKD829104A or Bank Deposit Slip number).")
    add_bullet_item(doc, "Step 6:", "Enter the exact Amount Paid in Kenya Shillings (KES) and select the payment date.")
    add_bullet_item(doc, "Step 7:", "Optionally upload a photo or screenshot of the payment confirmation message or deposit slip.")
    add_bullet_item(doc, "Step 8:", "Click 'Submit Payment for Verification'. You will receive an immediate on-screen tracking confirmation.")

    add_heading_1(doc, "Chapter 14: Payment History & Official PDF Receipts")
    add_body_p(doc, "Once the school bursar verifies your payment against the school account statement, your child's fee balance immediately drops, and an official Grace Seeds School receipt is generated.")
    add_body_p(doc, "To view or print receipts:")
    add_bullet_item(doc, "Step 1:", "In the 'Payments & Receipts' section, locate the 'Verified Payments History' table.")
    add_bullet_item(doc, "Step 2:", "Click the 'View Receipt' button next to the relevant transaction.")
    add_bullet_item(doc, "Step 3:", "The official receipt opens showing the school letterhead, receipt number, student details, amount, payment method, cashier signature, and remaining balance.")
    add_bullet_item(doc, "Step 4:", "Click 'Download PDF' or 'Print' to save a copy for your personal records.")

    # Chapter 15, 16 & 17 (ACADEMICS & CBC)
    add_heading_1(doc, "Chapter 15: Tracking Daily Learner Attendance")
    add_body_p(doc, "Daily attendance is recorded by class teachers during morning roll call. Parents can inspect their child's attendance record under the 'Daily Attendance' section.")
    add_body_p(doc, "Attendance Status Definitions:")
    add_bullet_item(doc, "PRESENT (Green):", "The learner arrived on time and participated in daily learning sessions.")
    add_bullet_item(doc, "ABSENT (Red):", "The learner was not present at school during roll call.")
    add_bullet_item(doc, "LATE (Amber):", "The learner reported to school after official assembly/registration hours.")
    add_bullet_item(doc, "EXCUSED (Blue):", "The absence was pre-authorized by administration due to illness, medical appointment, or approved family leave.")
    
    add_screenshot(doc, "parent_06_attendance.png", "1.6", "Learner Attendance Register", "Daily attendance calendar and presence percentage tracker indicating roll-call status across the school term.")

    add_heading_1(doc, "Chapter 16: CBC Formative & Summative Assessments")
    add_body_p(doc, "Under Kenya's Competency-Based Curriculum (CBC / CBE), learner achievement is evaluated through two complementary assessment streams:")
    add_bullet_item(doc, "1. Formative Assessments (Continuous / CATs):", "Ongoing classroom observations, practical tasks, group projects, and oral presentations evaluating specific competencies.")
    add_bullet_item(doc, "2. Summative Assessments (Terminal Examinations):", "End-of-term standardized evaluations assessing comprehensive subject comprehension.")
    
    add_body_p(doc, "Understanding the 4-Point CBC Rating Scale:")
    rubric_data = [
        ["EE", "Exceeding Expectations", "Level 4 (80% - 100%)", "Learner demonstrates exemplary mastery, creative problem-solving, and independent application beyond grade standards."],
        ["ME", "Meeting Expectations", "Level 3 (65% - 79%)", "Learner demonstrates solid comprehension and consistently meets required CBC competency outcomes."],
        ["AE", "Approaching Expectations", "Level 2 (50% - 64%)", "Learner grasps basic concepts but requires occasional guidance and targeted practice."],
        ["BE", "Below Expectations", "Level 1 (Below 50%)", "Learner experiences significant difficulty and requires structured remedial support."]
    ]
    add_styled_table(
        doc,
        ["Rubric", "CBC Rating Level", "Score Equivalent", "Meaning & Teacher Interpretation"],
        rubric_data,
        [Inches(0.8), Inches(1.8), Inches(1.4), Inches(2.8)]
    )

    add_screenshot(doc, "parent_04_formative_cbc.png", "1.7", "Continuous CBC Formative Assessment Evaluation", "Strand and sub-strand competency breakdown displaying teacher remarks and rubric ratings.")

    add_heading_1(doc, "Chapter 17: Official CBC Report Cards & Progress Reports")
    add_body_p(doc, "At the end of each academic term, Grace Seeds School publishes comprehensive, printable CBC Report Cards for all cleared students.")
    add_body_p(doc, "How to access your child's report card:")
    add_bullet_item(doc, "Step 1:", "Navigate to the 'CBE Report Cards' tab on the sidebar.")
    add_bullet_item(doc, "Step 2:", "Select the relevant Academic Year (e.g., 2026) and Term (e.g., Term 1).")
    add_bullet_item(doc, "Step 3:", "Click 'View Report Card'.")
    add_bullet_item(doc, "Step 4:", "Review the performance breakdown across all learning areas, co-curricular achievements, values demonstrated, and the Headteacher's official stamp.")
    add_bullet_item(doc, "Step 5:", "Click 'Download Official PDF' to save or print the report card.")
    add_callout(doc, "Under school policy, fee clearance is required to view end-of-term report cards. If your account has an outstanding balance, a polite fee settlement reminder will be displayed instead.", "IMPORTANT")

    add_screenshot(doc, "parent_05_report_cards.png", "1.8", "CBE Term Report Card View", "Official term report card interface featuring subject grades, competency rubrics, teacher observations, and headteacher endorsement.")

    # Chapter 18, 19, 20 & 21 (COMMUNICATIONS & CONSENT)
    add_heading_1(doc, "Chapter 18: Digital Communication & Daily Homefun (E-Diary)")
    add_body_p(doc, "Grace Seeds School utilizes the Digital Homefun Diary (E-Diary) to eliminate lost physical homework diaries and ensure parents are aware of daily assignments.")
    add_body_p(doc, "Using the E-Diary:")
    add_bullet_item(doc, "1. Review Assignments:", "Click on 'Daily Homefun & Communication Diary' to inspect today's homework, subject tasks, and required reading.")
    add_bullet_item(doc, "2. Acknowledge Completion:", "Once your child finishes the task, click 'Acknowledge Homework'.")
    add_bullet_item(doc, "3. Send a Parent Note:", "You can add a brief note (e.g., 'Grace required extra help with question 4') which the teacher reads the following morning.")

    add_screenshot(doc, "parent_07_ediary_homefun.png", "1.9", "Digital Homefun & Communication Diary", "Daily homework log showing assigned exercises, teacher instructions, and parent acknowledgement button.")

    add_heading_1(doc, "Chapter 19: School Announcements & Official Circulars")
    add_body_p(doc, "The 'Notice Board & Circulars' tab is your direct line to school management. All official circulars, opening/closing dates, visiting day schedules, sports day alerts, and curriculum workshops are published here.")
    add_body_p(doc, "Audience Isolation:")
    add_body_p(doc, "To protect privacy and reduce noise, SmartShule filters notices by audience. As a parent, you will only see announcements tagged for 'PARENTS' or 'ALL'. Staff-internal notices are kept confidential.")

    add_screenshot(doc, "parent_08_announcements.png", "1.10", "Grace Seeds School Notice Board", "Official circulars and school announcements filtered specifically for parents and guardians.")

    add_heading_1(doc, "Chapter 20: Parent Consent & Document Signing")
    add_body_p(doc, "Grace Seeds School upholds child protection and legal compliance standards. When educational field trips, swimming galas, medical immunization drives, or media consent forms are issued, parents can review and digitally authorize them directly in the portal.")
    add_body_p(doc, "How to sign a consent form:")
    add_bullet_item(doc, "Step 1:", "Navigate to the 'Parent Consent' tab.")
    add_bullet_item(doc, "Step 2:", "Review active consent requests and read the terms and trip details.")
    add_bullet_item(doc, "Step 3:", "Click 'Review & Sign'.")
    add_bullet_item(doc, "Step 4:", "Select 'Consent Granted' (or 'Consent Declined'), enter your full name as your digital signature, and click 'Submit Authorization'.")

    add_screenshot(doc, "parent_09_consent.png", "1.11", "Parent Consent & Digital Signing Centre", "Digital consent form allowing parents to authorize school trips and activities securely from their phones.")

    add_heading_1(doc, "Chapter 21: Updating Personal Profile & Contacts")
    add_body_p(doc, "To ensure you receive emergency notifications and fee receipts, ensure your contact details remain accurate:")
    add_bullet_item(doc, "Step 1:", "Click on your name in the top navigation bar and select 'My Profile'.")
    add_bullet_item(doc, "Step 2:", "Review your primary mobile number, secondary emergency contact, and physical residence.")
    add_bullet_item(doc, "Step 3:", "If you update your phone number, an SMS verification code will be sent to confirm ownership.")

    # Chapter 22 & 23 (TROUBLESHOOTING & CONTACTS)
    add_heading_1(doc, "Chapter 22: Troubleshooting & Frequently Asked Questions")
    faq_data = [
        ["I cannot sign in to my account", "1. Confirm you are entering the correct registered email or phone.\n2. Ensure Caps Lock is off.\n3. Click 'Forgot Password?' to reset your password.\n4. If the system says 'User not found', contact school admissions."],
        ["My child is not showing on my dashboard", "Your parent account may not yet be linked to the learner's admission number. Contact admissions with your child's birth certificate or admission letter."],
        ["I paid fees via M-Pesa but my balance hasn't updated", "Payments must be reported using the 'Forward Payment' button. Once submitted, the bursar verifies the code against the bank statement and approves the receipt."],
        ["Why can't I see my child's report card?", "Under school regulations, end-of-term report cards require fee clearance. Please settle outstanding balances or contact the finance office for clearance."],
        ["The app is showing a blank white screen", "1. Check your internet connection.\n2. Refresh the browser page or restart the app.\n3. Clear your browser cache and cookies."]
    ]
    add_styled_table(
        doc,
        ["Common Issue / Question", "Recommended Solution & Troubleshooting Steps"],
        faq_data,
        [Inches(2.5), Inches(4.3)]
    )

    add_heading_1(doc, "Chapter 23: School Administration Contacts & Support")
    add_body_p(doc, "If you require further assistance or have specific questions regarding your child's academic or financial standing, please reach out directly through the official school channels:")
    add_bullet_item(doc, "School Campus:", "Grace Seeds School, Nairobi, Kenya")
    add_bullet_item(doc, "Admissions & Registrar:", "admissions@graceseeds.ac.ke  |  +254 720 000 001")
    add_bullet_item(doc, "Accounts & Finance (Bursar):", "finance@graceseeds.ac.ke  |  +254 720 000 002")
    add_bullet_item(doc, "Academic & CBC Inquiries:", "academics@graceseeds.ac.ke  |  +254 720 000 003")
    add_bullet_item(doc, "Technical Support (Vellox Tech):", "support@velloxtech.com  |  https://smartshule.ac.ke")
    add_bullet_item(doc, "Working Hours:", "Monday – Friday: 7:30 AM – 4:30 PM  |  Saturday: 8:30 AM – 12:30 PM")

    # Appendix Glossary
    add_heading_1(doc, "Appendix: CBC & Technical Glossary")
    glossary = [
        ["CBC / CBE", "Competency-Based Curriculum / Competency-Based Education (Kenya National Curriculum)."],
        ["Formative Assessment", "Continuous assessment of learning progress during teaching (CATs, projects, oral activities)."],
        ["Summative Assessment", "Comprehensive assessment at the conclusion of an instructional term (Terminal Examinations)."],
        ["Strand & Sub-Strand", "Main thematic topic and specific learning sub-topic defined by the KICD curriculum design."],
        ["EE / ME / AE / BE", "Exceeding Expectations (Level 4), Meeting Expectations (Level 3), Approaching Expectations (Level 2), Below Expectations (Level 1)."],
        ["Fee Arrears", "Unpaid fee balance carried over from prior terms into the current billing cycle."],
        ["Fee Credit / Overpayment", "Surplus funds deposited by a guardian exceeding total invoiced liabilities, rolling over into future terms."],
        ["E-Diary", "Electronic Homefun & Communication Diary connecting teachers and parents for daily homework tracking."]
    ]
    add_styled_table(
        doc,
        ["Term / Acronym", "Definition & Context in SmartShule"],
        glossary,
        [Inches(2.0), Inches(4.8)]
    )

    out_path = os.path.join(DOCS_DIR, "SmartShule_Parent_User_Manual.docx")
    doc.save(out_path)
    print(f"Parent User Manual generated successfully: {out_path}")

if __name__ == '__main__':
    build_parent_manual()
