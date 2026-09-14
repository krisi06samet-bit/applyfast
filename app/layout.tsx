import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ApplyFast — Tailor your CV faster",
  description:
    "Build or tailor your CV and cover letter for your next job application.",
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

