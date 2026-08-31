"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, Check, Star, TrendingUp, Shield, Bell, PieChart, Zap, ChevronRight } from 'lucide-react';
import { Reveal } from "@/components/Reveal";
import { BRAND } from "@/lib/data";
import { staggerContainer, fadeInUp, scaleIn } from "@/lib/motion";

function formatCurrency(amount: number, currency = 'USD'): string {
  try {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount ?? 0);
  } catch {
    return `$${(amount ?? 0).toFixed(2)}`;
  }
}

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
        <section className="relative min-h-[92vh] flex items-center" style={{ background: 'var(--background)' }}>
          {/* Subtle radial glow */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 overflow-hidden"
          >
            <div
              className="absolute -top-32 left-1/2 -translate-x-1/2 w-[900px] h-[600px] rounded-full"
              style={{
                background:
                  "radial-gradient(ellipse at center, rgba(99,102,241,0.18) 0%, transparent 70%)",
                filter: "blur(60px)",
              }}
            />
          </div>

          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 grid lg:grid-cols-2 gap-16 items-center">
            {/* Left: copy */}
            <motion.div
              variants={staggerContainer}
              initial="hidden"
              animate="visible"
              className="space-y-8"
            >
              <motion.div variants={fadeInUp}>
                <span
                  className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold tracking-wide uppercase"
                  style={{
                    background: "rgba(99,102,241,0.15)",
                    color: "var(--primary)",
                    border: "1px solid rgba(99,102,241,0.3)",
                  }}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-[var(--primary)] animate-pulse" />
                  Now in open beta
                </span>
              </motion.div>

              <motion.h1
                variants={fadeInUp}
                className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight leading-[1.1] text-balance"
                style={{ color: "var(--foreground)" }}
              >
                Know exactly{" "}
                <span
                  className="relative"
                  style={{
                    background: "linear-gradient(135deg, var(--primary) 0%, #818CF8 100%)",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                    backgroundClip: "text",
                  }}
                >
                  where your money goes
                </span>
              </motion.h1>

              <motion.p
                variants={fadeInUp}
                className="text-lg leading-relaxed max-w-lg"
                style={{ color: "var(--muted-foreground)" }}
              >
                {BRAND.description}
              </motion.p>

              <motion.div variants={fadeInUp} className="flex flex-wrap gap-4">
                <Link
                  href="/signup"
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm text-white transition-all duration-300 hover:opacity-90 hover:scale-[1.02] active:scale-[0.98] shadow-[0_0_24px_rgba(99,102,241,0.4)]"
                  style={{ background: "var(--primary)" }}
                >
                  Get started free
                  <ArrowRight className="w-4 h-4" />
                </Link>
                <Link
                  href="/login"
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm transition-all duration-300 hover:opacity-80"
                  style={{
                    color: "var(--foreground)",
                    border: "1px solid var(--border)",
                    background: "rgba(255,255,255,0.03)",
                  }}
                >
                  Sign in
                  <ChevronRight className="w-4 h-4" />
                </Link>
              </motion.div>

              <motion.ul variants={fadeInUp} className="flex flex-wrap gap-x-6 gap-y-2">
                {["Free forever plan", "No credit card", "Cancel anytime"].map((item) => (
                  <li
                    key={item}
                    className="flex items-center gap-1.5 text-sm"
                    style={{ color: "var(--muted-foreground)" }}
                  >
                    <Check className="w-3.5 h-3.5" style={{ color: "var(--success)" }} />
                    {item}
                  </li>
                ))}
              </motion.ul>
            </motion.div>

            {/* Right: mock dashboard card */}
            <motion.div
              variants={scaleIn}
              initial="hidden"
              animate="visible"
              className="hidden lg:block"
            >
              <div
                className="rounded-2xl p-6 space-y-4"
                style={{
                  background: "rgba(26,26,46,0.8)",
                  backdropFilter: "blur(16px)",
                  border: "1px solid var(--border)",
                  boxShadow:
                    "0 1px 2px rgba(0,0,0,0.2), 0 24px 64px -16px rgba(0,0,0,0.6), 0 0 0 1px rgba(99,102,241,0.08)",
                }}
              >
                {/* Mini header */}
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold" style={{ color: "var(--foreground)" }}>
                    June 2024
                  </span>
                  <span
                    className="text-xs px-2 py-0.5 rounded-full"
                    style={{
                      background: "rgba(16,185,129,0.15)",
                      color: "#10B981",
                    }}
                  >
                    On track
                  </span>
                </div>

                {/* Summary row */}
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { label: "Spent", value: formatCurrency(1284.5), color: "var(--foreground)" },
                    { label: "Budget", value: formatCurrency(2000), color: "var(--muted-foreground)" },
                    { label: "Left", value: formatCurrency(715.5), color: "#10B981" },
                  ].map((stat) => (
                    <div
                      key={stat.label}
                      className="rounded-xl p-3 text-center"
                      style={{ background: "rgba(255,255,255,0.04)" }}
                    >
                      <p className="text-xs mb-1" style={{ color: "var(--muted-foreground)" }}>
                        {stat.label}
                      </p>
                      <p className="text-sm font-bold" style={{ color: stat.color }}>
                        {stat.value}
                      </p>
                    </div>
                  ))}
                </div>

                {/* Expense list */}
                <div className="space-y-2">
                  {SAMPLE_EXPENSES.map((expense) => (
                    <div
                      key={expense.title}
                      className="flex items-center gap-3 p-3 rounded-xl transition-colors"
                      style={{ background: "rgba(255,255,255,0.03)" }}
                    >
                      <span className="text-xl">{expense.icon}</span>
                      <div className="flex-1 min-w-0">
                        <p
                          className="text-sm font-medium truncate"
                          style={{ color: "var(--foreground)" }}
                        >
                          {expense.title}
                        </p>
                        <p className="text-xs" style={{ color: "var(--muted-foreground)" }}>
                          {expense.category}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm font-semibold" style={{ color: "var(--foreground)" }}>
                          {formatCurrency(expense.amount)}
                        </p>
                        <p className="text-xs" style={{ color: "var(--muted-foreground)" }}>
                          {expense.date}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Progress bar */}
                <div>
                  <div className="flex justify-between text-xs mb-1.5" style={{ color: "var(--muted-foreground)" }}>
                    <span>Monthly budget used</span>
                    <span>64%</span>
                  </div>
                  <div
                    className="h-1.5 rounded-full overflow-hidden"
                    style={{ background: "rgba(255,255,255,0.08)" }}
                  >
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: "64%",
                        background: "linear-gradient(90deg, var(--primary) 0%, #818CF8 100%)",
                      }}
                    />
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </section>
      </Reveal>

      {/* ── Features ── */}
      <Reveal>
        <section
          id="features"
          className="py-24"
          style={{ background: "var(--card)" }}
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16 space-y-4">
              <h2
                className="text-3xl sm:text-4xl font-bold tracking-tight text-balance"
                style={{ color: "var(--foreground)" }}
              >
                Everything you need to stay on budget
              </h2>
              <p
                className="text-lg max-w-2xl mx-auto leading-relaxed"
                style={{ color: "var(--muted-foreground)" }}
              >
                Built for people who want clarity without complexity.
              </p>
            </div>

            <motion.div
              variants={staggerContainer}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-80px" }}
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
            >
              {FEATURES.map((feature) => {
                const Icon = feature.icon;
                return (
                  <motion.div
                    key={feature.title}
                    variants={fadeInUp}
                    className="rounded-2xl p-6 space-y-4 group transition-all duration-300 hover:-translate-y-1"
                    style={{
                      background: "rgba(255,255,255,0.03)",
                      border: "1px solid var(--border)",
                      boxShadow: "0 1px 2px rgba(0,0,0,0.1)",
                    }}
                  >
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center"
                      style={{ background: `${feature.color}20` }}
                    >
                      <Icon className="w-5 h-5" style={{ color: feature.color }} />
                    </div>
                    <h3
                      className="text-base font-semibold"
                      style={{ color: "var(--foreground)" }}
                    >
                      {feature.title}
                    </h3>
                    <p
                      className="text-sm leading-relaxed"
                      style={{ color: "var(--muted-foreground)" }}
                    >
                      {feature.description}
                    </p>
                  </motion.div>
                );
              })}
            </motion.div>
          </div>
        </section>
      </Reveal>

      {/* ── How it works ── */}
      <Reveal>
        <section className="py-24" style={{ background: "var(--background)" }}>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16 space-y-4">
              <h2
                className="text-3xl sm:text-4xl font-bold tracking-tight text-balance"
                style={{ color: "var(--foreground)" }}
              >
                Up and running in minutes
              </h2>
              <p
                className="text-lg max-w-xl mx-auto"
                style={{ color: "var(--muted-foreground)" }}
              >
                No complicated setup. No spreadsheets. Just clear financial visibility.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              {STEPS.map((step, index) => (
                <Reveal key={step.number} delay={index * 0.1}>
                  <div className="space-y-4">
                    <div
                      className="text-4xl font-black tracking-tighter"
                      style={{
                        background: "linear-gradient(135deg, var(--primary) 0%, rgba(99,102,241,0.3) 100%)",
                        WebkitBackgroundClip: "text",
                        WebkitTextFillColor: "transparent",
                        backgroundClip: "text",
                      }}
                    >
                      {step.number}
                    </div>
                    <h3
                      className="text-base font-semibold"
                      style={{ color: "var(--foreground)" }}
                    >
                      {step.title}
                    </h3>
                    <p
                      className="text-sm leading-relaxed"
                      style={{ color: "var(--muted-foreground)" }}
                    >
                      {step.description}
                    </p>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>
      </Reveal>

      {/* ── Testimonials ── */}
      <Reveal>
        <section className="py-24" style={{ background: "var(--card)" }}>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16 space-y-4">
              <h2
                className="text-3xl sm:text-4xl font-bold tracking-tight text-balance"
                style={{ color: "var(--foreground)" }}
              >
                Trusted by people who care about their money
              </h2>
            </div>

            <motion.div
              variants={staggerContainer}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-80px" }}
              className="grid grid-cols-1 md:grid-cols-3 gap-6"
            >
              {TESTIMONIALS.map((testimonial) => (
                <motion.div
                  key={testimonial.name}
                  variants={fadeInUp}
                  className="rounded-2xl p-6 space-y-4"
                  style={{
                    background: "rgba(255,255,255,0.03)",
                    border: "1px solid var(--border)",
                  }}
                >
                  <div className="flex items-center gap-1">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star
                        key={i}
                        className="w-4 h-4 fill-current"
                        style={{ color: "var(--accent)" }}
                      />
                    ))}
                  </div>
                  <p
                    className="text-sm leading-relaxed"
                    style={{ color: "var(--muted-foreground)" }}
                  >
                    &ldquo;{testimonial.quote}&rdquo;
                  </p>
                  <div className="flex items-center gap-3 pt-2">
                    <div
                      className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-white"
                      style={{ background: "var(--primary)" }}
                    >
                      {testimonial.avatar}
                    </div>
                    <div>
                      <p
                        className="text-sm font-semibold"
                        style={{ color: "var(--foreground)" }}
                      >
                        {testimonial.name}
                      </p>
                      <p className="text-xs" style={{ color: "var(--muted-foreground)" }}>
                        {testimonial.role}
                      </p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </section>
      </Reveal>

      {/* ── CTA ── */}
      <Reveal>
        <section className="py-24" style={{ background: "var(--background)" }}>
          <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-8">
            <h2
              className="text-3xl sm:text-4xl font-bold tracking-tight text-balance"
              style={{ color: "var(--foreground)" }}
            >
              Start tracking your expenses today
            </h2>
            <p
              className="text-lg leading-relaxed"
              style={{ color: "var(--muted-foreground)" }}
            >
              Join thousands of people who finally understand where their money goes.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <Link
                href="/signup"
                className="inline-flex items-center gap-2 px-8 py-4 rounded-xl font-semibold text-white transition-all duration-300 hover:opacity-90 hover:scale-[1.02] active:scale-[0.98] shadow-[0_0_32px_rgba(99,102,241,0.4)]"
                style={{ background: "var(--primary)" }}
              >
                Create free account
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                href="/login"
                className="inline-flex items-center gap-2 px-8 py-4 rounded-xl font-semibold transition-all duration-300 hover:opacity-80"
                style={{
                  color: "var(--foreground)",
                  border: "1px solid var(--border)",
                  background: "rgba(255,255,255,0.03)",
                }}
              >
                Sign in
              </Link>
            </div>
          </div>
        </section>
      </Reveal>
    </main>
  );
}
