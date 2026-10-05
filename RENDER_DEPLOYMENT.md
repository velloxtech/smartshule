# 🚀 SmartShule Render + Supabase Deployment Guide

This guide walks you through deploying the unified **SmartShule CBC Management Platform** (Node.js/Express API + Vite React Frontend in `Frontend/smartshule`) to **Render** using Docker, connected directly to your **Supabase PostgreSQL database**.

---

## 🌟 Architecture Overview

- **Unified Container**: Both the Express API and the built React/Vite SPA ([Frontend/smartshule](file:///home/don/Documents/VELLOX%20TECH%20PROJECTS/SmartShule/Frontend/smartshule)) run in a single lightweight production container.
- **Single Domain**: Express serves the React SPA at `/` and all web routes, while serving the API at `/api/v1`.
- **Database**: External cloud PostgreSQL on **Supabase** with automated SSL handling and automatic table initialization.
- **Port Management**: Express dynamically binds to `$PORT` provided by Render.

---

## ⚡ Step 1: Obtain your Supabase Database URL

1. Go to your [Supabase Dashboard](https://supabase.com/dashboard).
2. Select your project and navigate to **Project Settings** (gear icon) > **Database**.
3. Under **Connection string**, select **URI**:
   - **Direct Connection** (recommended for Render long-running services):
     ```
     postgresql://postgres:[YOUR-PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres
     ```
   - **Connection Pooler / Supavisor (Session mode or Transaction mode)**:
     ```
     postgresql://postgres.[PROJECT-REF]:[YOUR-PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres
     ```
4. Replace `[YOUR-PASSWORD]` with your actual database password.
   *(Note: SmartShule automatically detects `supabase` in the URL and enables secure SSL with `{ rejectUnauthorized: false }`.)*

---

## 🚀 Step 2: Deploy to Render

### Option A: Using Render Blueprints (`render.yaml`) (Fastest)

1. Push your code to GitHub / GitLab.
2. In the [Render Dashboard](https://dashboard.render.com), click **New +** > **Blueprint**.
3. Select your repository.
4. Render will detect [render.yaml](file:///home/don/Documents/VELLOX%20TECH%20PROJECTS/SmartShule/render.yaml).
5. When prompted for `DATABASE_URL`, paste your **Supabase PostgreSQL URI**.
6. Click **Apply**. Render will build the Docker container and start your full-stack app!

---

### Option B: Manual Web Service Setup on Render

1. Log in to the [Render Dashboard](https://dashboard.render.com).
2. Click **New +** > **Web Service**.
3. Connect your repository.
4. Configure the service settings:
   - **Name**: `smartshule` (or your preferred name)
   - **Language / Runtime**: `Docker`
   - **Dockerfile Path**: `./Dockerfile`
   - **Docker Context**: `.`
   - **Instance Type**: `Free` or `Starter`
5. Under **Advanced Settings**:
   - **Health Check Path**: `/health`
   - **Auto-Deploy**: `Yes`
   - **Disk (Optional)**: If you need persistent storage for WhatsApp QR session tokens or local uploaded learner photos without Cloudinary/S3:
     - Name: `smartshule-data`
     - Mount Path: `/app/data`
     - Size: `1 GB`
6. Add the following **Environment Variables**:

| Variable | Value | Notes |
| :--- | :--- | :--- |
| `NODE_ENV` | `production` | Enables production optimizations |
| `PORT` | `10000` | Injected by Render |
| `DB_TYPE` | `postgres` | Tells the app to use PostgreSQL |
| `DATABASE_URL` | `postgresql://postgres:[PASSWORD]@db.[REF].supabase.co:5432/postgres` | Your Supabase connection URI |
| `JWT_SECRET` | *32+ character random secret* | Used for JWT authentication |
| `JWT_REFRESH_SECRET` | *32+ character random secret* | Used for refresh tokens |
| `CORS_ORIGIN` | `*` | Or your custom domain |
| `APP_URL` | `https://smartshule-vg15.onrender.com` | Production application base URL |
| `FRONTEND_URL` | `https://smartshule-vg15.onrender.com` | Production frontend URL |
| `KCB_BUNI_BASE_URL` | `https://uat.buni.kcbgroup.com` | KCB Buni Sandbox API Base URL |
| `KCB_BUNI_SHORTCODE` | `522533` | School Paybill Shortcode |
| `KCB_BUNI_SHARED_SHORTCODE` | `true` | Shared Paybill rail identifier |
| `KCB_BUNI_CONSUMER_KEY` | `smtVhniT3fWOyKhswLJerkPSYlca` | KCB Sandbox Consumer Key |
| `KCB_BUNI_CONSUMER_SECRET` | `TDYUByGQIY1uQKcX7kYFtc9Stk5IkLbbDKhEpGe_7UAa` | KCB Sandbox Consumer Secret |
| `KCB_BUNI_CALLBACK_URL` | `https://smartshule-vg15.onrender.com/api/v1/finance/kcb-buni/callback` | Public HTTPS STK Push callback URL |
| `MPESA_CALLBACK_URL` | `https://smartshule-vg15.onrender.com/api/v1/finance/mpesa/callback` | Public HTTPS fallback M-Pesa callback |
| `SMS_PROVIDER` | `africastalking` | Or `simulator` |
| `STORAGE_PROVIDER` | `local` | Or `cloudinary` / `s3` |

7. Click **Create Web Service**.
8. Once built, visit your Render URL: `https://smartshule-vg15.onrender.com`. You will see the login page and all tables will have been automatically initialized in Supabase!

---

## 🏦 KCB Buni Developer Gateway & Payment Callback Setup

SmartShule is configured with the **KCB Buni Developer API Platform (UAT / Sandbox)** on Paybill `522533` with account reference `8048859#<learner>`.

### Configured Callbacks on Render (`https://smartshule-vg15.onrender.com`):

1. **M-Pesa Express STK Push Callback:**
   - **URL**: `https://smartshule-vg15.onrender.com/api/v1/finance/kcb-buni/callback`
   - **Method**: `POST`
   - **Description**: Handles real-time transaction outcome notifications for STK Push fee payments initiated from the SmartShule Finance portal or parent fee payment link. Updates fee invoice, records the payment, and triggers an instant SMS receipt.

2. **C2B Bill Validation (Paybill 522533):**
   - **URL**: `https://smartshule-vg15.onrender.com/api/v1/finance/kcb-buni/validate`
   - **Method**: `POST`
   - **Description**: Called by KCB when a parent initiates a Paybill deposit. Validates the learner account reference (`8048859#...`), student admission number, and outstanding balance before accepting funds.

3. **C2B Bill Confirmation (Paybill 522533 / KCB App):**
   - **URL**: `https://smartshule-vg15.onrender.com/api/v1/finance/kcb-buni/confirm`
   - **Method**: `POST`
   - **Description**: Called by KCB upon successful completion of the Paybill deposit. Performs idempotent payment recording into the cash flow ledger and dispatches parent SMS receipt.

4. **Legacy M-Pesa Fallback Callback:**
   - **URL**: `https://smartshule-vg15.onrender.com/api/v1/finance/mpesa/callback`
   - **Method**: `POST`

### Registering URLs in KCB Buni Developer Portal:
1. Log in to [https://buni.kcbgroup.com](https://buni.kcbgroup.com).
2. Go to **My Apps** > Select your SmartShule App.
3. In the App Details & API subscriptions, paste:
   - **Callback URL / Webhook**: `https://smartshule-vg15.onrender.com/api/v1/finance/kcb-buni/callback`
   - **Validation URL**: `https://smartshule-vg15.onrender.com/api/v1/finance/kcb-buni/validate`
   - **Confirmation URL**: `https://smartshule-vg15.onrender.com/api/v1/finance/kcb-buni/confirm`
4. Save and publish your app settings.

---

## 💻 Local Testing with Supabase

To test the container locally against your Supabase database:

```bash
# 1. Set your Supabase URL in your local .env file:
# DATABASE_URL="postgresql://postgres:[PASSWORD]@db.[REF].supabase.co:5432/postgres"

# 2. Build the Docker image
npm run docker:build

# 3. Run the container
docker run -p 3000:3000 --env-file .env smartshule:latest
```

Visit [http://localhost:3000](http://localhost:3000) to verify!
