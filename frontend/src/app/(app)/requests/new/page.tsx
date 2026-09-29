"use client";
import Link from "next/link";
import { useMe } from "@/lib/hooks/use-current-user";
import { creatableTypes } from "@/lib/permissions";
import { EmptyState } from "@/components/shared/badges";
export default function NewRequest() {
  const { data: me } = useMe(); if (!me) return null;
  const t = creatableTypes(me.role);
  if (!t.length) return <EmptyState text="Your role cannot create requests." />;
  return (
    <div><h1 className="mb-4 text-2xl font-bold">New request</h1>
      <div className="grid gap-3 sm:grid-cols-2">{t.map((x) => <Link key={x} href={`/requests/new/${x}`} className="rounded border-l-4 border-signal bg-white p-5 font-semibold capitalize">{x === "vendor" ? "Vendor entry" : x}</Link>)}</div>
    </div>
  );
}
