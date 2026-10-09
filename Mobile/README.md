# SmartShule Mobile App

A Flutter application tailored for **Teachers** and **Parents** within the SmartShule School Management & CBC Performance Tracking System.

---

## School Brand Theme

The app uniformly uses the school's official **Maroon** identity (`#7A1228` and its complementary tints) across every part of the experience:
- All AppBars & Header banners
- Login role selectors & action buttons
- Bottom navigation bar destinations & active selection pills
- Summary metrics, fee cards, balance displays, and action chips
- Dialogs, modal sheets, and confirmation SnackBars

---

## Live Backend Integration

- **Default Endpoint:** `https://smartshule-vg15.onrender.com/api/v1`
- Live integration with:
  - `/auth/login` — Authentication & JWT tokens
  - `/announcements` — School notices and broadcast circulars
  - `/students` — Learner rosters and guardian linkage
  - `/attendance` — Roll-call registers and geofence tracking
  - `/cbc/formative` — Kenyan CBC competency scoring
  - `/finance/invoices` — Fee statements and M-Pesa tracking
- Configurable directly from the **Account & Settings** screen at runtime.

---

## Portals & Features

### 1. Teacher Portal
- **Dashboard:**
  - Class overview metrics (Assigned Grade, Learner attendance %, pending assessments).
  - Geofence campus verification indicator.
  - Today's timetable and next lesson.
- **Learner Roll Call & Attendance:**
  - Grade & stream selector (e.g., Grade 3 East).
  - Real-time attendance counters (Present, Late, Absent, Excused).
  - Quick action to mark all present and push roll call to the backend.
- **CBC Assessment Grading:**
  - Aligned with Kenyan Competency-Based Curriculum (CBC).
  - Select Learning Area, Strand, and Sub-strand.
  - 4-Tier Rubric:
    - **EE:** Exceeding Expectations (Level 4)
    - **ME:** Meeting Expectations (Level 3)
    - **AE:** Approaching Expectations (Level 2)
    - **BE:** Below Expectations (Level 1)
  - Qualitative teacher portfolio remarks & evidence submission.
- **Circulars & Notices:**
  - View school broadcasts.
  - Post direct class announcements to parents.

---

### 2. Parent Portal
- **Dashboard:**
  - Child switcher for parents with multiple learners (e.g. Liam - Grade 3, Faith - Grade 1).
  - Real-time daily arrival & attendance status badge (`Present at 07:42 AM`).
  - Term 3 fee balance summary with one-tap payment.
  - CBC performance highlights.
- **CBC Academic Broadsheet:**
  - View performance across all learning areas.
  - Rubric grades (EE, ME, AE, BE) and teacher feedback remarks.
  - Download Term Report Card (PDF).
- **Fees & Lipa na M-Pesa:**
  - Outstanding balance overview with maroon gradient card.
  - Integrated Lipa na M-Pesa modal with Paybill, Account Number, and STK Push.
  - Itemized fee invoices (Tuition, Meals, Activities).
  - Payment receipt history with M-Pesa transaction codes.
- **Learner Attendance & Absence Reporting:**
  - Monthly attendance breakdown and daily check-in logs.
  - "Notify School of Planned Absence / Sick Leave" submission tool.

---

## Running the App

```bash
cd Mobile
flutter run
```

### Running Tests & Linting
```bash
flutter analyze
flutter test
```
