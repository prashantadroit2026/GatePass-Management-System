"use client";

import { PageHeader } from "@/components/ui/page-header";
import { VendorScheduleForm } from "@/components/vendor/schedule-form";

export default function VendorSchedulePage() {
  return (
    <>
      <PageHeader
        eyebrow="Vendor · public"
        title="Schedule an arrival"
        description="Step 1 company & contact · Step 2 date, time slot and host · Step 3 vehicle and purpose. You will receive a digital pass with a QR code."
      />
      <VendorScheduleForm />
    </>
  );
}
