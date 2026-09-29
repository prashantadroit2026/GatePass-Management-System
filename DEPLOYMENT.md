# Cloudflare & Cloud Deployment Guide

This guide explains how to deploy the **Gatepass Management System**:
1. **Frontend (Next.js)** to **Cloudflare Pages**
2. **Backend (FastAPI)** to **Render / Railway / Fly.io** (or Docker)
3. **Database** on **Supabase**

---

## 1. Deploy Frontend to Cloudflare Pages

### Option A: Git Integration (Automatic CI/CD)

1. Push your repository to GitHub or GitLab.
2. Go to the [Cloudflare Dashboard](https://dash.cloudflare.com/) → **Workers & Pages**.
3. Click **Create Application** → **Pages** → **Connect to Git**.
4. Select your repository and configure the build settings:
   - **Framework Preset**: `Next.js`
   - **Root Directory**: `frontend`
   - **Build Command**: `npm run build`
   - **Build Output Directory**: `.next`
5. Set Environment Variables in Cloudflare Pages settings:
   - `NEXT_PUBLIC_SUPABASE_URL`: Your Supabase URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Your Supabase Anon key
   - `NEXT_PUBLIC_API_URL`: Your deployed Backend API URL (e.g. `https://gatepass-api.onrender.com/api/v1`)

### Option B: Deploy via Wrangler CLI

```bash
cd frontend
npm install -g wrangler
wrangler pages deploy .next --project-name=gatepass-frontend
```

---

## 2. Deploy Backend (FastAPI Python)

Deploy your backend using the provided `Dockerfile` or `Procfile`.

### Using Render / Railway / Fly.io

1. Connect your repository to **Render** or **Railway**.
2. Set the root directory to `backend`.
3. Configure the environment variables:
   - `SUPABASE_URL`: Your Supabase URL
   - `SUPABASE_ANON_KEY`: Your Supabase Anon key
   - `SUPABASE_SERVICE_ROLE_KEY`: Your Supabase Service Role key
   - `JWT_SECRET`: Your JWT Secret
   - `CORS_ORIGINS`: `https://gatepass-frontend.pages.dev` (your Cloudflare Pages domain)

---

## 3. Verify CORS & Connection

1. Test API health endpoint: `https://<your-backend-domain>/health`
2. Open your Cloudflare Pages application domain and verify sign-in and request actions communicate properly with your backend.
