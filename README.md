# Gatepass Management System

RBAC-based gate pass system for employees, vendors, visitors, HR, Admin and Security.

## Phase 1 – Users + Auth + RBAC

### Folder Structure

```
gatepass/
├── backend/
│   ├── app/
│   │   ├── api/
│   │   ├── core/          # rbac.py lives here
│   │   ├── models/
│   │   ├── schemas/
│   │   ├── services/
│   │   ├── config.py
│   │   ├── db.py
│   │   └── main.py
│   ├── migrations/
│   │   └── 001_users.sql
│   ├── requirements.txt
│   └── .env.example
└── README.md
```

### Setup Steps

1. Create a Supabase project
2. Copy `.env.example` → `.env` and fill in the keys
3. Run `migrations/001_users.sql` in Supabase SQL Editor
4. Create the first Admin user in Supabase Auth → insert into `public.users`
5. `pip install -r requirements.txt`
6. Start the API: `uvicorn app.main:app --reload`
