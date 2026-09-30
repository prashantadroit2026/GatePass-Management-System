"use client";

import { PageHeader } from "@/components/ui/page-header";
import { VisitorPassForm } from "@/components/employee/visitor-pass-form";

export default function VisitorPassPage() {
  return (
    <>
      <PageHeader
        eyebrow="Employee"
        title="Visitor / Client Gate Pass"
        description="Register guests before they arrive — name, contact, company, slot and purpose go straight to the gate."
      />
      <div className="max-w-3xl">
        <VisitorPassForm />
      </div>
    </>
  );
}
