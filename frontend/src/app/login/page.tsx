"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  Loader2,
  Eye,
  EyeOff,
  ShieldAlert,
  User,
  Shield,
  Building2,
  Sparkles,
} from "lucide-react";
import { useAuth } from "@/context/auth-context";
import { APP_NAME, ORG_NAME, ROLE_META } from "@/lib/constants";

interface DemoAccount {
  role: string;
  name: string;
  roleLabel: string;
  email: string;
  password: string;
  icon: React.ComponentType<{ className?: string }>;
  colorScheme: {
    bg: string;
    border: string;
    hoverBorder: string;
    hoverBg: string;
    iconBg: string;
    iconText: string;
    badgeBg: string;
    badgeText: string;
  };
}

const DEMO_ACCOUNTS: DemoAccount[] = [
  {
    role: "admin",
    name: "Admin User",
    roleLabel: "Admin / HR",
    email: "admin@gatepass.com",
    password: "password123",
    icon: ShieldAlert,
    colorScheme: {
      bg: "bg-indigo-50/50",
      border: "border-indigo-200",
      hoverBorder: "hover:border-indigo-400",
      hoverBg: "hover:bg-indigo-50",
      iconBg: "bg-indigo-100",
      iconText: "text-indigo-600",
      badgeBg: "bg-indigo-100",
      badgeText: "text-indigo-700",
    },
  },
  {
    role: "employee",
    name: "John Doe",
    roleLabel: "Employee",
    email: "employee@gatepass.com",
    password: "password123",
    icon: User,
    colorScheme: {
      bg: "bg-sky-50/50",
      border: "border-sky-200",
      hoverBorder: "hover:border-sky-400",
      hoverBg: "hover:bg-sky-50",
      iconBg: "bg-sky-100",
      iconText: "text-sky-600",
      badgeBg: "bg-sky-100",
      badgeText: "text-sky-700",
    },
  },
  {
    role: "security",
    name: "Security Guard",
    roleLabel: "Security",
    email: "security@gatepass.com",
    password: "password123",
    icon: Shield,
    colorScheme: {
      bg: "bg-amber-50/50",
      border: "border-amber-200",
      hoverBorder: "hover:border-amber-400",
      hoverBg: "hover:bg-amber-50",
      iconBg: "bg-amber-100",
      iconText: "text-amber-600",
      badgeBg: "bg-amber-100",
      badgeText: "text-amber-700",
    },
  },
  {
    role: "vendor",
    name: "Acme Supplies",
    roleLabel: "Vendor",
    email: "vendor@gatepass.com",
    password: "password123",
    icon: Building2,
    colorScheme: {
      bg: "bg-emerald-50/50",
      border: "border-emerald-200",
      hoverBorder: "hover:border-emerald-400",
      hoverBg: "hover:bg-emerald-50",
      iconBg: "bg-emerald-100",
      iconText: "text-emerald-600",
      badgeBg: "bg-emerald-100",
      badgeText: "text-emerald-700",
    },
  },
];

export default function LoginPage() {
  const { signIn, profile, uiRole, ready } = useAuth();
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeDemoRole, setActiveDemoRole] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Already logged in — redirect
  useEffect(() => {
    if (ready && profile) {
      router.replace(ROLE_META[uiRole].home);
    }
  }, [ready, profile, uiRole, router]);

  if (ready && profile) {
    return null;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const err = await signIn(email.trim(), password);
    setLoading(false);
    if (err) {
      setError(err);
    }
  }

  async function handleDemoLogin(account: DemoAccount) {
    setEmail(account.email);
    setPassword(account.password);
    setError(null);
    setLoading(true);
    setActiveDemoRole(account.role);
    const err = await signIn(account.email, account.password);
    setLoading(false);
    setActiveDemoRole(null);
    if (err) {
      setError(err);
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-4 py-8">
      {/* Card */}
      <div className="w-full max-w-lg rounded-2xl border border-border bg-white p-6 sm:p-8 shadow-sm">
        {/* Logo + App name */}
        <div className="mb-6 flex flex-col items-center gap-3">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow">
            <svg
              width="28"
              height="28"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
            >
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
          </div>
          <div className="text-center">
            <h1 className="text-xl font-bold text-slate-900">{APP_NAME}</h1>
            <p className="mt-0.5 text-sm text-slate-500">{ORG_NAME}</p>
          </div>
        </div>

        {/* Heading */}
        <div className="mb-6 text-center sm:text-left">
          <h2 className="text-lg font-semibold text-slate-900">Sign in to your account</h2>
          <p className="mt-1 text-sm text-slate-500">
            Use your company email and password or select a demo account below.
          </p>
        </div>

        {/* Demo Quick Login Section */}
        <div className="mb-6 rounded-xl border border-indigo-100 bg-indigo-50/40 p-3.5">
          <div className="mb-2.5 flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-indigo-900">
              <Sparkles className="h-3.5 w-3.5 text-indigo-600" />
              <span>Instant Demo Login</span>
            </div>
            <span className="text-[11px] text-indigo-500">1-click access</span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {DEMO_ACCOUNTS.map((account) => {
              const Icon = account.icon;
              const isLoggingIn = loading && activeDemoRole === account.role;

              return (
                <button
                  key={account.role}
                  type="button"
                  onClick={() => handleDemoLogin(account)}
                  disabled={loading}
                  className={`group relative flex flex-col items-start rounded-lg border p-2.5 text-left transition ${account.colorScheme.border} ${account.colorScheme.bg} ${account.colorScheme.hoverBorder} ${account.colorScheme.hoverBg} focus:outline-none focus:ring-2 focus:ring-indigo-500/20 disabled:cursor-not-allowed disabled:opacity-60`}
                >
                  <div className="flex w-full items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span
                        className={`flex h-7 w-7 items-center justify-center rounded-md ${account.colorScheme.iconBg} ${account.colorScheme.iconText}`}
                      >
                        {isLoggingIn ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Icon className="h-3.5 w-3.5" />
                        )}
                      </span>
                      <div>
                        <div className="text-xs font-semibold text-slate-800">
                          {account.roleLabel}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="mt-1.5 truncate text-[11px] text-slate-500 w-full font-mono">
                    {account.email}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Divider */}
        <div className="relative mb-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-200" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-white px-2 text-slate-400 font-medium">Or enter credentials</span>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 border border-red-200">
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Email */}
          <div>
            <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-slate-700">
              Email address
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@company.com"
              className="w-full rounded-lg border border-border bg-white px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
            />
          </div>

          {/* Password */}
          <div>
            <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-slate-700">
              Password
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-lg border border-border bg-white px-3 py-2.5 pr-10 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute inset-y-0 right-0 flex items-center px-3 text-slate-400 hover:text-slate-600"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading && !activeDemoRole ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                Signing in…
              </>
            ) : (
              "Sign in"
            )}
          </button>
        </form>

        {/* Footer */}
        <p className="mt-6 text-center text-xs text-slate-400">
          Forgot your password? Contact your system administrator.
        </p>
      </div>

      <p className="mt-6 text-xs text-slate-400">
        &copy; {new Date().getFullYear()} {ORG_NAME}. Powered by {APP_NAME}.
      </p>
    </div>
  );
}
