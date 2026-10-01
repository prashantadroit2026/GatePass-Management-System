"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/auth-context";
import { ROLE_META } from "@/lib/constants";
import { BootSplash } from "@/components/layout/boot-splash";

export default function HomePage() {
  const { ready, profile, uiRole } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!ready) return;
    if (profile) {
      router.replace(ROLE_META[uiRole].home);
    } else {
      router.replace("/login");
    }
  }, [ready, profile, uiRole, router]);

  return <BootSplash />;
}
