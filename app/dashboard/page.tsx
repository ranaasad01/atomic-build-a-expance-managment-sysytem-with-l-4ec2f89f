"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { TrendingUp, TrendingDown, DollarSign, Target, Wallet, Star, Plus, List, Settings, ArrowRight } from 'lucide-react';
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

// ─── Mock fallback data ───────────────────────────────────────────────────────

const MOCK_CATEGORIES: CategoryRow[] = EXPENSE_CATEGORIES.map((c, i) => ({
  id: `cat-${i}`,
  name: c.name,
  icon: c.icon,
  color: c.color,
  created_at: new Date().toISOString(),
}));

const MOCK_EXPENSES: ExpenseRow[] = [
  {
    id: "e1",
    user_id: "u1",
    category_id: "cat-0",
    title: "Grocery run",
    amount: "84.50",
    currency: "USD",
    notes: null,
    expense_date: "2024-06-10",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "e2",
    user_id: "u1",
    category_id: "cat-1",
    title: "Uber to airport",
    amount: "42.00",
    currency: "USD",
    notes: null,
    expense_date: "2024-06-09",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "e3",
    user_id: "u1",
    category_id: "cat-2",
    title: "New sneakers",
    amount: "129.99",
    currency: "USD",
    notes: null,
    expense_date: "2024-06-08",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "e4",
    user_id: "u1",
    category_id: "cat-3",
    title: "Electricity bill",
    amount: "95.00",
    currency: "USD",
    notes: null,
    expense_date: "2024-06-07",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "e5",
    user_id: "u1",
    category_id: "cat-5",
    title: "Netflix subscription",
    amount: "15.99",
    currency: "USD",
    notes: null,
    expense_date: "2024-06-06",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

const MOCK_BUDGETS: BudgetRow[] = EXPENSE_CATEGORIES.map((c, i) => ({
  id: `b-${i}`,
  user_id: "u1",
  category_id: `cat-${i}`,
  monthly_limit: "300",
  currency: "USD",
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
}));

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

  expenses.forEach((e) => {
    const d = new Date(e.expense_date + "T00:00:00");
    if (d.getFullYear() !== year || d.getMonth() !== month) return;
    const day = d.getDate();
    const weekIdx = Math.min(Math.floor((day - 1) / 7), 3);
    weeks[weekIdx].amount += parseFloat(e.amount) || 0;
  });

  return weeks.map((w) => ({ ...w, amount: parseFloat(w.amount.toFixed(2)) }));
}

function buildPieData(
  expenses: ExpenseRow[],
  categories: CategoryRow[]
) {
  const totals: Record<string, number> = {};
  expenses.forEach((e) => {
    totals[e.category_id] = (totals[e.category_id] ?? 0) + (parseFloat(e.amount) || 0);
  });

  return Object.entries(totals)
    .map(([catId, value]) => {
      const cat = categories.find((c) => c.id === catId);
      return {
        name: cat?.name ?? "Other",
        value: parseFloat(value.toFixed(2)),
        color: cat?.color ?? "#94A3B8",
        icon: cat?.icon ?? "📦",
      };
    })
    .sort((a, b) => b.value - a.value)
    .slice(0, 6);
}

// ─── Dashboard Component ──────────────────────────────────────────────────────

export default function DashboardPage() {
  const [categories, setCategories] = useState<CategoryRow[]>(MOCK_CATEGORIES);
  const [expenses, setExpenses] = useState<ExpenseRow[]>(MOCK_EXPENSES);
  const [budgets, setBudgets] = useState<BudgetRow[]>(MOCK_BUDGETS);
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState<string>("there");

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const supabase = createClient();

      const { data: userData } = await supabase.auth.getUser();
      const user = userData?.user;
      if (!user) {
        setLoading(false);
        return;
      }

      const displayName =
        user.user_metadata?.full_name ??
        user.user_metadata?.name ??
        user.email?.split("@")[0] ??
        "there";
      setUserName(displayName);

      const [catsResult, expResult, budResult] = await Promise.all([
        supabase.from("categories").select("*").order("name"),
        supabase
          .from("expenses")
          .select("*")
          .eq("user_id", user.id)
          .order("expense_date", { ascending: false })
          .limit(100),
        supabase.from("budgets").select("*").eq("user_id", user.id),
      ]);

      if (catsResult.data && catsResult.data.length > 0) {
        setCategories(catsResult.data as CategoryRow[]);
      }
      if (expResult.data) {
        setExpenses(expResult.data as ExpenseRow[]);
      }
      if (budResult.data) {
        setBudgets(budResult.data as BudgetRow[]);
      }
    } catch (err) {
      console.error("Dashboard fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ── Derived stats ────────────────────────────────────────────────────────────

  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  const monthlyExpenses = expenses.filter((e) => {
    const d = new Date(e.expense_date + "T00:00:00");
    return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
  });

  const totalSpentThisMonth = monthlyExpenses.reduce(
    (sum, e) => sum + (parseFloat(e.amount) || 0),
    0
  );

  const totalBudget = budgets.reduce(
    (sum, b) => sum + (parseFloat(b.monthly_limit) || 0),
    0
  );

  const budgetUsedPct =
    totalBudget > 0 ? Math.min((totalSpentThisMonth / totalBudget) * 100, 100) : 0;

  const recentExpenses = expenses.slice(0, 5);

  const barData = buildBarData(expenses);
  const pieData = buildPieData(expenses, categories);

  // Top category
  const topCategory = pieData[0];

  // Previous month comparison (mock: assume 10% less last month)
  const prevMonthTotal = totalSpentThisMonth * 0.9;
  const monthDelta = totalSpentThisMonth - prevMonthTotal;
  const monthDeltaPct = prevMonthTotal > 0 ? (monthDelta / prevMonthTotal) * 100 : 0;

  const summaryCards = [
    {
      label: "Total Spent",
      value: formatCurrency(totalSpentThisMonth),
      icon: DollarSign,
      color: "#6366F1",
      sub: `${monthDeltaPct >= 0 ? "+" : ""}${monthDeltaPct.toFixed(1)}% vs last month`,
      trend: monthDeltaPct >= 0 ? "up" : "down",
    },
    {
      label: "Monthly Budget",
      value: formatCurrency(totalBudget),
      icon: Target,
      color: "#F59E0B",
      sub: `${budgetUsedPct.toFixed(0)}% used`,
      trend: budgetUsedPct > 80 ? "up" : "down",
    },
    {
      label: "Remaining",
      value: formatCurrency(Math.max(totalBudget - totalSpentThisMonth, 0)),
      icon: Wallet,
      color: "#10B981",
      sub: totalBudget > 0 ? `${(100 - budgetUsedPct).toFixed(0)}% of budget left` : "No budget set",
      trend: "down",
    },
    {
      label: "Top Category",
      value: topCategory?.name ?? "N/A",
      icon: Star,
      color: topCategory?.color ?? "#94A3B8",
      sub: topCategory ? formatCurrency(topCategory.value) : "No expenses yet",
      trend: "up",
    },
  ];

  return (
    <div
      className="min-h-screen pt-20 pb-16 px-4 sm:px-6 lg:px-8"
      style={{ background: "var(--background)" }}
    >
      <div className="max-w-7xl mx-auto">
        {/* ── Header ── */}
        <Reveal>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-10">
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-[var(--foreground)]">
                Welcome back, {userName} 👋
              </h1>
              <p className="mt-1 text-[var(--muted-foreground)] text-sm">
                Here's your financial overview for{" "}
                {now.toLocaleDateString("en-US", { month: "long", year: "numeric" })}.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Link
                href="/expenses/add"
                className="inline-flex items-center gap-2 rounded-xl bg-[var(--primary)] px-4 py-2.5 text-sm font-semibold text-white shadow-[0_0_16px_rgba(99,102,241,0.3)] hover:opacity-90 transition-all duration-200"
              >
                <Plus className="h-4 w-4" />
                Add Expense
              </Link>
              <Link
                href="/budget"
                className="inline-flex items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--card)] px-4 py-2.5 text-sm font-semibold text-[var(--foreground)] hover:border-[var(--primary)] transition-all duration-200"
              >
                <Settings className="h-4 w-4" />
                Budgets
              </Link>
            </div>
          </div>
        </Reveal>

        {/* ── Summary Cards ── */}
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-10"
        >
          {summaryCards.map((card) => (
            <motion.div
              key={card.label}
              variants={fadeInUp}
              className="glass rounded-2xl p-5 border border-[var(--border)] shadow-[0_1px_2px_rgba(0,0,0,0.04),0_8px_24px_-8px_rgba(0,0,0,0.2)]"
            >
              <div className="flex items-start justify-between mb-3">
                <div
                  className="flex h-10 w-10 items-center justify-center rounded-xl"
                  style={{ backgroundColor: card.color + "22" }}
                >
                  <card.icon
                    className="h-5 w-5"
                    style={{ color: card.color }}
                    aria-hidden="true"
                  />
                </div>
                {card.trend === "up" ? (
                  <TrendingUp className="h-4 w-4 text-[var(--destructive)]" aria-hidden="true" />
                ) : (
                  <TrendingDown className="h-4 w-4 text-[#10B981]" aria-hidden="true" />
                )}
              </div>
              <p className="text-xs text-[var(--muted-foreground)] mb-1">{card.label}</p>
              <p className="text-xl font-bold text-[var(--foreground)] tracking-tight truncate">
                {card.value}
              </p>
              <p className="mt-1 text-xs text-[var(--muted-foreground)]">{card.sub}</p>
            </motion.div>
          ))}
        </motion.div>

        {/* ── Charts Row ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-10">
          {/* Bar Chart */}
          <Reveal className="lg:col-span-2">
            <div className="glass rounded-2xl border border-[var(--border)] p-6 h-full">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-base font-semibold text-[var(--foreground)]">
                  Weekly Spending
                </h2>
                <span className="text-xs text-[var(--muted-foreground)]">
                  {now.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
                </span>
              </div>
              {loading ? (
                <div className="flex items-center justify-center h-48">
                  <div className="h-8 w-8 rounded-full border-2 border-[var(--primary)] border-t-transparent animate-spin" />
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={barData} margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#2E2E4A" vertical={false} />
                    <XAxis
                      dataKey="label"
                      tick={{ fill: "#94A3B8", fontSize: 12 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fill: "#94A3B8", fontSize: 12 }}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(v: number) => `$${v}`}
                    />
                    <Tooltip
                      contentStyle={{
                        background: "#1A1A2E",
                        border: "1px solid #2E2E4A",
                        borderRadius: "12px",
                        color: "#F1F5F9",
                        fontSize: 13,
                      }}
                      formatter={(value: number) => [formatCurrency(value), "Spent"]}
                    />
                    <Bar
                      dataKey="amount"
                      fill="#6366F1"
                      radius={[6, 6, 0, 0]}
                      maxBarSize={48}
                    />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </Reveal>

          {/* Pie Chart */}
          <Reveal>
            <div className="glass rounded-2xl border border-[var(--border)] p-6 h-full">
              <h2 className="text-base font-semibold text-[var(--foreground)] mb-6">
                By Category
              </h2>
              {loading ? (
                <div className="flex items-center justify-center h-48">
                  <div className="h-8 w-8 rounded-full border-2 border-[var(--primary)] border-t-transparent animate-spin" />
                </div>
              ) : pieData.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-48 text-[var(--muted-foreground)] text-sm">
                  <span className="text-3xl mb-2">📊</span>
                  No data yet
                </div>
              ) : (
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
                        background: "#1A1A2E",
                        border: "1px solid #2E2E4A",
                        borderRadius: "12px",
                        color: "#F1F5F9",
                        fontSize: 13,
                      }}
                      formatter={(value: number) => [formatCurrency(value), "Spent"]}
                    />
                    <Legend
                      iconType="circle"
                      iconSize={8}
                      formatter={(value: string) => (
                        <span style={{ color: "#94A3B8", fontSize: 12 }}>{value}</span>
                      )}
                    />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
          </Reveal>
        </div>

        {/* ── Budget Progress ── */}
        <Reveal className="mb-10">
          <div className="glass rounded-2xl border border-[var(--border)] p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-base font-semibold text-[var(--foreground)]">
                Budget Progress
              </h2>
              <Link
                href="/budget"
                className="text-xs text-[var(--primary)] hover:underline flex items-center gap-1"
              >
                Manage <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
            {budgets.length === 0 ? (
              <p className="text-sm text-[var(--muted-foreground)]">
                No budgets set.{" "}
                <Link href="/budget" className="text-[var(--primary)] hover:underline">
                  Set one now.
                </Link>
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {budgets.slice(0, 6).map((budget) => {
                  const cat = categories.find((c) => c.id === budget.category_id);
                  const spent = monthlyExpenses
                    .filter((e) => e.category_id === budget.category_id)
                    .reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0);
                  const limit = parseFloat(budget.monthly_limit) || 0;
                  const pct = limit > 0 ? Math.min((spent / limit) * 100, 100) : 0;
                  const isOver = spent > limit && limit > 0;

                  return (
                    <div
                      key={budget.id}
                      className="rounded-xl border border-[var(--border)] bg-[var(--background)]/50 p-4"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{cat?.icon ?? "📦"}</span>
                          <span className="text-sm font-medium text-[var(--foreground)] truncate">
                            {cat?.name ?? "Category"}
                          </span>
                        </div>
                        <span
                          className="text-xs font-semibold"
                          style={{ color: isOver ? "#DC2626" : "#10B981" }}
                        >
                          {pct.toFixed(0)}%
                        </span>
                      </div>
                      <div className="h-1.5 rounded-full bg-[var(--border)] overflow-hidden mb-2">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${pct}%`,
                            backgroundColor: isOver ? "#DC2626" : cat?.color ?? "#6366F1",
                          }}
                        />
                      </div>
                      <div className="flex justify-between text-xs text-[var(--muted-foreground)]">
                        <span>{formatCurrency(spent)}</span>
                        <span>of {formatCurrency(limit)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </Reveal>

        {/* ── Recent Expenses ── */}
        <Reveal>
          <div className="glass rounded-2xl border border-[var(--border)] p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-base font-semibold text-[var(--foreground)]">
                Recent Expenses
              </h2>
              <Link
                href="/expenses"
                className="text-xs text-[var(--primary)] hover:underline flex items-center gap-1"
              >
                View all <ArrowRight className="h-3 w-3" />
              </Link>
            </div>

            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="h-14 rounded-xl bg-[var(--border)]/30 animate-pulse"
                  />
                ))}
              </div>
            ) : recentExpenses.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <span className="text-4xl mb-3">💸</span>
                <p className="text-sm text-[var(--muted-foreground)]">
                  No expenses yet.{" "}
                  <Link
                    href="/expenses/add"
                    className="text-[var(--primary)] hover:underline"
                  >
                    Add your first one.
                  </Link>
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {recentExpenses.map((expense) => {
                  const cat = categories.find((c) => c.id === expense.category_id);
                  return (
                    <div
                      key={expense.id}
                      className="flex items-center justify-between rounded-xl border border-[var(--border)] bg-[var(--background)]/40 px-4 py-3 hover:border-[var(--primary)]/40 transition-colors duration-200"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl text-base"
                          style={{ backgroundColor: (cat?.color ?? "#94A3B8") + "22" }}
                        >
                          {cat?.icon ?? "📦"}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-[var(--foreground)] truncate">
                            {expense.title}
                          </p>
                          <p className="text-xs text-[var(--muted-foreground)]">
                            {cat?.name ?? "Other"} &middot; {formatDate(expense.expense_date)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 flex-shrink-0">
                        <span className="text-sm font-semibold text-[var(--foreground)]">
                          {formatCurrency(parseFloat(expense.amount) || 0, expense.currency)}
                        </span>
                        <Link
                          href={`/expenses/add?id=${expense.id}`}
                          className="text-[var(--muted-foreground)] hover:text-[var(--primary)] transition-colors duration-200"
                          aria-label="Edit expense"
                        >
                          <List className="h-4 w-4" />
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </Reveal>

        {/* ── Quick Actions ── */}
        <Reveal className="mt-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: "Add Expense", href: "/expenses/add", icon: Plus, color: "#6366F1" },
              { label: "View Expenses", href: "/expenses", icon: List, color: "#F59E0B" },
              { label: "Analytics", href: "/analytics", icon: TrendingUp, color: "#10B981" },
              { label: "Budget Settings", href: "/budget", icon: Settings, color: "#8B5CF6" },
            ].map((action) => (
              <Link
                key={action.label}
                href={action.href}
                className="glass flex flex-col items-center gap-2 rounded-2xl border border-[var(--border)] p-4 text-center hover:border-[var(--primary)]/50 transition-all duration-200 group"
              >
                <div
                  className="flex h-10 w-10 items-center justify-center rounded-xl transition-transform duration-200 group-hover:scale-110"
                  style={{ backgroundColor: action.color + "22" }}
                >
                  <action.icon
                    className="h-5 w-5"
                    style={{ color: action.color }}
                    aria-hidden="true"
                  />
                </div>
                <span className="text-xs font-medium text-[var(--foreground)]">
                  {action.label}
                </span>
              </Link>
            ))}
          </div>
        </Reveal>
      </div>
    </div>
  );
}
