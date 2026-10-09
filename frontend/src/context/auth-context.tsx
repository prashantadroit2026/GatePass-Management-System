"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { Session, User } from "@supabase/supabase-js";
import { authApi, usersApi, type ApiUser } from "@/lib/api";
import { BootSplash } from "@/components/layout/boot-splash";

// ---------------------------------------------------------------------------
// Role mapping — backend uses "hr" and "admin" but UI still has 4 nav areas:
//   admin / hr → "admin" area,  employee, vendor, security
// ---------------------------------------------------------------------------

type UIRole = "admin" | "employee" | "vendor" | "security";

function backendToUIRole(role: string | undefined): UIRole {
  if (!role) return "employee";
  if (role === "admin" || role === "hr") return "admin";
  if (role === "vendor") return "vendor";
  if (role === "security") return "security";
  return "employee";
}

// ---------------------------------------------------------------------------
// Context shape
// ---------------------------------------------------------------------------

interface AuthContextValue {
  /** Auth is initialised (either logged-in or not) */
  ready: boolean;
  /** Supabase session, null when logged out */
  session: Session | null;
  /** Supabase auth user */
  user: User | null;
  /** Full profile from /api/v1/users/me  */
  profile: ApiUser | null;
  /** UI-level role (mapped from backend role) */
  uiRole: UIRole;
  /** Sign-in helper — returns error string on failure */
  signIn: (email: string, password: string) => Promise<string | null>;
  /** Sign-out */
  signOut: () => Promise<void>;
  /** Reload profile from backend (use after profile edits) */
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<ApiUser | null>(null);
  const bootedRef = useRef(false);

  const loadProfile = useCallback(async () => {
    try {
      const me = await usersApi.me();
      setProfile(me);
    } catch (err) {
      setProfile(null);
      // If the backend rejected our token (expired JWT / deactivated or
      // deleted user), drop the stale session too — otherwise the app is
      // stuck with a session but no profile and keeps bouncing to /login.
      const status = (err as Error & { status?: number }).status;
      if (status === 401 || status === 403) {
        setSession(null);
        setUser(null);
        await authApi.signOut().catch(() => {});
      }
    }
  }, []);

  // Initial session bootstrap
  useEffect(() => {
    if (bootedRef.current) return;
    bootedRef.current = true;

    authApi.getSession().then(({ data }) => {
      const sess = data.session;
      setSession(sess);
      setUser(sess?.user ?? null);
      if (sess) {
        loadProfile().finally(() => setReady(true));
      } else {
        setReady(true);
      }
    });

    // Subscribe to auth state changes
    const { data: listener } = authApi.onAuthStateChange(async (_event, sess) => {
      setSession(sess);
      setUser(sess?.user ?? null);
      if (sess) {
        await loadProfile();
      } else {
        setProfile(null);
      }
    });

    return () => {
      listener.subscription.unsubscribe();
    };
  }, [loadProfile]);

  const signIn = useCallback(
    async (email: string, password: string): Promise<string | null> => {
      const { error } = await authApi.signIn(email, password);
      if (error) return error.message;
      return null;
    },
    [],
  );

  const signOut = useCallback(async () => {
    await authApi.signOut();
  }, []);

  const refreshProfile = useCallback(async () => {
    await loadProfile();
  }, [loadProfile]);

  const uiRole = useMemo(() => backendToUIRole(profile?.role), [profile]);

  const value = useMemo<AuthContextValue>(
    () => ({
      ready,
      session,
      user,
      profile,
      uiRole,
      signIn,
      signOut,
      refreshProfile,
    }),
    [ready, session, user, profile, uiRole, signIn, signOut, refreshProfile],
  );

  if (!ready) return <BootSplash />;

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
