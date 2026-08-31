"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { Sparkles } from 'lucide-react';
import { useTranslations } from "next-intl";
import { BRAND } from "@/lib/data";

const footerLinks = [
  { label: "Privacy Policy", href: "/privacy", key: "privacy" },
  { label: "Terms of Service", href: "/terms", key: "terms" },
  { label: "Support", href: "/support", key: "support" },
];

const productLinks = [
  { label: "Dashboard", href: "/dashboard", key: "dashboard" },
  { label: "Expenses", href: "/expenses", key: "expenses" },
  { label: "Budget", href: "/budget", key: "budget" },
];

export default function Footer() {
  const pathname = usePathname();
  const t = useTranslations();

  const footerT = (Array.isArray(t.raw("footer")) ? {} : t.raw("footer")) as Record<string, string>;

  const getLinkHref = (href: string) => {
    if (href.startsWith("#")) {
      return pathname === "/" ? href : "/" + href;
    }
    return href;
  };

  const isAuthPage = pathname === "/login" || pathname === "/signup";
  if (isAuthPage) return null;

  return (
    <motion.footer
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5 }}
      className="border-t border-[var(--border)] bg-[var(--card)]/50"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-10">
          {/* Brand */}
          <div className="space-y-4">
            <Link href="/" className="flex items-center gap-2 group w-fit">
              <div className="w-8 h-8 rounded-lg bg-[var(--primary)] flex items-center justify-center shadow-[0_0_16px_rgba(99,102,241,0.3)]">
                <Sparkles className="w-4 h-4 text-white" aria-hidden="true" />
              </div>
              <span className="text-[var(--foreground)] font-bold text-lg tracking-tight">
                {BRAND.name}
              </span>
            </Link>
            <p className="text-sm text-[var(--muted-foreground)] leading-relaxed max-w-xs">
              {BRAND.description}
            </p>
          </div>

          {/* Product links */}
          <div>
            <h3 className="text-sm font-semibold text-[var(--foreground)] mb-4 tracking-wide uppercase">
              {footerT["product"] ?? "Product"}
            </h3>
            <ul className="space-y-2">
              {productLinks.map((link) => (
                <li key={link.key}>
                  <Link
                    href={getLinkHref(link.href)}
                    className="text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors duration-200"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal links */}
          <div>
            <h3 className="text-sm font-semibold text-[var(--foreground)] mb-4 tracking-wide uppercase">
              {footerT["legal"] ?? "Legal"}
            </h3>
            <ul className="space-y-2">
              {footerLinks.map((link) => (
                <li key={link.key}>
                  <Link
                    href={getLinkHref(link.href)}
                    className="text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors duration-200"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="pt-8 border-t border-[var(--border)] flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-[var(--muted-foreground)]">
            {footerT["copyright"] ?? "© 2024 ExpenseIQ. All rights reserved."}
          </p>
          <p className="text-xs text-[var(--muted-foreground)]">
            {footerT["tagline"] ?? "Built for clarity. Designed for control."}
          </p>
        </div>
      </div>
    </motion.footer>
  );
}