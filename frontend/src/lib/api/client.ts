import { supabase } from "@/lib/supabase/client";
import type { ApiError } from "@/types/api";

const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1";

export class ApiRequestError extends Error {
  constructor(public code: number, message: string) { super(message); }
}

let isRedirecting = false;

type Opts = { method?: string; body?: unknown; params?: Record<string, string | number | undefined> };

export async function api<R>(path: string, o: Opts = {}): Promise<R> {
  const token = (await supabase.auth.getSession()).data.session?.access_token;
  if (!token) {
    if (!isRedirecting && typeof window !== "undefined" && window.location.pathname !== "/login") {
      isRedirecting = true;
      window.location.href = "/login";
    }
    throw new ApiRequestError(401, "Not signed in");
  }

  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(o.params ?? {})) if (v !== undefined && v !== "") qs.set(k, String(v));

  let res: Response;
  try {
    res = await fetch(`${BASE}${path}${qs.size ? `?${qs}` : ""}`, {
      method: o.method ?? "GET",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: o.body !== undefined ? JSON.stringify(o.body) : undefined,
    });
  } catch {
    throw new ApiRequestError(0, `Cannot reach the API at ${BASE}. Is the backend running?`);
  }

  if (!res.ok) {
    let e: ApiError;
    try {
      e = (await res.json()) as ApiError;
    } catch {
      e = { code: res.status, message: "An unexpected error occurred" };
    }

    if (res.status === 401) {
      if (!isRedirecting) {
        isRedirecting = true;
        await supabase.auth.signOut();
        if (typeof window !== "undefined") {
          const redirectUrl = `/login?error=${encodeURIComponent(e.message || "Session expired")}`;
          window.location.href = redirectUrl;
        }
      }
    }
    throw new ApiRequestError(e.code ?? res.status, e.message);
  }

  return res.status === 204 ? (undefined as R) : ((await res.json()) as R);
}

