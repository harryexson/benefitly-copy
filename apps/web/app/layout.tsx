import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = { title: { default: "Benefitly | People helping people", template: "%s | Benefitly" }, description: "Raise money for the people, causes and communities that matter.", metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000") };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="en"><body>{children}</body></html>; }
