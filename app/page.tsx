"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, Check, Star, TrendingUp, Shield, Bell, PieChart, Zap, ChevronRight } from 'lucide-react';
import { Reveal } from "@/components/Reveal";
import { BRAND } from "@/lib/data";
type formatCurrency = any;
const formatCurrency: any = [];
import { staggerContainer, fadeInUp, scaleIn } from "@/lib/motion";

const FEATURES = [
  {
    icon: PieChart,
    title: "Category Breakdown",
    description:
      "See exactly where your money goes each month. Food, transport, bills, and more — grouped automatically.",
    color: "var(--accent)",
  },
  {
    icon: TrendingUp,
    title: "Monthly Trends",
    description:
      "Track spending patterns over time. Spot months where you overspent and understand why.",
    color: "#6366F1",
  },
  {
    icon: Bell,
    title: "Budget Alerts",
    description:
      "Set a monthly limit per category. Get notified before you exceed it, not after.",
    color: "#F59E0B",
  },
  {
    icon: Shield,
    title: "Secure by Default",
    description:
      "Row-level security on every record. Your data is visible only to you, enforced at the database level.",
    color: "#10B981",
  },
  {
    icon: Zap,
    title: "Instant Sync",
    description:
      "Add an expense on your phone and see it on your laptop in real time. No refresh needed.",
    color: "#8B5CF6",
  },
  {
    icon: Star,
    title: "Multi-Currency",
    description:
      "Log expenses in USD, EUR, GBP, or any currency. Totals display in your preferred currency.",
    color: "#F59E0B",
  },
];

const STEPS = [
  {
    number: "01",
    title: "Create your account",
    description:
      "Sign up with your email in under 30 seconds. No credit card required.",
  },
  {
    number: "02",
    title: "Set your budgets",
    description:
      "Define monthly limits for each spending category that matters to you.",
  },
  {
    number: "03",
    title: "Log expenses as they happen",
    description:
      "Add a title, amount, category, and date. Takes about five seconds per entry.",
  },
  {
    number: "04",
    title: "Review and adjust",
    description:
      "Check your dashboard weekly. See what's on track and where to cut back.",
  },
];

const TESTIMONIALS = [
  {
    name: "Sarah K.",
    role: "Freelance Designer",
    quote:
      "I finally stopped wondering where my money went. The category breakdown alone changed how I budget every month.",
    avatar: "SK",
  },
  {
    name: "Marcus T.",
    role: "Software Engineer",
    quote:
      "The budget alerts are the feature I didn't know I needed. I caught myself overspending on dining out three months in a row.",
    avatar: "MT",
  },
  {
    name: "Priya N.",
    role: "Product Manager",
    quote:
      "Clean interface, no bloat. I log expenses in seconds and the dashboard gives me everything I need at a glance.",
    avatar: "PN",
  },
];

const SAMPLE_EXPENSES = [
  { title: "Grocery run", category: "Food & Dining", amount: 84.5, date: "Today", icon: "🍽️" },
  { title: "Monthly transit pass", category: "Transport", amount: 120.0, date: "Yesterday", icon: "🚗" },
  { title: "Netflix", category: "Entertainment", amount: 15.99, date: "Jun 1", icon: "🎬" },
  { title: "Electric bill", category: "Bills", amount: 67.3, date: "May 31", icon: "📄" },
];

export default function HomePage() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <main className="overflow-x-hidden">
      {/* ── Hero ── */}
      <Reveal>
        <section className="relative min-h-[92vh] flex items-center bg-[hsl(var(--background))]">
          {/* Subtle radial glow */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 overflow-hidden"
          >
            <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[900px] h-[600px] rounded-full bg-[var(--accent)]/8 blur-[120px]" />
          </div>

          <div className="relative mx-auto max-w-7xl px-6 py-24 md:py-32 grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            {/* Left: copy */}
            <motion.div
              variants={staggerContainer}
              initial="hidden"
              animate="visible"
              className="flex flex-col gap-6"
            >
              <motion.div variants={fadeInUp}>
                <span className="inline-flex items-center gap-2 rounded-full border border-[var(--accent)]/30 bg-[var(--accent)]/10 px-4 py-1.5 text-xs font-semibold tracking-wide text-[var(--accent)] uppercase">
                  Personal Finance Tracker
                </span>
              </motion.div>

              <motion.h1
                variants={fadeInUp}
                className="text-5xl md:text-6xl font-bold tracking-tight text-[hsl(var(--foreground))] leading-[1.08] text-balance"
              >
                Know exactly where your money goes
              </motion.h1>

              <motion.p
                variants={fadeInUp}
                className="text-lg text-[hsl(var(--muted-foreground))] leading-relaxed max-w-lg text-pretty"
              >
                {BRAND.description} Log expenses in seconds, set category budgets, and get a clear picture of your finances every month.
              </motion.p>

              <motion.div variants={fadeInUp} className="flex flex-wrap gap-3 pt-2">
                <Link
                  href="/signup"
                  className="inline-flex items-center gap-2 rounded-xl bg-[var(--accent)] px-6 py-3 text-sm font-semibold text-[hsl(var(--background))] shadow-[0_2px_8px_rgba(0,0,0,0.15)] transition-all duration-300 hover:opacity-90 hover:scale-[1.02] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
                >
                  Get started free
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  href="/login"
                  className="inline-flex items-center gap-2 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-6 py-3 text-sm font-semibold text-[hsl(var(--foreground))] transition-all duration-300 hover:border-[var(--accent)]/50 hover:bg-[hsl(var(--card))]/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
                >
                  Sign in
                </Link>
              </motion.div>

              <motion.p
                variants={fadeInUp}
                className="text-xs text-[hsl(var(--muted-foreground))]"
              >
                No credit card required. Free to use.
              </motion.p>
            </motion.div>

            {/* Right: mock expense list */}
            <motion.div
              variants={scaleIn}
              initial="hidden"
              animate="visible"
              className="relative"
            >
              <div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] shadow-[0_4px_24px_-8px_rgba(0,0,0,0.18)] overflow-hidden">
                {/* Card header */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-[hsl(var(--border))]">
                  <div>
                    <p className="text-xs text-[hsl(var(--muted-foreground))] uppercase tracking-wide font-medium">June 2025</p>
                    <p className="text-xl font-bold text-[hsl(var(--foreground))] mt-0.5">
                      {mounted ? formatCurrency(287.79) : "$287.79"}
                    </p>
                  </div>
                  <span className="rounded-full bg-[var(--accent)]/15 px-3 py-1 text-xs font-semibold text-[var(--accent)]">
                    4 expenses
                  </span>
                </div>

                {/* Expense rows */}
                <ul className="divide-y divide-[hsl(var(--border))]">
                  {SAMPLE_EXPENSES.map((exp, i) => (
                    <motion.li
                      key={exp.title}
                      initial={{ opacity: 0, x: 16 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.3 + i * 0.1, duration: 0.4, ease: "easeOut" }}
                      className="flex items-center gap-3 px-5 py-3.5"
                    >
                      <span className="text-xl">{exp.icon}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-[hsl(var(--foreground))] truncate">{exp.title}</p>
                        <p className="text-xs text-[hsl(var(--muted-foreground))]">{exp.category}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm font-semibold text-[hsl(var(--foreground))]">
                          {mounted ? formatCurrency(exp.amount) : `$${exp.amount.toFixed(2)}`}
                        </p>
                        <p className="text-xs text-[hsl(var(--muted-foreground))]">{exp.date}</p>
                      </div>
                    </motion.li>
                  ))}
                </ul>

                {/* Budget bar */}
                <div className="px-5 py-4 bg-[hsl(var(--muted))]/40 border-t border-[hsl(var(--border))]">
                  <div className="flex justify-between text-xs text-[hsl(var(--muted-foreground))] mb-2">
                    <span>Monthly budget</span>
                    <span className="font-medium text-[hsl(var(--foreground))]">57% used</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-[hsl(var(--border))]">
                    <motion.div
                      className="h-full rounded-full bg-[var(--accent)]"
                      initial={{ width: 0 }}
                      animate={{ width: "57%" }}
                      transition={{ delay: 0.8, duration: 0.7, ease: "easeOut" }}
                    />
                  </div>
                </div>
              </div>

              {/* Floating badge */}
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1.1, duration: 0.4 }}
                className="absolute -bottom-4 -left-4 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-4 py-2.5 shadow-[0_4px_16px_rgba(0,0,0,0.12)]"
              >
                <p className="text-xs text-[hsl(var(--muted-foreground))]">Saved this month</p>
                <p className="text-lg font-bold text-[var(--accent)]">
                  {mounted ? formatCurrency(212.21) : "$212.21"}
                </p>
              </motion.div>
            </motion.div>
          </div>
        </section>
      </Reveal>

      {/* ── Social proof strip ── */}
      <Reveal>
        <section className="border-y border-[hsl(var(--border))] bg-[hsl(var(--muted))]/30 py-8">
          <div className="mx-auto max-w-7xl px-6">
            <div className="flex flex-wrap items-center justify-center gap-8 md:gap-16">
              {[
                { value: "14,000+", label: "expenses logged" },
                { value: "3,200+", label: "active users" },
                { value: "99.9%", label: "uptime" },
                { value: "7 currencies", label: "supported" },
              ].map((stat) => (
                <div key={stat.label} className="text-center">
                  <p className="text-2xl font-bold text-[hsl(var(--foreground))]">{stat.value}</p>
                  <p className="text-xs text-[hsl(var(--muted-foreground))] mt-0.5 uppercase tracking-wide">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </Reveal>

      {/* ── Features ── */}
      <section id="features" className="py-24 md:py-32 bg-[hsl(var(--background))]">
        <div className="mx-auto max-w-7xl px-6">
          <Reveal>
            <div className="max-w-2xl mb-16">
              <p className="text-xs font-semibold uppercase tracking-widest text-[var(--accent)] mb-3">Features</p>
              <h2 className="text-4xl md:text-5xl font-bold tracking-tight text-[hsl(var(--foreground))] text-balance">
                Built for people who want real answers
              </h2>
              <p className="mt-4 text-[hsl(var(--muted-foreground))] leading-relaxed text-pretty">
                Not another app that shows you a pie chart and calls it done. ExpenseIQ gives you the tools to actually change your spending habits.
              </p>
            </div>
          </Reveal>

          <motion.div
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-80px" }}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5"
          >
            {FEATURES.map((feat, i) => {
              const Icon = feat.icon;
              const isLarge = i === 0 || i === 4;
              return (
                <motion.div
                  key={feat.title}
                  variants={fadeInUp}
                  whileHover={{ y: -4, transition: { duration: 0.2 } }}
                  className={`rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_8px_24px_-8px_rgba(0,0,0,0.08)] transition-shadow duration-300 hover:shadow-[0_4px_32px_-8px_rgba(0,0,0,0.14)] ${isLarge ? "lg:col-span-1 lg:row-span-1" : ""}`}
                >
                  <div
                    className="inline-flex h-10 w-10 items-center justify-center rounded-xl mb-4"
                    style={{ background: `${feat.color}18` }}
                  >
                    <Icon className="h-5 w-5" style={{ color: feat.color }} />
                  </div>
                  <h3 className="text-base font-semibold text-[hsl(var(--foreground))] mb-2">{feat.title}</h3>
                  <p className="text-sm text-[hsl(var(--muted-foreground))] leading-relaxed">{feat.description}</p>
                </motion.div>
              );
            })}
          </motion.div>
        </div>
      </section>

      {/* ── How it works ── */}
      <section id="about" className="py-24 md:py-32 bg-[hsl(var(--muted))]/25">
        <div className="mx-auto max-w-7xl px-6">
          <Reveal>
            <div className="text-center max-w-2xl mx-auto mb-16">
              <p className="text-xs font-semibold uppercase tracking-widest text-[var(--accent)] mb-3">How it works</p>
              <h2 className="text-4xl md:text-5xl font-bold tracking-tight text-[hsl(var(--foreground))] text-balance">
                Up and running in four steps
              </h2>
            </div>
          </Reveal>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {STEPS.map((step, i) => (
              <Reveal key={step.number} delay={i * 0.1}>
                <div className="relative flex flex-col gap-4 rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_8px_24px_-8px_rgba(0,0,0,0.08)]">
                  <span className="text-4xl font-black text-[var(--accent)]/20 leading-none select-none">
                    {step.number}
                  </span>
                  <h3 className="text-base font-semibold text-[hsl(var(--foreground))]">{step.title}</h3>
                  <p className="text-sm text-[hsl(var(--muted-foreground))] leading-relaxed">{step.description}</p>
                  {i < STEPS.length - 1 && (
                    <ChevronRight className="absolute -right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-[hsl(var(--border))] hidden lg:block" />
                  )}
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── Testimonials ── */}
      <section className="py-24 md:py-32 bg-[hsl(var(--background))]">
        <div className="mx-auto max-w-7xl px-6">
          <Reveal>
            <div className="max-w-xl mb-16">
              <p className="text-xs font-semibold uppercase tracking-widest text-[var(--accent)] mb-3">From users</p>
              <h2 className="text-4xl md:text-5xl font-bold tracking-tight text-[hsl(var(--foreground))] text-balance">
                What people say after one month
              </h2>
            </div>
          </Reveal>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {TESTIMONIALS.map((t, i) => (
              <Reveal key={t.name} delay={i * 0.1}>
                <div className="flex flex-col gap-5 rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_8px_24px_-8px_rgba(0,0,0,0.08)] h-full">
                  <div className="flex gap-1">
                    {Array.from({ length: 5 }).map((_, j) => (
                      <Star key={j} className="h-4 w-4 fill-[var(--accent)] text-[var(--accent)]" />
                    ))}
                  </div>
                  <p className="text-sm text-[hsl(var(--foreground))] leading-relaxed flex-1">
                    &ldquo;{t.quote}&rdquo;
                  </p>
                  <div className="flex items-center gap-3 pt-2 border-t border-[hsl(var(--border))]">
                    <div className="h-9 w-9 rounded-full bg-[var(--accent)]/15 flex items-center justify-center text-xs font-bold text-[var(--accent)]">
                      {t.avatar}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-[hsl(var(--foreground))]">{t.name}</p>
                      <p className="text-xs text-[hsl(var(--muted-foreground))]">{t.role}</p>
                    </div>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <Reveal>
        <section className="py-24 md:py-32 bg-[hsl(var(--muted))]/25">
          <div className="mx-auto max-w-7xl px-6">
            <div className="relative rounded-3xl border border-[var(--accent)]/20 bg-[hsl(var(--card))] overflow-hidden px-8 py-16 md:px-16 text-center shadow-[0_4px_40px_-12px_rgba(0,0,0,0.12)]">
              <div
                aria-hidden
                className="pointer-events-none absolute inset-0"
              >
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] rounded-full bg-[var(--accent)]/10 blur-[80px]" />
              </div>

              <div className="relative">
                <h2 className="text-4xl md:text-5xl font-bold tracking-tight text-[hsl(var(--foreground))] text-balance mb-4">
                  Start tracking today
                </h2>
                <p className="text-[hsl(var(--muted-foreground))] max-w-lg mx-auto leading-relaxed mb-8 text-pretty">
                  Create a free account, set your first budget, and log your first expense in under two minutes.
                </p>

                <div className="flex flex-wrap gap-3 justify-center">
                  <Link
                    href="/signup"
                    className="inline-flex items-center gap-2 rounded-xl bg-[var(--accent)] px-7 py-3.5 text-sm font-semibold text-[hsl(var(--background))] shadow-[0_2px_8px_rgba(0,0,0,0.15)] transition-all duration-300 hover:opacity-90 hover:scale-[1.02] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
                  >
                    Create free account
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>

                <ul className="mt-6 flex flex-wrap justify-center gap-x-6 gap-y-2">
                  {["No credit card", "Free forever plan", "Cancel anytime"].map((item) => (
                    <li key={item} className="flex items-center gap-1.5 text-xs text-[hsl(var(--muted-foreground))]">
                      <Check className="h-3.5 w-3.5 text-[var(--accent)]" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </section>
      </Reveal>
    </main>
  );
}