import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: {
    default: "GatePass · Gate, Vendor & Visitor Management",
    template: "%s · GatePass",
  },
  description:
    "Enterprise gate pass, vendor arrival and visitor management system with unified approvals and live gate operations.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
