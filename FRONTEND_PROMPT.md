# Gatepass Management System — Frontend Generation Prompt

> This document is the complete, authoritative spec for building the **Gatepass** frontend.
> The backend already exists and is deployed (FastAPI + Supabase). Do not change the backend.
> Build only the frontend against the contract below.

---

## 1. Product Overview

**Gatepass** is an RBAC-based gate pass management system for an organisation's physical security gate.
Employees, vendors and visitors need passes to enter/leave; HR and Admin approve them; Security scans them at the gate and logs movements.

The core lifecycle is a **state machine**:

```
                ┌─────────── cancel (owner or HR/Admin) ───────────┐
                │                                                 ▼
   create    ┌────────┐    approve (HR→employee/vendor,        ┌───────────┐
  (pending)──▶ pending ├───▶  Admin→HR)                   ──▶│ cancelled │
                │        │    reject  (with reason)         ──▶└───────────┘
                │        └──────────────────────────────────▶ rejected
                │                                             (terminal)
                │  admin /admin/expire-stale  (valid_until < now)
                ▼
            expired   (terminal, set by backend cron/admin)
                │
                │  Security scans at gate: movements enforced by sequence
                ▼
            approved (terminal for request; gate_logs track IN/OUT)
```

---

## 2. Tech Stack (mandatory)

| Concern | Choice |
|---|---|
| Framework | **Next.js 15** (App Router), TypeScript `strict: true` |
| Styling | **Tailwind CSS v4** + shadcn/ui |
| Auth | `@supabase/supabase-js` v2 (email/password) |
| Data fetching | `@tanstack/react-query` v5 |
| Forms | `react-hook-form` + `zod` |
| Tables/lists | `@tanstack/react-table` |
| Dates | `date-fns` |
| Icons | `lucide-react` |
| Toasts | `sonner` |

Do **not** add a second data layer. React Query only. No Redux/Zustand for server state.

### Project layout

```
frontend/
├── src/
│   ├── app/
│   │   ├── (auth)/
│   │   │   ├── login/page.tsx
│   │   │   └── layout.tsx
│   │   ├── (app)/
│   │   │   ├── layout.tsx              # shell: sidebar + topbar + notification bell
│   │   │   ├── dashboard/page.tsx
│   │   │   ├── requests/
│   │   │   │   ├── page.tsx            # list / inbox (role-aware)
│   │   │   │   ├── new/page.tsx        # choose type
│   │   │   │   ├── new/leave/page.tsx
│   │   │   │   ├── new/visitor/page.tsx
│   │   │   │   ├── new/vendor/page.tsx
│   │   │   │   └── [id]/page.tsx       # detail + timeline
│   │   │   ├── gate/
│   │   │   │   ├── page.tsx            # accepted list + scan panel (Security/Admin/HR)
│   │   │   │   └── logs/page.tsx
│   │   │   ├── users/page.tsx          # Admin/HR only
│   │   │   ├── notifications/page.tsx
│   │   │   ├── settings/page.tsx       # profile
│   │   │   └── unauthorized/page.tsx
│   │   ├── layout.tsx
│   │   └── page.tsx                    # redirect → /dashboard
│   ├── components/
│   │   ├── ui/                         # shadcn primitives
│   │   ├── app-shell/{sidebar,topbar,notification-bell}.tsx
│   │   ├── requests/{request-card,request-table,request-detail,
│   │   │             status-badge,type-badge,timeline,decision-dialog,
│   │   │             cancel-dialog,request-filters}.tsx
│   │   ├── gate/{accepted-table,scan-panel,gate-log-timeline,
│   │   │          movement-button,next-movement-chip}.tsx
│   │   ├── users/{user-table,user-form-dialog,role-select,deactivate-dialog}.tsx
│   │   └── shared/{empty-state,error-state,role-badge,confirm-dialog}.tsx
│   ├── lib/
│   │   ├── supabase/{client.ts,server.ts,middleware.ts}
│   │   ├── api/{client.ts,users.ts,requests.ts,gate.ts,notifications.ts,admin.ts}
│   │   ├── hooks/{use-current-user,use-notifications,use-requests,use-permissions}.tsx
│   │   ├── permissions.ts              # mirror of backend ROLE_PERMISSIONS
│   │   ├── gate-rules.ts               # mirror of backend movement sequence logic
│   │   └── utils.ts                    # cn(), formatters
│   └── types/api.ts                    # all TS types (see §5)
├── middleware.ts                       # auth redirect
└── .env.local                          # VITE_* / NEXT_PUBLIC_* vars
```

---

## 3. Environment & Auth

### 3.1 Required env vars (server-only secrets must NOT be in the browser)

```bash
# .env.local
NEXT_PUBLIC_SUPABASE_URL=https://<project>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon key>          # SAFE to expose — anon key is RLS-scoped
```

The **`SUPABASE_SERVICE_ROLE_KEY` and `JWT_SECRET` must never appear in frontend code or env files.**
All privileged operations go through the FastAPI backend, which holds the service-role key.

### 3.2 Auth flow (there is NO backend login endpoint — Supabase handles auth directly)

1. User submits email + password to `@supabase/supabase-js`:
   `supabase.auth.signInWithPassword({ email, password })`
2. Supabase returns a session with `access_token` (HS256 JWT, `aud: "authenticated"`).
3. Persist the session via `supabase.auth.onAuthStateChange` and Supabase's own storage
   (`persistSession: true`). Do not hand-roll token storage.
4. Attach the token to **every** backend call:
   `Authorization: Bearer <supabase.session.access_token>`
   Supabase's client auto-refreshes tokens; re-read the token at call time
   (`(await supabase.auth.getSession()).data.session?.access_token`) so you never send a stale token.
5. Backend base URL: `http://localhost:8000/api/v1` (all routes are prefixed `/api/v1`).
   CORS is fully open (`allow_origins=["*"]`).
6. On `401` → clear session, hard redirect to `/login`.
   On `403` → show an "insufficient permission" state, do **not** log out.

### 3.3 Session bootstrap

`GET /api/v1/users/me` returns the authenticated user's profile **and is the source of truth for `role`**.
Do not cache the role in localStorage; store it in a React Query cache keyed `["me"]` and refetch on mount.

```jsonc
// UserOut
{ "id": "uuid", "name": "…", "email": "…",
  "role": "employee|vendor|hr|admin|security",
  "is_active": true,
  "created_at": "2026-01-01T10:00:00Z",
  "updated_at": "2026-01-01T10:00:00Z" }
```

`is_active: false` → the backend returns `403 "User account is inactive"`. Show a blocked-account screen.

### 3.4 Middleware

`middleware.ts` (Next.js): redirect unauthenticated users to `/login`; redirect `/login` when a session exists.
The API remains the authority — the middleware is UX only, never a security boundary.

---

## 4. Roles & UI Permissions

Mirror the backend matrix (`app/core/rbac.py`) in `src/lib/permissions.ts`.
The frontend uses this **only to hide/disable UI**. The backend is the real enforcement layer.

```ts
export const ROLE_PERMISSIONS = {
  employee: ["create_leave_request", "create_visitor_request", "cancel_request"],
  vendor:   ["create_vendor_entry_request", "cancel_request"],
  hr:       ["create_leave_request", "create_visitor_request", "approve_reject_request",
             "cancel_request", "manage_user_accounts", "view_accepted_list", "view_all_requests"],
  admin:    ["approve_reject_request", "cancel_request", "manage_user_accounts",
             "view_accepted_list", "view_all_requests"],
  security: ["view_accepted_list", "log_gate_movement"],
} as const;
```

### Navigation per role

| Nav item | Route | employee | vendor | hr | admin | security |
|---|---|:-:|:-:|:-:|:-:|:-:|
| Dashboard | `/dashboard` | ✅ | ✅ | ✅ | ✅ | ✅ |
| My Requests | `/requests` | ✅ | ✅ | ✅ | ✅ | — |
| New Request | `/requests/new` | ✅ | ✅ | ✅ | — | — |
| Gate / Accepted List | `/gate` | — | — | ✅ | ✅ | ✅ |
| Gate Logs | `/gate/logs` | ✅* | ✅* | ✅ | ✅ | ✅ |
| Users | `/users` | — | — | ✅ | ✅ | — |
| Notifications | `/notifications` | ✅ | ✅ | ✅ | ✅ | ✅ |

\* `/gate/logs` is readable by any authenticated user but auto-scoped to their own requests
(backend filters to own `request_id`s for employee/vendor). Only show the entry point when the user has
at least one request, or route them to `/requests` instead.

### Who can decide (approval matrix) — must be enforced in the UI

| Requester role | Approver role | Notes |
|---|---|---|
| `employee`, `vendor` | `hr` only | |
| `hr` | `admin` only | |
| `admin` | nobody | Admin cannot create gatepass requests (no create permission) |
| `security` | nobody | |
| **anyone** | **never themselves** | Self-approve/reject is `403` for every role |

So: **HR sees the approve/reject buttons only on employee/vendor requests; Admin only on HR requests.**
Additionally an HR user must never see approve/reject on their own requests.

---

## 5. TypeScript Types (copy verbatim into `src/types/api.ts`)

```ts
export type Role = "employee" | "vendor" | "hr" | "admin" | "security";
export type RequestType = "leave" | "visitor" | "vendor";
export type RequestStatus = "pending" | "approved" | "rejected" | "cancelled" | "expired";
export type GateDirection = "in" | "out";
export type LeaveType = "outing" | "full_leave";

export interface User {
  id: string; name: string; email: string; role: Role;
  is_active: boolean; created_at: string; updated_at: string;
}

export interface UserCreate { name: string; email: string; password: string; role: Role; }
export interface UserUpdate { name?: string; role?: Role; is_active?: boolean; }

export interface GatepassRequest {
  id: string;
  type: RequestType;
  status: RequestStatus;
  requester_id: string;
  approver_id: string | null;
  decided_at: string | null;
  rejection_reason: string | null;
  valid_from: string | null;
  valid_until: string | null;

  // leave
  leave_type: LeaveType | null;
  leave_days: number | null;
  leave_reason: string | null;

  // visitor
  visitor_name: string | null;
  visitor_phone: string | null;
  visitor_purpose: string | null;

  // vendor
  vendor_item_direction: GateDirection | null;
  vendor_item_description: string | null;
  vendor_company: string | null;

  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface LeaveCreate {
  leave_type: LeaveType; leave_days?: number; leave_reason?: string; notes?: string;
}
export interface VisitorCreate {
  visitor_name: string; visitor_phone: string; visitor_purpose?: string; notes?: string;
}
export interface VendorCreate {
  vendor_item_direction: GateDirection; vendor_item_description: string;
  vendor_company?: string; notes?: string;
}

export interface GateLog {
  id: string; request_id: string; logged_by: string;
  direction: GateDirection; logged_at: string; notes: string | null;
}

export interface GateLogCreate { request_id: string; direction: GateDirection; notes?: string; }

export interface AcceptedItem {
  id: string; type: RequestType; requester_id: string; requester_name: string | null;
  leave_type: LeaveType | null; visitor_name: string | null; vendor_company: string | null;
  vendor_item_description: string | null;
  valid_from: string | null; valid_until: string | null;
  next_movement: GateDirection | null;   // null == movement complete
}

export interface Notification {
  id: string; user_id: string; title: string; message: string;
  type: NotificationType; related_id: string | null; is_read: boolean; created_at: string;
}

export type NotificationType =
  | "approval" | "rejection" | "vendor_coming"
  | "vendor_still_inside" | "visitor_still_inside"
  | "pass_expiring_soon" | "pending_too_long";

/** Uniform error body — EVERY non-2xx response has exactly this shape. */
export interface ApiError { code: number; message: string; }
```

---

## 6. API Contract

Base: `http://localhost:8000/api/v1`
Headers: `Authorization: Bearer <token>`, `Content-Type: application/json`

**Uniform error shape — the only error format the API ever returns:**

```json
{ "code": 403, "message": "Role 'employee' cannot perform 'approve_reject_request'" }
```

The API client must unwrap `.message` and surface it directly to the user. There is no field-level
error array on 422 — the message is a human-readable joined string like
`body → leave_days: Input should be greater than or equal to 1`, so map 422s to form-level toasts,
not per-field errors.

### 6.1 Users

| Method | Path | Permission | Body / Query | Response |
|---|---|---|---|---|
| POST | `/users/` | `manage_user_accounts` | `UserCreate` | `User` (201) |
| GET | `/users/me` | authenticated | — | `User` |
| GET | `/users/` | `manage_user_accounts` | — | `User[]` |
| PATCH | `/users/{user_id}` | `manage_user_accounts` | `UserUpdate` | `User` |

Rules the UI must reflect (backend returns `403` otherwise):
- Only `admin` may create or assign the `admin` role. HR may create `employee|vendor|hr|security` only.
- HR can neither modify nor deactivate an `admin` account.
- Nobody can deactivate their own account.
- The **last active admin** can never be deactivated or demoted.
- `UserCreate` needs a `password` (min 8 chars in the UI) — accounts are auto-confirmed by the backend.
  There is no invite/reset-password flow: surface a clear "temporary password" UX.

### 6.2 Requests

| Method | Path | Permission | Body | Response |
|---|---|---|---|---|
| POST | `/requests/leave` | `create_leave_request` | `LeaveCreate` | `GatepassRequest` (201) |
| POST | `/requests/visitor` | `create_visitor_request` | `VisitorCreate` | `GatepassRequest` (201) |
| POST | `/requests/vendor` | `create_vendor_entry_request` | `VendorCreate` | `GatepassRequest` (201) |
| GET | `/requests/` | authenticated | — | `GatepassRequest[]` |
| GET | `/requests/{id}` | authenticated | — | `GatepassRequest` |
| POST | `/requests/{id}/approve` | `approve_reject_request` | `{ notes?: string }` *(optional body)* | `GatepassRequest` |
| POST | `/requests/{id}/reject` | `approve_reject_request` | `{ rejection_reason: string }` **required** | `GatepassRequest` |
| POST | `/requests/{id}/cancel` | `cancel_request` | `{ notes?: string }` *(optional body)* | `GatepassRequest` |

Notes:
- `approve` and `cancel` accept an **empty body**. Send `{}` or omit — never `undefined` with
  `Content-Type: application/json` set, and never a bare string.
- All timestamps are ISO-8601 UTC strings. Render in the **viewer's local timezone**
  (e.g. `formatInTimeZone` / `date-fns`), and label them with the timezone.
- `valid_from` / `valid_until` are assigned **by the backend on creation**; the create forms must not
  let users pick them. Show a computed preview using the same rule the backend uses
  (leave: `now → now + leave_days`; visitor/vendor: `now → now + 24h`) as an informational note only.
- `GET /requests/` is already **role-scoped server-side** and returns everything visible
  (no pagination, no filters). Do all type/status/date/search filtering **client-side**.
  Visibility rules:
  - `admin` → all requests
  - `hr` → all **except** requests raised by admins
  - `security` → **approved requests only**
  - `employee` / `vendor` → own requests only
- `GET /requests/{id}` returns **`404`, not `403`**, for requests you may not see
  (IDOR protection). Treat a 404 on detail as "not found / not visible" and show a neutral empty state
  — never reveal that the resource exists.
- A request created through the API is **always** `pending`. Never optimistically show `approved`.

### 6.3 Gate (Security)

| Method | Path | Permission | Body / Query | Response |
|---|---|---|---|---|
| POST | `/gate/log` | `log_gate_movement` | `GateLogCreate` | `GateLog` (201) |
| GET | `/gate/logs?request_id=` | authenticated | `request_id?` | `GateLog[]` |
| GET | `/gate/accepted` | `view_accepted_list` | `type?`, `search?`, `limit=50 (1–200)`, `offset=0` | `AcceptedItem[]` |

`/gate/accepted` is the security desk's primary screen. Design it for speed:
keyboard-first scanning, sticky search, one-tap movement logging, high-contrast status.

### 6.4 Notifications

| Method | Path | Auth | Body / Query | Response |
|---|---|---|---|---|
| GET | `/notifications/?unread_only=false` | any | `unread_only?` | `Notification[]` |
| PATCH | `/notifications/{id}/read` | any | — | `Notification` |
| POST | `/notifications/read-all` | any | — | `{ message: string }` |

- Notifications are **per-user**; the backend scopes every query to the caller.
  A notification belonging to another user yields `404`.
- No pagination — newest first (`created_at` desc). Implement a bell with an unread count badge that
  polls (`refetchInterval: 30_000`) and a full page at `/notifications`.
- `related_id` points at a `GatepassRequest.id` for all notification types → make the row clickable
  and route to `/requests/{related_id}` when the current user can see it (handle 404 silently).
- Mark-as-read mutations optimistically update the bell count.

### 6.5 Admin maintenance

| Method | Path | Auth | Response |
|---|---|---|---|
| POST | `/admin/expire-stale` | **admin only** | `{ "expired": number }` |
| POST | `/admin/run-reminders` | **admin only** | `{ "reminders_sent": number }` |

Gate both behind an explicit admin-only danger zone with a confirm dialog, and show the returned count.
Non-admin callers get `403 "Only admin can use this endpoint"`.

---

## 7. Business Rules to Encode in the UI

### 7.1 Gate movement sequence (mirror in `src/lib/gate-rules.ts`)

The backend strictly enforces the order and rejects anything else with `400`/`409`.
**Render only the one valid action**, so the guard officer never sees a button that will fail.

| Pass | Required sequence | Max movements |
|---|---|---|
| Leave — `outing` | **OUT → IN** | 2 |
| Leave — `full_leave` | **OUT only** | 1 |
| Visitor | **IN → OUT** | 2 |
| Vendor | **IN → OUT** | 2 |

`next_movement` is already computed server-side on `/gate/accepted` (`"in" | "out" | null`):

- `null` → pass is **complete**; show "Completed" / "Closed", no action.
- Otherwise the security desk logs exactly that direction.

Additional backend rejections to handle gracefully in the scan panel:
- `409` — request is not `approved` (pending/rejected/cancelled/expired).
- `400 "Gatepass is not valid yet"` — `now < valid_from`.
- `400 "Gatepass validity has expired"` — `now > valid_until`.
- `400` — wrong-direction scan, or pass already fully used.
- Log rows appear newest-first in `GET /gate/logs`.

**Suggested offline-first approach:** the accepted list is short-lived and gate-critical. Fetch
`/gate/accepted?limit=200`, cache it in React Query with a short `staleTime` (30s) and keep a
`localStorage` snapshot as a read-only fallback so the gate screen still *renders* when the network
drops. **Never** queue a movement log offline — post it to the server and surface the exact error,
because the backend's row-locking RPC is the only thing preventing double-scans.

### 7.2 Validity windows (auto-computed by backend)

- Leave with `leave_days = N` → valid `now → now + N days`.
- Visitor / vendor (and leave without `leave_days`) → valid `now → now + 24 hours`.

Visual treatment: green while inside the window, amber for the last 2 hours
(the backend sends a `pass_expiring_soon` reminder at this threshold), red when expired.

### 7.3 Reminder rules (what the notification centre will contain)

| `type` | Trigger | Recipients |
|---|---|---|
| `approval` | request approved | requester |
| `rejection` | request rejected | requester |
| `vendor_coming` | security logs **IN** on a vendor pass | all HR + Admin |
| `vendor_still_inside` | vendor IN logged, no OUT yet | all HR + Admin |
| `visitor_still_inside` | visitor IN logged, no OUT yet | the requester |
| `pass_expiring_soon` | `valid_until` within 2 h | requester |
| `pending_too_long` | pending > 4 h | HR (for employee/vendor), Admin (for HR) |

Reminders are de-duplicated per `(user, type, related_id)` while unread, so the UI must not
deduplicate on top of that.

### 7.4 Status lifecycle

`pending` is the only mutable state: approve / reject / cancel / expire.
`approved`, `rejected`, `cancelled`, `expired` are terminal.
Only the requester **or** HR/Admin can cancel, and only while `pending`.

---

## 8. Screens

### 8.1 Login
Centered card, product name, email + password, show the API `message` on failure
(e.g. `Invalid login credentials`). No registration — users are created by Admin/HR.

### 8.2 Dashboard
Role-aware summary cards, all derived from `GET /requests/`, `GET /notifications/`, and
`/gate/accepted` where permitted.
- employee / vendor: "My pending", "My approved passes valid now", recent decisions.
- hr: "Awaiting your decision" (employee/vendor requests), "Pending > 4h", expiring soon.
- admin: "Awaiting your decision" (HR requests), fleet totals by status.
- security: "Expected now" (approved with `next_movement`), "Still inside", "Completed today".

### 8.3 Requests list
Client-side filters: type, status, date range, free-text search.
Use tabs/counters: `Pending` / `Approved` / `Rejected` / `Cancelled` / `Expired`.
Pending rows for actionable requesters get prominent **Approve**, **Reject**, **Cancel** buttons
(reject requires a reason — mandatory field; approve and cancel have an optional notes field).
A status badge component with consistent colour per status.

### 8.4 New request
`/requests/new` shows only the types the current role may create:
- employee / hr → **Leave**, **Visitor**
- vendor → **Vendor entry**
Show a two-column form with an inline summary of the fields that will be stored per type.
After submit → invalidate `["requests"]` and redirect to `/requests/{id}`.

### 8.5 Request detail
Header (type, status, requester, created, decided), type-specific fields, validity window
(with a live countdown and colour), notes, and a **timeline** merging
`created_at` → `decided_at` → gate movements from `GET /gate/logs?request_id={id}`.

### 8.6 Gate / Accepted list (`/gate`) — security-first
Toolbar: type filter (`All | Leave | Visitor | Vendor`), debounced search, and prev/next paging
driven by `limit`/`offset`. Table columns: requester, type, details, validity window,
**Next movement** chip, action.
Clicking a row opens a scan panel showing the pass summary and **exactly one** action button
labelled `Log IN` / `Log OUT` (or `Completed` when `next_movement` is null), with an optional note.
On success: toast, invalidate `/gate/accepted` + `/gate/logs`, advance to the next row.
Handle 400/409 errors in-place without clearing the form.

### 8.7 Users (`/users`) — Admin/HR
Table of all users with role, status, created date. Create-user dialog (role options filtered by
the caller's own role). Inline actions: change role, activate/deactivate — each behind a confirm
dialog, each gated on the rules in §6.1, and each surface of the backend's `403` message as the
confirm-dialog error. Disable actions that are known to be invalid for the current caller
(e.g. deactivate on self, role `admin` when the caller is HR) rather than letting them fail.

### 8.8 Notifications
Grouped by `created_at` day, unread highlighted, type icon + colour, "mark all read",
row click → related request.

---

## 9. API Client Rules

```ts
// src/lib/api/client.ts — required behaviour
const res = await fetch(`${BASE}/requests/`, {
  headers: {
    Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
    "Content-Type": "application/json",
  },
});

if (!res.ok) {
  const { code, message } = (await res.json()) as ApiError;  // ALWAYS {code, message}
  throw new ApiError(code, message);
}
return res.status === 204 ? undefined : res.json();
```

- **No** `try/catch` that swallows errors — let React Query surface them, render
  `<ErrorState message={error.message} />`.
- **No** auth header on any call without a live session; redirect to `/login` on 401 only.
- Build URLs with `URLSearchParams`; omit undefined params entirely.
- Keep TanStack Query keys namespaced: `["me"]`, `["requests", filters]`, `["request", id]`,
  `["gate", "accepted", params]`, `["gate", "logs", requestId]`, `["notifications", unreadOnly]`,
  `["users"]`.
- Mutations must invalidate the affected keys (`["requests"]`, `["notifications"]`, `["users"]`).

---

## 10. Known Backend Gaps (build defensively, do not assume they are fixed)

1. **`notifications` table has no migration.** `backend/migrations/` defines only `users`,
   `gatepass_requests` and `gate_logs`, but the code reads/writes `public.notifications`
   (`id`, `user_id`, `title`, `message`, `type`, `related_id`, `is_read`, `created_at`).
   The notifications UI will 500 until that table is created. Build the screens anyway and
   render a clean error state.
2. **`expired` is not a valid DB status.** The Postgres enum `request_status` only allows
   `pending | approved | rejected | cancelled`, yet `POST /admin/expire-stale` writes
   `status = 'expired'` and `RequestStatus` in the Pydantic schema omits it too.
   Treat `expired` as a real frontend state (badge, terminal, no actions) so the UI is correct
   once the backend enum is extended — but expect the call to fail today.
3. **No pagination on `/requests/` or `/users/`** — plan for full-dataset rendering plus
   client-side filtering/virtualisation. `/gate/accepted` is the only paginated endpoint.
4. **`/gate/accepted` `search` is a post-fetch substring match** (case-insensitive, over
   requester name, visitor name, vendor company, vendor item description). It is not a
   prefix or fuzzy search — set expectations accordingly, and debounce it.
5. **No `total` count is returned by `/gate/accepted`.** Render pagination without a total
   ("Page 1", prev/next disabled at the end) rather than inventing a count.
6. **No refresh / forgot-password / avatar / profile-update endpoints.**
   Handle password recovery and any profile edit through `@supabase/supabase-js` directly.
7. **No realtime or websocket channel.** Notifications need polling
   (`refetchInterval: 30_000`).
8. **No CORS restriction and `allow_origins=["*"]` with credentials** — development only.
9. **Times are UTC ISO strings; validity is enforced server-side against UTC.** Always render
   in the viewer's local timezone and show the timezone explicitly near validity windows.

---

## 11. Definition of Done

- [ ] Unauthenticated access to any `(app)` route redirects to `/login`; `/login` redirects away when a session exists.
- [ ] Every screen loads real data from the documented endpoints — no hard-coded/mock arrays.
- [ ] Sidebar renders exactly the items allowed by the §4 role matrix for the logged-in role.
- [ ] Request create forms expose only the types the current role may create.
- [ ] Approve / Reject / Cancel buttons appear only where the approval matrix (§4) permits, never for self-requests, and reject mandates a reason.
- [ ] `/gate` shows `next_movement` and renders exactly one valid scan action per pass, with 400/409 errors shown in-place.
- [ ] Offline network still lets Security read the accepted list; logging a movement always hits the server and shows the server's message.
- [ ] Every error shown in the UI originates from the API's `{code, message}` body.
- [ ] `GET /requests/{id}` 404 renders a neutral "not found" state with no hint that the resource exists.
- [ ] Dates render in local time with an explicit timezone label; expiring-soon (<2h) is visually distinct.
- [ ] Notification bell shows an unread count and marks read on click / in bulk.
- [ ] `tsc --noEmit` clean with `strict: true`; no `any` in `src/types` or `src/lib`.
- [ ] Keyboard accessible: scan-panel actions reachable without a mouse, focus rings intact, dialogs trap focus.
- [ ] Mobile: requests readable at 375px; the gate scan panel is explicitly desktop/tablet-first.

---

## 12. Reference Files (read before coding)

| Concern | Path |
|---|---|
| Role/permission matrix | `backend/app/core/rbac.py` |
| All endpoints | `backend/app/api/*.py` |
| Request/decision rules | `backend/app/services/request_service.py` |
| Gate sequence + accepted list | `backend/app/services/gate_service.py` |
| Reminder rules | `backend/app/services/reminder_service.py` |
| Auth dependency | `backend/app/api/deps.py` |
| Response shapes | `backend/app/schemas/*.py` |
| DB schema | `backend/migrations/001_users.sql`, `002_gatepass_requests.sql`, `003_hardening.sql` |
| Behavioural truth (79 tests) | `backend/tests/test_verify.py` |

The backend is live and testable: `cd backend && uvicorn app.main:app --reload`
(Swagger UI at `http://localhost:8000/docs`).
