import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "../styles.css";
import "../alpha-fix.css";
import "../alpha27-quality.css";
import "../insights-alpha30.css";
import "../planner-alpha28.css";
import "../planner-alpha29.css";
import "../planner-alpha29-fix.css";
import "../experience-alpha31.css";
import "../experience-alpha31-planner.css";
import "../experience-alpha31-fix.css";
import "../experience-alpha32.css";
import "../experience-alpha33.css";
import "./shell.css";

export const metadata: Metadata = {
  title: "Cosmic Planner",
  description:
    "Plan your day, keep a private journal, and explore personal guidance.",
  manifest: "/manifest.json",
  icons: { icon: "/icon.svg" },
  appleWebApp: { capable: true, title: "Cosmic Planner" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#111318",
};

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
