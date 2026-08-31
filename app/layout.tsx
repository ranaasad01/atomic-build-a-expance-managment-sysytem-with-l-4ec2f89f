import type { Metadata } from "next";
import "./globals.css";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import LocaleProvider from "@/components/LocaleProvider";
import LanguageToggle from "@/components/LanguageToggle";

export const metadata: Metadata = {
  formatDetection: { telephone: false, date: false, email: false, address: false },
  title: {
    default: "ExpenseIQ — Smart Expense Management",
    template: "%s | ExpenseIQ",
  },
  description:
    "ExpenseIQ gives you a real-time view of every dollar you spend — by category, by month, by habit. Track expenses, set budgets, and gain financial clarity.",
  openGraph: {
    title: "ExpenseIQ — Smart Expense Management",
    description:
      "Track expenses, set budgets, and gain financial clarity with ExpenseIQ.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen flex flex-col">
        <LocaleProvider>
          <Navbar />
          <main className="flex-1">{children}</main>
          <Footer />
          <LanguageToggle />
        </LocaleProvider>
      </body>
    </html>
  );
}