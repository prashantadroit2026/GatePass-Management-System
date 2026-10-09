# Switching to Cloudflare D1 (replacing Supabase)

## One-time setup

1. **Create the database** (from `backend/`):
   ```bash
   npx wrangler d1 create gatepass-db
   ```
   Note the `database_id` and your Cloudflare **account_id** from the output.

2. **Apply schema + demo users:**
   ```bash
   npx wrangler d1 execute gatepass-db --remote --file=d1/schema.sql
   npx wrangler d1 execute gatepass-db --remote --file=d1/seed.sql
   ```
   Demo accounts (all password `password123`): admin@ / hr@ / employee@ / security@ / vendor@gatepass.com

3. **Create an API token**: Cloudflare dashboard → My Profile → API Tokens →
   "Create Custom Token" → enable **Account → D1 → Edit**.

4. **Set these on Render** (backend service), and delete the Supabase vars:
   | Variable | Value |
   |---|---|
   | `D1_ACCOUNT_ID` | your Cloudflare account id |
   | `D1_DATABASE_ID` | the id from step 1 |
   | `D1_API_TOKEN` | the token from step 3 |
   | `JWT_SECRET` | any long random string (e.g. `openssl rand -hex 32`) |

5. **Frontend (Cloudflare Workers dashboard → Settings → Variables):**
   - DELETE `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - SET `NEXT_PUBLIC_API_URL` = your Render backend URL + `/api/v1`

## Local development

No Cloudflare needed: when the D1_* vars are unset, the backend automatically
uses a local SQLite file (`LOCAL_DB_PATH`, default `gatepass_dev.db`).

```bash
cd backend && python -m venv .venv && .venv/bin/pip install -r requirements.txt
python -c "import sqlite3; c=sqlite3.connect('gatepass_dev.db'); c.executescript(open('d1/schema.sql').read()); c.executescript(open('d1/seed.sql').read()); c.commit()"
JWT_SECRET=dev-secret .venv/bin/uvicorn app.main:app --port 8000
```

## What changed vs Supabase

- Database: Cloudflare D1 (SQLite, free tier) via its HTTP API — see `app/db.py`.
- Auth: handled by this backend (`POST /api/v1/auth/login` returns a JWT),
  passwords hashed with PBKDF2 in `users.password_hash`. No more Supabase Auth.
- RLS is gone (not needed: the backend is the only DB client; RBAC is in code).
- Existing Supabase data was NOT migrated (demo-stage data). To export later,
  use Supabase dashboard → Table → CSV, then import via `wrangler d1 execute`.
