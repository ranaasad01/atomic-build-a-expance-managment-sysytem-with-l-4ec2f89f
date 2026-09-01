"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { TrendingUp, TrendingDown, DollarSign, Target, Wallet, Plus, List, Settings, ArrowRight, PackageOpen } from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import { Reveal } from "@/components/Reveal";
import { staggerContainer, fadeInUp } from "@/lib/motion";
import { EXPENSE_CATEGORIES } from "@/lib/data";
import { createClient } from "@/lib/supabase/client";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatCurrency(amount: number, currency = 'USD'): string {
  try {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount ?? 0);
  } catch {
    return `$${(amount ?? 0).toFixed(2)}`;
  }
}

function formatDate(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return dateStr;
  }
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface CategoryRow {
  id: string;
  name: string;
  icon: string | null;
  color: string | null;
  created_at: string;
}

interface ExpenseRow {
  id: string;
  user_id: string;
  category_id: string;
  title: string;
  amount: string;
  currency: string;
  notes: string | null;
  expense_date: string;
  created_at: string;
  updated_at: string;
}

interface BudgetRow {
  id: string;
  user_id: string;
  category_id: string;
  monthly_limit: string;
  currency: string;
  created_at: string;
  updated_at: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function buildBarData(expenses: ExpenseRow[]) {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();

  const weeks: { label: string; amount: number }[] = [
    { label: "Week 1", amount: 0 },
    { label: "Week 2", amount: 0 },
    { label: "Week 3", amount: 0 },
    { label: "Week 4", amount: 0 },
  ];

  expenses.forEach((exp) => {
    const d = new Date(exp.expense_date);
    if (d.getFullYear() !== year || d.getMonth() !== month) return;
    const weekIdx = Math.min(Math.floor((d.getDate() - 1) / 7), 3);
    weeks[weekIdx].amount += parseFloat(exp.amount) || 0;
  });

  return weeks;
}

function buildPieData(expenses: ExpenseRow[], categories: CategoryRow[]) {
  const totals: Record<string, number> = {};
  expenses.forEach((exp) => {
    totals[exp.category_id] = (totals[exp.category_id] || 0) + (parseFloat(exp.amount) || 0);
  });

  return Object.entries(totals)
    .map(([catId, amount]) => {
      const cat = categories.find((c) => c.id === catId);
      const staticCat = EXPENSE_CATEGORIES.find((c) => cat && c.name === cat.name);
      return {
        name: cat?.name ?? "Other",
        value: parseFloat(amount.toFixed(2)),
        color: cat?.color ?? staticCat?.color ?? "#94A3B8",
      };
    })
    .filter((d) => d.value > 0)
    .sort((a, b) => b.value - a.value);
}

function getThisMonthExpenses(expenses: ExpenseRow[]): ExpenseRow[] {
  const now = new Date();
  return expenses.filter((e) => {
    const d = new Date(e.expense_date);
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
  });
}

function getTotalSpent(expenses: ExpenseRow[]): number {
  return expenses.reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0);
}

function getTotalBudget(budgets: BudgetRow[]): number {
  return budgets.reduce((sum, b) => sum + (parseFloat(b.monthly_limit) || 0), 0);
}

function getTopCategory(expenses: ExpenseRow[], categories: CategoryRow[]): string {
  if (!expenses.length) return "—";
  const totals: Record<string, number> = {};
  expenses.forEach((e) => {
    totals[e.category_id] = (totals[e.category_id] || 0) + (parseFloat(e.amount) || 0);
  });
  const topId = Object.entries(totals).sort((a, b) => b[1] - a[1])[0]?.[0];
  return categories.find((c) => c.id === topId)?.name ?? "—";
}

// ─── Empty State ──────────────────────────────────────────────────────────────

function EmptyState() {
  return (
    <motion.div
      variants={fadeInUp}
      initial="hidden"
      animate="visible"
      className="flex flex-col items-center justify-center py-20 px-4 text-center"
    >
      <div className="w-20 h-20 rounded-2xl bg-[var(--card)] border border-[var(--border)] flex items-center justify-center mb-6 shadow-[0_4px_24px_rgba(99,102,241,0.12)]">
        <PackageOpen className="w-9 h-9 text-[var(--muted-foreground)]" />
      </div>
      <h3 className="text-xl font-semibold text-[var(--foreground)] mb-2">No expenses yet</h3>
      <p className="text-[var(--muted-foreground)] max-w-sm mb-8 leading-relaxed">
        Add your first expense to start tracking your spending and see insights here.
      </p>
      <Link
        href="/expenses/add"
        className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[var(--primary)] text-white font-semibold hover:opacity-90 transition-all duration-200 shadow-[0_4px_16px_rgba(99,102,241,0.35)]"
      >
        <Plus className="w-4 h-4" />
        Add your first expense
      </Link>
    </motion.div>
  );
}

// ─── Dashboard Page ───────────────────────────────────────────────────────────

export default function DashboardPage() {
  const [expenses, setExpenses] = useState<ExpenseRow[]>([]);
  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [budgets, setBudgets] = useState<BudgetRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userName, setUserName] = useState<string>("");

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const supabase = createClient();

      const { data: userData } = await supabase.auth.getUser();
      const email = userData?.user?.email ?? "";
      setUserName(email.split("@")[0] ?? "");

      const [catResult, expResult, budResult] = await Promise.all([
        supabase.from("categories").select("*").order("name"),
        supabase
          .from("expenses")
          .select("*")
          .order("expense_date", { ascending: false })
          .limit(200),
        supabase.from("budgets").select("*"),
      ]);

      setCategories(catResult.error ? [] : (catResult.data as CategoryRow[]) ?? []);
      setExpenses(expResult.error ? [] : (expResult.data as ExpenseRow[]) ?? []);
      setBudgets(budResult.error ? [] : (budResult.data as BudgetRow[]) ?? []);
    } catch (err) {
      console.error("Dashboard fetch error:", err);
      setError("Failed to load dashboard data.");
      setCategories([]);
      setExpenses([]);
      setBudgets([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const thisMonthExpenses = getThisMonthExpenses(expenses);
  const totalSpent = getTotalSpent(thisMonthExpenses);
  const totalBudget = getTotalBudget(budgets);
  const topCategory = getTopCategory(thisMonthExpenses, categories);
  const barData = buildBarData(expenses);
  const pieData = buildPieData(thisMonthExpenses, categories);
  const recentExpenses = expenses.slice(0, 5);
  const hasExpenses = expenses.length > 0;

  const summaryCards = [
    {
      label: "Total Spent (This Month)",
      value: formatCurrency(totalSpent),
      icon: DollarSign,
      color: "#6366F1",
      trend: null,
    },
    {
      label: "Monthly Budget",
      value: totalBudget > 0 ? formatCurrency(totalBudget) : "Not set",
      icon: Target,
      color: "#F59E0B",
      trend: null,
    },
    {
      label: "Top Category",
      value: topCategory,
      icon: Wallet,
      color: "#10B981",
      trend: null,
    },
    {
      label: "Transactions",
      value: String(thisMonthExpenses.length),
      icon: List,
      color: "#8B5CF6",
      trend: null,
    },
  ];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--background)]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 rounded-full border-2 border-[var(--primary)] border-t-transparent animate-spin" />
          <p className="text-sm text-[var(--muted-foreground)]">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--background)] mesh-bg pt-20 pb-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* ── Header ── */}
        <Reveal>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-10">
            <div>
              <h1 className="text-3xl font-bold text-[var(--foreground)] tracking-tight">
                {userName ? `Welcome back, ${userName}` : "Dashboard"}
              </h1>
              <p className="text-[var(--muted-foreground)] mt-1 text-sm">
                Here&apos;s your financial overview for this month.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Link
                href="/budget-settings"
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-[var(--border)] text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:border-[var(--primary)] transition-all duration-200 text-sm font-medium"
              >
                <Settings className="w-4 h-4" />
                Budget Settings
              </Link>
              <Link
                href="/expenses/add"
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[var(--primary)] text-white font-semibold hover:opacity-90 transition-all duration-200 text-sm shadow-[0_4px_16px_rgba(99,102,241,0.35)]"
              >
                <Plus className="w-4 h-4" />
                Add Expense
              </Link>
            </div>
          </div>
        </Reveal>

        {/* ── Error Banner ── */}
        {error && (
          <div className="mb-6 p-4 rounded-xl bg-[var(--destructive)]/10 border border-[var(--destructive)]/30 text-[var(--destructive)] text-sm">
            {error}
          </div>
        )}

        {/* ── Summary Cards ── */}
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8"
        >
          {summaryCards.map((card) => (
            <motion.div
              key={card.label}
              variants={fadeInUp}
              className="glass rounded-2xl p-5 border border-[var(--border)] shadow-[0_1px_2px_rgba(0,0,0,0.04),0_8px_24px_-8px_rgba(0,0,0,0.18)]"
            >
              <div className="flex items-start justify-between mb-3">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center"
                  style={{ background: `${card.color}22` }}
                >
                  <card.icon className="w-5 h-5" style={{ color: card.color }} />
                </div>
              </div>
              <p className="text-xs text-[var(--muted-foreground)] mb-1 font-medium uppercase tracking-wide">
                {card.label}
              </p>
              <p className="text-2xl font-bold text-[var(--foreground)] tracking-tight">
                {card.value}
              </p>
            </motion.div>
          ))}
        </motion.div>

        {/* ── Empty State or Charts + Table ── */}
        {!hasExpenses ? (
          <EmptyState />
        ) : (
          <>
            {/* ── Charts Row ── */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
              {/* Bar Chart */}
              <Reveal className="lg:col-span-2">
                <div className="glass rounded-2xl p-6 border border-[var(--border)] h-full shadow-[0_1px_2px_rgba(0,0,0,0.04),0_8px_24px_-8px_rgba(0,0,0,0.18)]">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-base font-semibold text-[var(--foreground)]">Monthly Overview</h2>
                    <TrendingUp className="w-4 h-4 text-[var(--muted-foreground)]" />
                  </div>
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={barData} margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                      <XAxis
                        dataKey="label"
                        tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis
                        tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
                        axisLine={false}
                        tickLine={false}
                        tickFormatter={(v) => `$${v}`}
                      />
                      <Tooltip
                        contentStyle={{
                          background: "var(--card)",
                          border: "1px solid var(--border)",
                          borderRadius: "12px",
                          color: "var(--foreground)",
                          fontSize: 13,
                        }}
                        formatter={(value: number) => [formatCurrency(value), "Spent"]}
                      />
                      <Bar dataKey="amount" fill="var(--primary)" radius={[6, 6, 0, 0]} maxBarSize={48} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </Reveal>

              {/* Pie Chart */}
              <Reveal>
                <div className="glass rounded-2xl p-6 border border-[var(--border)] h-full shadow-[0_1px_2px_rgba(0,0,0,0.04),0_8px_24px_-8px_rgba(0,0,0,0.18)]">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-base font-semibold text-[var(--foreground)]">Category Breakdown</h2>
                    <TrendingDown className="w-4 h-4 text-[var(--muted-foreground)]" />
                  </div>
                  {pieData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={220}>
                      <PieChart>
                        <Pie
                          data={pieData}
                          cx="50%"
                          cy="50%"
                          innerRadius={55}
                          outerRadius={85}
                          paddingAngle={3}
                          dataKey="value"
                        >
                          {pieData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={{
                            background: "var(--card)",
                            border: "1px solid var(--border)",
                            borderRadius: "12px",
                            color: "var(--foreground)",
                            fontSize: 13,
                          }}
                          formatter={(value: number) => [formatCurrency(value), "Spent"]}
                        />
                        <Legend
                          iconType="circle"
                          iconSize={8}
                          wrapperStyle={{ fontSize: 12, color: "var(--muted-foreground)" }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-[220px] text-[var(--muted-foreground)] text-sm">
                      No data for this month
                    </div>
                  )}
                </div>
              </Reveal>
            </div>

            {/* ── Budget Progress ── */}
            {budgets.length > 0 && (
              <Reveal>
                <div className="glass rounded-2xl p-6 border border-[var(--border)] mb-8 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_8px_24px_-8px_rgba(0,0,0,0.18)]">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-base font-semibold text-[var(--foreground)]">Budget Progress</h2>
                    <Link
                      href="/budget-settings"
                      className="text-xs text-[var(--primary)] hover:underline flex items-center gap-1"
                    >
                      Manage <ArrowRight className="w-3 h-3" />
                    </Link>
                  </div>
                  <div className="space-y-4">
                    {budgets.slice(0, 5).map((budget) => {
                      const cat = categories.find((c) => c.id === budget.category_id);
                      const staticCat = EXPENSE_CATEGORIES.find((c) => cat && c.name === cat.name);
                      const spent = thisMonthExpenses
                        .filter((e) => e.category_id === budget.category_id)
                        .reduce((s, e) => s + (parseFloat(e.amount) || 0), 0);
                      const limit = parseFloat(budget.monthly_limit) || 0;
                      const pct = limit > 0 ? Math.min((spent / limit) * 100, 100) : 0;
                      const isOver = spent > limit && limit > 0;
                      return (
                        <div key={budget.id}>
                          <div className="flex items-center justify-between mb-1.5">
                            <div className="flex items-center gap-2">
                              <span className="text-base">{cat?.icon ?? staticCat?.icon ?? "📦"}</span>
                              <span className="text-sm font-medium text-[var(--foreground)]">
                                {cat?.name ?? "Unknown"}
                              </span>
                            </div>
                            <div className="text-xs text-[var(--muted-foreground)]">
                              <span className={isOver ? "text-[var(--destructive)] font-semibold" : ""}>
                                {formatCurrency(spent)}
                              </span>
                              {" / "}
                              {formatCurrency(limit)}
                            </div>
                          </div>
                          <div className="h-2 rounded-full bg-[var(--border)] overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all duration-500"
                              style={{
                                width: `${pct}%`,
                                background: isOver ? "var(--destructive)" : staticCat?.color ?? "var(--primary)",
                              }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </Reveal>
            )}

            {/* ── Recent Expenses ── */}
            <Reveal>
              <div className="glass rounded-2xl border border-[var(--border)] shadow-[0_1px_2px_rgba(0,0,0,0.04),0_8px_24px_-8px_rgba(0,0,0,0.18)]">
                <div className="flex items-center justify-between px-6 py-5 border-b border-[var(--border)]">
                  <h2 className="text-base font-semibold text-[var(--foreground)]">Recent Expenses</h2>
                  <Link
                    href="/expenses"
                    className="text-xs text-[var(--primary)] hover:underline flex items-center gap-1"
                  >
                    View all <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>
                <div className="divide-y divide-[var(--border)]">
                  {recentExpenses.map((exp) => {
                    const cat = categories.find((c) => c.id === exp.category_id);
                    const staticCat = EXPENSE_CATEGORIES.find((c) => cat && c.name === cat.name);
                    return (
                      <div
                        key={exp.id}
                        className="flex items-center justify-between px-6 py-4 hover:bg-white/[0.02] transition-colors duration-150"
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className="w-9 h-9 rounded-xl flex items-center justify-center text-base flex-shrink-0"
                            style={{ background: `${cat?.color ?? staticCat?.color ?? "#94A3B8"}22` }}
                          >
                            {cat?.icon ?? staticCat?.icon ?? "📦"}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-[var(--foreground)] leading-tight">
                              {exp.title}
                            </p>
                            <p className="text-xs text-[var(--muted-foreground)] mt-0.5">
                              {cat?.name ?? "Uncategorized"} · {formatDate(exp.expense_date)}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-semibold text-[var(--foreground)]">
                            {formatCurrency(parseFloat(exp.amount) || 0, exp.currency)}
                          </p>
                          <p className="text-xs text-[var(--muted-foreground)] mt-0.5 uppercase">
                            {exp.currency}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </Reveal>
          </>
        )}
      </div>
    </div>
  );
}
