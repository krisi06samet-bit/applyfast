import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ApplyFast — Tailor your CV faster",
  description:
    "Build or tailor your CV and cover letter for your next job application.",
};

export const viewport: Viewport = {
  colorScheme: "dark",
  themeColor: "#090908",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
