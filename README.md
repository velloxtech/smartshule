# SmartShule — Competency-Based Curriculum (CBC) School Management System Backend

> Built with **Node.js**, **TypeScript**, and **Hexagonal Architecture (Ports and Adapters)** for complete database, gateway, and frontend agnosticism.

---

## 🏛️ Architecture Overview: Hexagonal (Ports and Adapters)

SmartShule is decoupled into concentric layers following Clean Domain-Driven and Hexagonal principles:

```
src/
├── core/
│   ├── domain/                  # 1. Enterprise Business Rules (Entities, Value Objects)
│   │   ├── academic/            #    - School, AcademicYear, AcademicTerm, ClassRoom, Stream, LearningArea
│   │   ├── user/                #    - User, Role, Student, Teacher, Guardian
│   │   ├── cbc/                 #    - Strand, SubStrand, Formative/Summative Assessment, CBC Report Card
│   │   ├── curriculum-plan/     #    - SchemeOfWork, LessonPlan
│   │   ├── timetable/           #    - Timetable, Period, TimetableSlot
│   │   ├── attendance/          #    - AttendanceRegister, StudentAttendanceEntry
│   │   ├── finance/             #    - FeeStructure, StudentInvoice, Payment
│   │   └── shared/              #    - Base Entity, Result Monad, Errors, IdGenerator
│   │
│   └── ports/                   # 2. Hexagonal Contracts / Interfaces (The Hexagon's Ports)
│       ├── repositories/        #    - Output Ports for persistence (IStudentRepo, ICbcAssessmentRepo, etc.)
│       └── services/            #    - Output Ports for services (IAuthToken, IPaymentGateway, INotification)
│
├── application/                 # 3. Application Use Cases (Input Ports orchestration)
│   ├── auth/                    #    - Register, Login, Refresh, Profile
│   ├── students/                #    - Student Enrollment, Bio update, Guardian linking
│   ├── teachers/                #    - Teacher profiles, Stream assignments
│   ├── academics/               #    - School, Years, Terms, Classes, Learning areas
│   ├── cbc/                     #    - Strands, Formative/Summative grading, CBC Report Card compiler
│   ├── curriculum-plans/        #    - Schemes of work & CBC 40-min lesson plans
│   ├── timetables/              #    - Timetables & double-booking conflict prevention
│   ├── attendance/              #    - Daily & lesson registers with SMS parent alerts
│   ├── finance/                 #    - Itemized Fee structures, Invoices, M-Pesa STK push, Receipts
│   └── analytics/               #    - Executive KPIs, CBC proficiency distribution
│
└── infrastructure/              # 4. Adapters (Driving & Driven infrastructure)
    ├── database/                #    - Secondary Adapter: In-Memory / PostgreSQL / MongoDB / Prisma
    ├── services/                #    - Secondary Adapter: JWT, Bcrypt, M-Pesa Daraja STK, SMS
    └── http/                    #    - Primary Driving Adapter: Express REST API, Middlewares, Routes
```

---

## 🚀 Quick Start

### 1. Prerequisites
- **Node.js**: v18+ (Tested on v24.14.0)
- **npm**: v9+

### 2. Installation
```bash
# Clone or navigate to the project directory
cd SmartShule

# Install dependencies
npm install
```

### 3. Environment Variables
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

### 4. Run Development Server
```bash
npm run dev
```
The server will start at `http://localhost:3000` and automatically seed sample CBC academy data.

### 5. Run Automated Tests
```bash
npm test
```
All unit tests and integration tests will execute against the complete API surface.

---

## 🧪 Postman API Testing

The backend comes with a pre-configured Postman Collection (35+ requests) and Environment.

### Files Location:
1. Collection: [`postman/SmartShule_Postman_Collection.json`](./postman/SmartShule_Postman_Collection.json)
2. Environment: [`postman/SmartShule_Postman_Environment.json`](./postman/SmartShule_Postman_Environment.json)

### Or Download via Direct HTTP:
- Collection: `GET http://localhost:3000/api/v1/docs/postman/collection`
- Environment: `GET http://localhost:3000/api/v1/docs/postman/environment`

### How to Import & Test in Postman:
1. Open Postman -> Click **Import** -> Select both files in the `postman/` folder.
2. In the top-right environment selector in Postman, choose **SmartShule Local Environment**.
3. Run request **`1.1 Login as Admin`** or **`1.2 Login as Teacher`**.
   - *The collection has test scripts that automatically extract the JWT `accessToken` and populate `{{adminToken}}` and `{{teacherToken}}` in your environment!*
4. Execute any request across all 10 modules.

---

## 🔑 Demo Seeded Credentials

| Role | Email | Password | Identifier / Code |
|---|---|---|---|
| **Super Admin** | `admin@smartshule.ac.ke` | `Admin@123` | `usr-admin-01` |
| **Teacher (Science)** | `sarah.mwangi@smartshule.ac.ke` | `Teacher@123` | `EMP-0101` / `TSC/789123` |
| **Teacher (Math)** | `john.ochieng@smartshule.ac.ke` | `Teacher@123` | `EMP-0102` / `TSC/654321` |
| **Guardian** | `mary.kariuki@gmail.com` | `Guardian@123` | `guardian-001` |
| **Student** | *Linked to Mary Kariuki* | — | `ADM-2026-001` (UPI: `NEMIS-K9281A`) |

---

## 📋 Comprehensive Modules Breakdown

### 1. Authentication & RBAC (`/api/v1/auth`)
- `POST /login` — Login user with role & JWT issuance
- `POST /register` — Register administrator, teacher, accountant, or guardian
- `POST /refresh` — Refresh expired JWT access token
- `GET /profile` — Retrieve current authenticated user details

### 2. Academic Structure (`/api/v1/academics`)
- `POST /school` & `GET /school` — School profile, KNEC center code, motto, logo
- `POST /years` & `GET /years` — Academic years (e.g., 2026)
- `POST /terms` & `GET /terms/by-year/:yearId` — Terms 1, 2, 3
- `GET /context` — Current active year and term
- `POST /classes` & `GET /classes` — Grades (PP1 to Grade 12)
- `POST /streams` & `GET /streams/by-class/:classRoomId` — Streams (East, West, etc.)
- `POST /learning-areas` & `GET /learning-areas` — CBC Learning Areas (Integrated Science, Mathematics, Pre-Technical Studies, etc.)

### 3. Students & Guardians (`/api/v1/students`)
- `POST /` — Register learner with Admission #, UPI/NEMIS #, CBC Grade, Stream, and Guardian details
- `GET /` — List students with filters (grade, stream, search keyword)
- `GET /:id` — Get full student profile with linked guardians & academic records
- `PUT /:id` — Update bio, promote or transfer to another stream/grade
- `POST /link-guardian` — Link parent/guardian to student

### 4. Teachers & Staff (`/api/v1/teachers`)
- `POST /` — Register teacher with TSC number, employee ID, specialization areas
- `GET /` — List all teachers with assignments
- `GET /:id` — Get teacher profile
- `POST /assign-stream` — Assign teacher to class streams

### 5. CBC Competency Assessment & Report Cards (`/api/v1/cbc`)
- `POST /strands` & `GET /strands/by-learning-area/:learningAreaId` — Curriculum strands
- `POST /sub-strands` & `GET /sub-strands/by-strand/:strandId` — Sub-strands with Specific Learning Outcomes
- `POST /formative` & `GET /formative` — Record continuous formative assessment:
  - Performance Rubric: `EE` (Exceeding Expectations - 4), `ME` (Meeting Expectations - 3), `AE` (Approaching Expectations - 2), `BE` (Below Expectations - 1)
  - Core Competencies: Communication & Collaboration, Critical Thinking, Digital Literacy, etc.
  - Core Values: Love, Responsibility, Respect, Integrity, Peace, etc.
  - Evidence notes & portfolio manual references
- `POST /summative` & `GET /summative` — End of term strand evaluations & overall performance
- `POST /report-cards/generate` — Automated compilation of CBC Report Card (aggregating learning area performances, core competencies, values, attendance, and head teacher remarks)
- `GET /report-cards` — Retrieve comprehensive CBC report card
- `GET /analytics` — CBC proficiency distribution (% EE, ME, AE, BE)

### 6. Schemes of Work & Lesson Plans (`/api/v1/curriculum`)
- `POST /schemes` & `GET /schemes` — Teacher creates scheme of work with weeks, lessons, learning outcomes, inquiry questions, experiences, resources, assessment methods
- `POST /schemes/:id/entries` — Add lessons to scheme
- `POST /schemes/:id/submit` — Submit scheme for review
- `POST /schemes/:id/review` — Head Teacher / HOD approves or rejects scheme
- `POST /lesson-plans` & `GET /lesson-plans` — 40-minute CBC structured lesson plans with introduction, step-by-step development, conclusion, and teacher self-reflection

### 7. Timetables & Schedules (`/api/v1/timetables`)
- `POST /` — Create stream timetable
- `POST /slots` — Assign subject, teacher, room to period (with **automated conflict check** preventing teacher or room double-booking)
- `GET /stream` — Stream weekly timetable schedule
- `GET /teacher` — Teacher weekly timetable view

### 8. Class Registers & Attendance (`/api/v1/attendance`)
- `POST /` — Mark daily morning/afternoon or lesson register
  - Optional SMS alert dispatch to parents when learner is marked absent
- `GET /daily` — View register for a specific date and stream
- `GET /report` — Stream attendance rate and session summaries
- `GET /student/:studentId` — Learner individual attendance statistics

### 9. Fee Billing & Payments (`/api/v1/finance`)
- `POST /structures` & `GET /structures` — Itemized fee structures by grade and term (Tuition, CBC assessment kits, meals, activity levy)
- `POST /invoices/generate` — Generate invoices individually or in bulk for all students in a grade
- `POST /mpesa/stk-push` — Trigger Safaricom M-Pesa Daraja STK Push prompt directly to parent's phone
- `POST /mpesa/callback` — Webhook endpoint for M-Pesa IPN payment confirmation & instant reconciliation
- `POST /payments` — Record Bank Transfer, Cash, or Cheque payment with auto-generated receipt number
- `GET /statements/:studentId` — Full student fee statement, debit/credit ledger, and balance
- `GET /defaulters` — Fee arrears and defaulters report with parent contacts

### 10. School Executive Analytics (`/api/v1/analytics`)
- `GET /dashboard` — Executive summary: total students, teachers, fee collection rate %, outstanding arrears, attendance today, CBC proficiency distribution

---

## 🔌 Swapping Database Adapters

Because this system strictly follows **Hexagonal Architecture**:
- All business logic lives in `src/core/domain/` and `src/application/`.
- Repositories are defined as interfaces in `src/core/ports/repositories/`.
- To switch to **PostgreSQL with Prisma**, **MongoDB with Mongoose**, or **MySQL with TypeORM**:
  1. Create a new adapter in `src/infrastructure/database/<your-db>/` implementing the repository interfaces (e.g. `IStudentRepository`, `IFeeRepository`).
  2. Instantiate your adapter in `src/infrastructure/container.ts`.
  3. No domain entity or application use case needs to change!

---

## 📜 License
ISC License. Designed and developed for modern Competency-Based Curriculum school institutions.
