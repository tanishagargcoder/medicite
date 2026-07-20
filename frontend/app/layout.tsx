import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "MediCite — Clinical Document Q&A",
  description:
    "Ask questions about medical records and get answers grounded in the source, with page-level citations.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
