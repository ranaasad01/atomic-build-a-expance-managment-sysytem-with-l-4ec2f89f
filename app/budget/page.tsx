"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Reveal } from "@/components/Reveal";
import { fadeInUp, staggerContainer } from "@/lib/motion";
import { EXPENSE_CATEGORIES } from "@/lib/data";
import { createClient } from "@/lib/supabase/client";
import { Target, TrendingUp, AlertTriangle, Plus, Settings } from 'lucide-react';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatCurrency(amount: number, currency = "USD"): string {
  try {
    return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(amount ?? 0);
  } catch {
    return `$${(amount ?? 0).toFixed(2)}`;
  }
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface Budget {
  id: string;
  user_id: string;
  category_id: string;
  monthly_limit: number;
  currency: string;
}

interface CategoryBudget {
  categoryId: string;
  name: string;
  icon: string;
  color: string;
  limit: number;
  spent: number;
  remaining: number;
  percentage: number;
  currency: string;
}

// ─── Mock fallback data ───────────────────────────────────────────────────────

const MOCK_BUDGETS: Budget[] = EXPENSE_CATEGORIES.map((c, i) => ({
  id: `mock-budget-${i}`,
  user_id: "mock-user",
  category_id: `mock-cat-${i}`,
  monthly_limit: [400, 200, 300, 150, 100, 120, 80][i] ?? 200,
  currency: "USD",
}));

const MOCK_EXPENSES = [
  { category_id: "mock-cat-0", amount: "320.50", expense_date: new Date().toISOString().slice(0, 7) + "-10" },
  { category_id: "mock-cat-0", amount: "45.00", expense_date: new Date().toISOString().slice(0, 7) + "-15" },
  { category_id: "mock-cat-1", amount: "85.00", expense_date: new Date().toISOString().slice(0, 7) + "-08" },
  { category_id: "mock-cat-2", amount: "290.00", expense_date: new Date().toISOString().slice(0, 7) + "-12" },
  { category_id: "mock-cat-3", amount: "140.00", expense_date: new Date().toISOString().slice(0, 7) + "-05" },
  { category_id: "mock-cat-4", amount: "55.00", expense_date: new Date().toISOString().slice(0, 7) + "-20" },
  { category_id: "mock-cat-5", amount: "130.00", expense_date: new Date().toISOString().slice(0, 7) + "-18" },
  { category_id: "mock-cat-6", amount: "30.00", expense_date: new Date().toISOString().slice(0, 7) + "-22" },
];

// ─── Progress bar color ───────────────────────────────────────────────────────

function getBarColor(percentage: number): string {
  if (percentage >= 90) return "#DC2626";
  if (percentage >= 70) return "#F59E0B";
  return "#10B981";
}

function getBarBg(percentage: number): string {
  if (percentage >= 90) return "rgba(220,38,38,0.15)";
  if (percentage >= 70) return "rgba(245,158,11,0.15)";
  return "rgba(16,185,129,0.15)";
}

function getStatusLabel(percentage: number): { label: string; color: string } {
  if (percentage >= 100) return { label: "Over budget", color: "#DC2626" };
  if (percentage >= 90) return { label: "Critical", color: "#DC2626" };
  if (percentage >= 70) return { label: "Warning", color: "#F59E0B" };
  return { label: "On track", color: "#10B981" };
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function BudgetPage() {
  const [categoryBudgets, setCategoryBudgets] = useState<CategoryBudget[]>([]);
  const [loading, setLoading] = useState(true);
  const [usingMock, setUsingMock] = useState(false);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
          // Not logged in — show mock data
          buildFromMock();
          return;
        }

        const now = new Date();
        const yearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

        // Fetch budgets
        const { data: budgets, error: budgetErr } = await supabase
          .from("budgets")
          .select("id, user_id, category_id, monthly_limit, currency")
          .eq("user_id", user.id);

        // Fetch categories
        const { data: categories, error: catErr } = await supabase
          .from("categories")
          .select("id, name, icon, color");

        // Fetch this month's expenses
        const startOfMonth = `${yearMonth}-01`;
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0)
          .toISOString()
          .slice(0, 10);

        const { data: expenses, error: expErr } = await supabase
          .from("expenses")
          .select("category_id, amount, expense_date")
          .eq("user_id", user.id)
          .gte("expense_date", startOfMonth)
          .lte("expense_date", endOfMonth);

        if (budgetErr || catErr || expErr || !budgets || !categories) {
          buildFromMock();
          return;
        }

        // Build spent map
        const spentMap: Record<string, number> = {};
        (expenses ?? []).forEach((e) => {
          const amt = parseFloat(String(e.amount)) || 0;
          spentMap[e.category_id] = (spentMap[e.category_id] ?? 0) + amt;
        });

        // Build category lookup
        const catMap: Record<string, { name: string; icon: string; color: string }> = {};
        categories.forEach((c) => {
          catMap[c.id] = {
            name: c.name ?? "Other",
            icon: c.icon ?? "📦",
            color: c.color ?? "#94A3B8",
          };
        });

        if (budgets.length === 0) {
          // No budgets set yet — show mock
          buildFromMock();
          return;
        }

        const built: CategoryBudget[] = budgets.map((b) => {
          const cat = catMap[b.category_id];
          const limit = parseFloat(String(b.monthly_limit)) || 0;
          const spent = spentMap[b.category_id] ?? 0;
          const remaining = Math.max(0, limit - spent);
          const percentage = limit > 0 ? Math.min(Math.round((spent / limit) * 100), 999) : 0;
          return {
            categoryId: b.category_id,
            name: cat?.name ?? "Unknown",
            icon: cat?.icon ?? "📦",
            color: cat?.color ?? "#94A3B8",
            limit,
            spent,
            remaining,
            percentage,
            currency: b.currency ?? "USD",
          };
        });

        setCategoryBudgets(built);
      } catch {
        buildFromMock();
      } finally {
        setLoading(false);
      }
    }

    function buildFromMock() {
      setUsingMock(true);
      const spentMap: Record<string, number> = {};
      MOCK_EXPENSES.forEach((e) => {
        const amt = parseFloat(e.amount) || 0;
        spentMap[e.category_id] = (spentMap[e.category_id] ?? 0) + amt;
      });

      const built: CategoryBudget[] = MOCK_BUDGETS.map((b, i) => {
        const cat = EXPENSE_CATEGORIES[i];
        const limit = b.monthly_limit;
        const spent = spentMap[b.category_id] ?? 0;
        const remaining = Math.max(0, limit - spent);
        const percentage = limit > 0 ? Math.min(Math.round((spent / limit) * 100), 999) : 0;
        return {
          categoryId: b.category_id,
          name: cat?.name ?? "Other",
          icon: cat?.icon ?? "📦",
          color: cat?.color ?? "#94A3B8",
          limit,
          spent,
          remaining,
          percentage,
          currency: b.currency,
        };
      });

      setCategoryBudgets(built);
      setLoading(false);
    }

    loadData();
  }, []);

  // ── Summary stats ──────────────────────────────────────────────────────────
  const totalBudget = categoryBudgets.reduce((s, c) => s + c.limit, 0);
  const totalSpent = categoryBudgets.reduce((s, c) => s + c.spent, 0);
  const totalRemaining = Math.max(0, totalBudget - totalSpent);
  const overBudgetCount = categoryBudgets.filter((c) => c.percentage >= 100).length;

  const summaryCards = [
    {
      label: "Total Budget",
      value: formatCurrency(totalBudget),
      icon: Target,
      color: "#6366F1",
      bg: "rgba(99,102,241,0.12)",
    },
    {
      label: "Total Spent",
      value: formatCurrency(totalSpent),
      icon: TrendingUp,
      color: "#F59E0B",
      bg: "rgba(245,158,11,0.12)",
    },
    {
      label: "Remaining",
      value: formatCurrency(totalRemaining),
      icon: Target,
      color: "#10B981",
      bg: "rgba(16,185,129,0.12)",
    },
    {
      label: "Over Budget",
      value: `${overBudgetCount} ${overBudgetCount === 1 ? "category" : "categories"}`,
      icon: AlertTriangle,
      color: overBudgetCount > 0 ? "#DC2626" : "#10B981",
      bg: overBudgetCount > 0 ? "rgba(220,38,38,0.12)" : "rgba(16,185,129,0.12)",
    },
  ];

  return (
    <div
      className="min-h-screen mesh-bg"
      style={{ background: "var(--background)", paddingTop: "80px" }}
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {/* ── Header ── */}
        <Reveal>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-10">
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-[var(--foreground)]">
                Budget Overview
              </h1>
              <p className="mt-1 text-sm text-[var(--muted-foreground)]">
                Track your monthly spending limits across all categories.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Link
                href="/expenses/add"
                className="inline-flex items-center gap-2 rounded-xl bg-[var(--primary)] px-4 py-2.5 text-sm font-semibold text-white shadow-[0_0_16px_rgba(99,102,241,0.3)] transition-all duration-200 hover:opacity-90 hover:shadow-[0_0_24px_rgba(99,102,241,0.45)]"
              >
                <Plus className="h-4 w-4" />
                Add Expense
              </Link>
              <Link
                href="/budget-settings"
                className="inline-flex items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--card)] px-4 py-2.5 text-sm font-semibold text-[var(--foreground)] transition-all duration-200 hover:border-[var(--primary)] hover:text-[var(--primary)]"
              >
                <Settings className="h-4 w-4" />
                Budget Settings
              </Link>
            </div>
          </div>
        </Reveal>

        {/* ── Mock notice ── */}
        {usingMock && (
          <Reveal>
            <div className="mb-6 flex items-center gap-3 rounded-xl border border-[var(--accent)]/30 bg-[var(--accent)]/10 px-4 py-3 text-sm text-[var(--accent)]">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span>
                Showing sample data. Sign in and set your budgets to see real figures.
              </span>
            </div>
          </Reveal>
        )}

        {/* ── Summary cards ── */}
        <Reveal>
          <motion.div
            variants={staggerContainer}
            initial="hidden"
            animate="visible"
            className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10"
          >
            {summaryCards.map((card) => {
              const Icon = card.icon;
              return (
                <motion.div
                  key={card.label}
                  variants={fadeInUp}
                  className="glass rounded-2xl p-5 border border-[var(--border)] shadow-[0_1px_2px_rgba(0,0,0,0.08),0_8px_24px_-8px_rgba(0,0,0,0.2)]"
                >
                  <div
                    className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl"
                    style={{ background: card.bg }}
                  >
                    <Icon className="h-5 w-5" style={{ color: card.color }} />
                  </div>
                  <p className="text-xs font-medium text-[var(--muted-foreground)] uppercase tracking-wide">
                    {card.label}
                  </p>
                  <p
                    className="mt-1 text-xl font-bold tracking-tight"
                    style={{ color: card.color }}
                  >
                    {card.value}
                  </p>
                </motion.div>
              );
            })}
          </motion.div>
        </Reveal>

        {/* ── Budget progress cards ── */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="glass rounded-2xl p-6 border border-[var(--border)] animate-pulse"
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className="h-10 w-10 rounded-xl bg-[var(--border)]" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3 w-24 rounded bg-[var(--border)]" />
                    <div className="h-2 w-16 rounded bg-[var(--border)]" />
                  </div>
                </div>
                <div className="h-2 w-full rounded-full bg-[var(--border)]" />
              </div>
            ))}
          </div>
        ) : categoryBudgets.length === 0 ? (
          <Reveal>
            <div className="glass rounded-2xl border border-[var(--border)] p-16 text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--primary)]/10 text-3xl">
                🎯
              </div>
              <h3 className="text-lg font-semibold text-[var(--foreground)]">
                No budgets set yet
              </h3>
              <p className="mt-2 text-sm text-[var(--muted-foreground)] max-w-xs mx-auto">
                Set monthly limits for each spending category to start tracking your budget.
              </p>
              <Link
                href="/budget-settings"
                className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[var(--primary)] px-5 py-2.5 text-sm font-semibold text-white shadow-[0_0_16px_rgba(99,102,241,0.3)] transition-all duration-200 hover:opacity-90"
              >
                <Settings className="h-4 w-4" />
                Configure Budgets
              </Link>
            </div>
          </Reveal>
        ) : (
          <motion.div
            variants={staggerContainer}
            initial="hidden"
            animate="visible"
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5"
          >
            {categoryBudgets.map((cat) => {
              const barColor = getBarColor(cat.percentage);
              const barBg = getBarBg(cat.percentage);
              const status = getStatusLabel(cat.percentage);
              const clampedPct = Math.min(cat.percentage, 100);

              return (
                <Reveal key={cat.categoryId}>
                  <motion.div
                    variants={fadeInUp}
                    className="glass rounded-2xl border border-[var(--border)] p-6 shadow-[0_1px_2px_rgba(0,0,0,0.06),0_8px_24px_-8px_rgba(0,0,0,0.18)] hover:border-[var(--primary)]/40 transition-all duration-300 group"
                  >
                    {/* Category header */}
                    <div className="flex items-start justify-between mb-5">
                      <div className="flex items-center gap-3">
                        <div
                          className="flex h-11 w-11 items-center justify-center rounded-xl text-xl shadow-[0_2px_8px_rgba(0,0,0,0.15)]"
                          style={{ background: cat.color + "22", border: `1px solid ${cat.color}44` }}
                        >
                          {cat.icon}
                        </div>
                        <div>
                          <p className="font-semibold text-[var(--foreground)] text-sm leading-tight">
                            {cat.name}
                          </p>
                          <p
                            className="text-xs font-medium mt-0.5"
                            style={{ color: status.color }}
                          >
                            {status.label}
                          </p>
                        </div>
                      </div>
                      <span
                        className="text-xs font-bold px-2.5 py-1 rounded-full"
                        style={{
                          background: barBg,
                          color: barColor,
                          border: `1px solid ${barColor}44`,
                        }}
                      >
                        {cat.percentage}%
                      </span>
                    </div>

                    {/* Progress bar */}
                    <div
                      className="h-2 w-full rounded-full mb-4 overflow-hidden"
                      style={{ background: "var(--border)" }}
                    >
                      <motion.div
                        className="h-full rounded-full"
                        style={{ background: barColor }}
                        initial={{ width: 0 }}
                        animate={{ width: `${clampedPct}%` }}
                        transition={{ duration: 0.8, ease: "easeOut", delay: 0.1 }}
                      />
                    </div>

                    {/* Amounts */}
                    <div className="flex items-center justify-between text-xs">
                      <div>
                        <p className="text-[var(--muted-foreground)]">Spent</p>
                        <p className="font-semibold text-[var(--foreground)] mt-0.5">
                          {formatCurrency(cat.spent, cat.currency)}
                        </p>
                      </div>
                      <div className="text-center">
                        <p className="text-[var(--muted-foreground)]">Remaining</p>
                        <p
                          className="font-semibold mt-0.5"
                          style={{ color: cat.percentage >= 100 ? "#DC2626" : "#10B981" }}
                        >
                          {cat.percentage >= 100
                            ? `-${formatCurrency(cat.spent - cat.limit, cat.currency)}`
                            : formatCurrency(cat.remaining, cat.currency)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-[var(--muted-foreground)]">Limit</p>
                        <p className="font-semibold text-[var(--foreground)] mt-0.5">
                          {formatCurrency(cat.limit, cat.currency)}
                        </p>
                      </div>
                    </div>

                    {/* Over budget warning */}
                    {cat.percentage >= 100 && (
                      <div className="mt-4 flex items-center gap-2 rounded-lg bg-red-500/10 border border-red-500/20 px-3 py-2">
                        <AlertTriangle className="h-3.5 w-3.5 text-red-400 shrink-0" />
                        <p className="text-xs text-red-400 font-medium">
                          Exceeded by {formatCurrency(cat.spent - cat.limit, cat.currency)}
                        </p>
                      </div>
                    )}
                  </motion.div>
                </Reveal>
              );
            })}
          </motion.div>
        )}

        {/* ── Footer CTA ── */}
        <Reveal>
          <div className="mt-12 glass rounded-2xl border border-[var(--border)] p-8 flex flex-col sm:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--primary)]/15">
                <TrendingUp className="h-6 w-6 text-[var(--primary)]" />
              </div>
              <div>
                <p className="font-semibold text-[var(--foreground)]">
                  Want to adjust your limits?
                </p>
                <p className="text-sm text-[var(--muted-foreground)]">
                  Fine-tune your monthly budget for each category.
                </p>
              </div>
            </div>
            <Link
              href="/budget-settings"
              className="inline-flex items-center gap-2 rounded-xl bg-[var(--primary)] px-6 py-3 text-sm font-semibold text-white shadow-[0_0_16px_rgba(99,102,241,0.3)] transition-all duration-200 hover:opacity-90 hover:shadow-[0_0_24px_rgba(99,102,241,0.45)] whitespace-nowrap"
            >
              <Settings className="h-4 w-4" />
              Manage Budgets
            </Link>
          </div>
        </Reveal>
      </div>
    </div>
  );
}
