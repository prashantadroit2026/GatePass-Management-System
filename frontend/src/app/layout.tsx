import "./globals.css";
import { Providers } from "./providers";
export const metadata = { title: "Gatepass" };
export default function Root({ children }: { children: React.ReactNode }) {
  return <html lang="en"><head><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Barlow:wght@400;500;600;700&display=swap" /></head><body className="font-sans antialiased"><Providers>{children}</Providers></body></html>;
}
