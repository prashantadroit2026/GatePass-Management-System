"use client";

import Image from "next/image";
import { useState } from "react";
import { ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";

export function LogoImage({
  className,
  alt = "",
  priority = false,
  fallbackClassName,
}: {
  className?: string;
  alt?: string;
  priority?: boolean;
  fallbackClassName?: string;
}) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <span
        role="img"
        aria-label={alt || "Logo"}
        className={cn(
          "inline-flex items-center justify-center rounded-lg bg-indigo-600 text-white",
          className,
          fallbackClassName,
        )}
      >
        <ShieldCheck className="h-1/2 w-1/2 max-h-6 max-w-6" aria-hidden />
      </span>
    );
  }

  return (
    <Image
      src="/logo.png"
      alt={alt}
      width={203}
      height={110}
      priority={priority}
      className={className}
      onError={() => setFailed(true)}
    />
  );
}
