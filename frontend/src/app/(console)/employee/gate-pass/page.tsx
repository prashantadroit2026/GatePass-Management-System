"use client";

import { PageHeader } from "@/components/ui/page-header";
import { GatePassForm } from "@/components/employee/gate-pass-form";

export default function GatePassRequestPage() {
  return (
    <>
      <PageHeader
        eyebrow="Employee"
        title="Gate Pass Request"
        description="Full time covers the whole day; half time adds an expected return time for the security desk."
      />
      <div className="max-w-3xl">
        <GatePassForm />
      </div>
    </>
  );
}
