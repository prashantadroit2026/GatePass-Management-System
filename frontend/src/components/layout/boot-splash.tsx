"use client";

import Image from "next/image";

/** Full-screen branded splash shown while the demo state boots and during role redirects. */
export function BootSplash() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-slate-950 px-6 text-white">
      <div className="relative">
        <div className="absolute inset-0 animate-ping rounded-2xl bg-indigo-500/30" aria-hidden />
        <div className="relative rounded-2xl bg-white p-3 shadow-xl shadow-indigo-500/20">
          <Image src="/logo.png" alt="" width={203} height={110} priority className="h-14 w-auto" />
        </div>
      </div>
      <div className="text-center">
        <p className="text-lg font-semibold tracking-tight">GatePass</p>
        <p className="mt-1 text-sm text-slate-400">Loading workspace…</p>
      </div>
      <div className="h-1.5 w-56 overflow-hidden rounded-full bg-slate-800">
        <div className="h-full w-1/3 animate-[slide_1.1s_ease-in-out_infinite] rounded-full bg-indigo-400" />
      </div>
      <style>{`@keyframes slide { 0% { transform: translateX(-100%); } 100% { transform: translateX(300%); } }`}</style>
    </div>
  );
}
