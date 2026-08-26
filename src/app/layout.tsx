import type { Metadata, Viewport } from "next";
import "./theme.css";
import "./app.css";

export const metadata: Metadata = {
  title: "NottiPay",
  description: "Private ledger for one person in Nottingham.",
  manifest: "/manifest.json",
  appleWebApp: { capable: true, title: "NottiPay" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#070707",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-theme="light" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
