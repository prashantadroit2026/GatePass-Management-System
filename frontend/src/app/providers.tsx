"use client";

import { Toaster } from "sonner";
import { AppProvider, useApp } from "@/context/app-context";
import { BootSplash } from "@/components/layout/boot-splash";

function Shell({ children }: { children: React.ReactNode }) {
  const { hydrated } = useApp();
  if (!hydrated) return <BootSplash />;
  return <>{children}</>;
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AppProvider>
      <Shell>{children}</Shell>
      <Toaster richColors position="top-right" closeButton />
    </AppProvider>
  );
}

export { BootSplash };
