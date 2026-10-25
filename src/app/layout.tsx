import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "OPD Saathi AI | Care, Reimagined",
  description: "AI-assisted hospital discovery, live GPS, 3D indoor navigation, accessible wayfinding and OPD queue management.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
