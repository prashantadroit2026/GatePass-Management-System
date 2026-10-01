"use client";

import { Toaster } from "sonner";
import { AuthProvider } from "@/context/auth-context";
import { BootSplash } from "@/components/layout/boot-splash";

/**
 * Root providers — only AuthProvider here.
 * AppProvider is instantiated inside the console layout so it's
 * only active for authenticated routes.
 */
export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      {children}
      <Toaster richColors position="top-right" closeButton />
    </AuthProvider>
  );
}

export { BootSplash };
