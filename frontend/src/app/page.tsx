"use client";

import { useEffect } from "react";
import { useApp } from "@/context/app-context";
import { BootSplash } from "./providers";

export default function HomePage() {
  const { hydrated, roleHome } = useApp();

  useEffect(() => {
    if (hydrated) window.location.replace(roleHome);
  }, [hydrated, roleHome]);

  return <BootSplash />;
}
