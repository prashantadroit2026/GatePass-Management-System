# Cloudflare & Cloud Deployment Guide

This guide explains how to deploy the **Gatepass Management System**:
1. **Frontend (Next.js)** to **Cloudflare Workers** (via OpenNext)
2. **Backend (FastAPI)** to **Render / Railway / Fly.io** (or Docker)
3. **Database** on **Supabase**

---

## 1. Deploy Frontend to Cloudflare Workers

The frontend uses the [`@opennextjs/cloudflare`](https://opennext.js.org/cloudflare) adapter to run Next.js on Cloudflare Workers. Config files: `frontend/wrangler.jsonc` + `frontend/open-next.config.ts`.

### Option A: Git Integration (Workers Builds — Automatic CI/CD)

1. In the Cloudflare Dashboard, open your Worker → **Settings** → **Build** → **Connect to Git** and select this repository.
2. Configure the build commands:

   - **Build command:** `cd frontend && npm install && npx opennextjs-cloudflare build`
   - **Deploy command:** `cd frontend && npx wrangler deploy`

3. Set Environment Variables (Build -> Variables, these are inlined at build time by Next.js):
   - `NEXT_PUBLIC_SUPABASE_URL`: Your Supabase URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Your Supabase Anon key
   - `NEXT_PUBLIC_API_URL`: Your deployed Backend API URL (e.g. `https://gatepass-api.onrender.com/api/v1`)

### Option B: Deploy via Wrangler CLI

```bash
cd frontend
npm install
npx opennextjs-cloudflare build   # runs next build + bundles the worker
npx wrangler deploy
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
