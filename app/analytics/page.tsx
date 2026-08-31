"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
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
import { TrendingUp, PieChart as PieIcon, BarChart2, Calendar } from 'lucide-react';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatCurrency(amount: number, currency = "USD"): string {
  try {
    return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(amount ?? 0);
  } catch {
    return `$${(amount ?? 0).toFixed(2)}`;
  }
}

function formatDate(dateStr: string): string {
  try {
    return new Date(dateStr + "T00:00:00").toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface Expense {
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

interface Category {
  id: string;
  name: string;
  icon: string | null;
  color: string | null;
  created_at: string;
}

interface MonthlyBar {
  month: string;
  amount: number;
}

interface CategorySlice {
  name: string;
  value: number;
  color: string;
  icon: string;
}

// ─── Mock fallback data ───────────────────────────────────────────────────────

const MOCK_CATEGORIES: Category[] = EXPENSE_CATEGORIES.map((c, i) => ({
  id: `cat-${i}`,
  name: c.name,
  icon: c.icon,
  color: c.color,
  created_at: new Date().toISOString(),
}));

const MOCK_EXPENSES: Expense[] = [
  { id: "e1", user_id: "u1", category_id: "cat-0", title: "Grocery run", amount: "84.50", currency: "USD", notes: null, expense_date: "2024-06-10", created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: "e2", user_id: "u1", category_id: "cat-1", title: "Uber to airport", amount: "42.00", currency: "USD", notes: null, expense_date: "2024-06-09", created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: "e3", user_id: "u1", category_id: "cat-2", title: "New sneakers", amount: "129.99", currency: "USD", notes: null, expense_date: "2024-05-15", created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: "e4", user_id: "u1", category_id: "cat-3", title: "Electricity bill", amount: "95.00", currency: "USD", notes: null, expense_date: "2024-05-07", created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: "e5", user_id: "u1", category_id: "cat-5", title: "Netflix", amount: "15.99", currency: "USD", notes: null, expense_date: "2024-04-06", created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: "e6", user_id: "u1", category_id: "cat-0", title: "Restaurant dinner", amount: "67.20", currency: "USD", notes: null, expense_date: "2024-04-20", created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: "e7", user_id: "u1", category_id: "cat-4", title: "Gym membership", amount: "49.00", currency: "USD", notes: null, expense_date: "2024-03-01", created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: "e8", user_id: "u1", category_id: "cat-1", title: "Monthly transit", amount: "120.00", currency: "USD", notes: null, expense_date: "2024-03-05", created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: "e9", user_id: "u1", category_id: "cat-2", title: "Online shopping", amount: "210.00", currency: "USD", notes: null, expense_date: "2024-02-14", created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: "e10", user_id: "u1", category_id: "cat-3", title: "Internet bill", amount: "59.99", currency: "USD", notes: null, expense_date: "2024-01-10", created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
];

// ─── Compute helpers ──────────────────────────────────────────────────────────

function buildMonthlyBarData(expenses: Expense[]): MonthlyBar[] {
  const now = new Date();
  const months: MonthlyBar[] = [];

  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const label = d.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
    months.push({ month: label, amount: 0 });
  }

  expenses.forEach((e) => {
    const d = new Date(e.expense_date + "T00:00:00");
    const monthsAgo = (now.getFullYear() - d.getFullYear()) * 12 + (now.getMonth() - d.getMonth());
    if (monthsAgo >= 0 && monthsAgo <= 5) {
      const idx = 5 - monthsAgo;
      months[idx].amount += parseFloat(e.amount) || 0;
    }
  });

  return months;
}

function buildCategoryPieData(expenses: Expense[], categories: Category[]): CategorySlice[] {
  const totals: Record<string, number> = {};
  expenses.forEach((e) => {
    totals[e.category_id] = (totals[e.category_id] ?? 0) + (parseFloat(e.amount) || 0);
  });

  return Object.entries(totals)
    .map(([catId, value]) => {
      const cat = categories.find((c) => c.id === catId);
      const staticCat = EXPENSE_CATEGORIES.find((c) => c.name === cat?.name);
      return {
        name: cat?.name ?? "Other",
        value: Math.round(value * 100) / 100,
        color: cat?.color ?? staticCat?.color ?? "#94A3B8",
        icon: cat?.icon ?? staticCat?.icon ?? "📦",
      };
    })
    .filter((s) => s.value > 0)
    .sort((a, b) => b.value - a.value);
}

// ─── Custom Tooltip ───────────────────────────────────────────────────────────

function CustomBarTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number }>; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div
      className="rounded-xl border px-4 py-3 text-sm shadow-xl"
      style={{
        background: "var(--card)",
        borderColor: "var(--border)",
        color: "var(--foreground)",
      }}
    >
      <p className="font-semibold mb-1" style={{ color: "var(--muted-foreground)" }}>{label}</p>
      <p className="font-bold" style={{ color: "var(--primary)" }}>{formatCurrency(payload[0].value)}</p>
    </div>
  );
}

function CustomPieTooltip({ active, payload }: { active?: boolean; payload?: Array<{ name: string; value: number; payload: CategorySlice }> }) {
  if (!active || !payload?.length) return null;
  const item = payload[0];
  return (
    <div
      className="rounded-xl border px-4 py-3 text-sm shadow-xl"
      style={{
        background: "var(--card)",
        borderColor: "var(--border)",
        color: "var(--foreground)",
      }}
    >
      <p className="font-semibold mb-1">{item.payload.icon} {item.name}</p>
      <p className="font-bold" style={{ color: item.payload.color }}>{formatCurrency(item.value)}</p>
    </div>
  );
}

// ─── Summary Card ─────────────────────────────────────────────────────────────

function SummaryCard({
  icon: Icon,
  label,
  value,
  sub,
  accent,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  sub?: string;
  accent: string;
}) {
  return (
    <motion.div
      variants={fadeInUp}
      className="rounded-2xl border p-5 flex flex-col gap-3"
      style={{
        background: "var(--card)",
        borderColor: "var(--border)",
        boxShadow: "0 1px 2px rgba(0,0,0,0.08), 0 8px 24px -8px rgba(0,0,0,0.24)",
      }}
    >
      <div
        className="w-10 h-10 rounded-xl flex items-center justify-center"
        style={{ background: accent + "22" }}
      >
        <Icon className="w-5 h-5" style={{ color: accent }} />
      </div>
      <div>
        <p className="text-xs font-medium uppercase tracking-wide" style={{ color: "var(--muted-foreground)" }}>
          {label}
        </p>
        <p className="text-2xl font-bold mt-0.5" style={{ color: "var(--foreground)" }}>
          {value}
        </p>
        {sub && (
          <p className="text-xs mt-1" style={{ color: "var(--muted-foreground)" }}>
            {sub}
          </p>
        )}
      </div>
    </motion.div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AnalyticsPage() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [usingMock, setUsingMock] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
          setExpenses(MOCK_EXPENSES);
          setCategories(MOCK_CATEGORIES);
          setUsingMock(true);
          setLoading(false);
          return;
        }

        const [catRes, expRes] = await Promise.all([
          supabase.from("categories").select("*").order("name"),
          supabase
            .from("expenses")
            .select("*")
            .eq("user_id", user.id)
            .order("expense_date", { ascending: false }),
        ]);

        const cats: Category[] =
          catRes.error || !catRes.data || catRes.data.length === 0
            ? MOCK_CATEGORIES
            : (catRes.data as Category[]);

        const exps: Expense[] =
          expRes.error || !expRes.data || expRes.data.length === 0
            ? MOCK_EXPENSES
            : (expRes.data as Expense[]);

        if ((catRes.error || !catRes.data?.length) && (expRes.error || !expRes.data?.length)) {
          setUsingMock(true);
        }

        setCategories(cats);
        setExpenses(exps);
      } catch {
        setExpenses(MOCK_EXPENSES);
        setCategories(MOCK_CATEGORIES);
        setUsingMock(true);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  // ── Derived data ────────────────────────────────────────────────────────────

  const monthlyData = buildMonthlyBarData(expenses);
  const categoryData = buildCategoryPieData(expenses, categories);

  const totalSpent = expenses.reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0);

  const avgMonthly = (() => {
    const nonZeroMonths = monthlyData.filter((m) => m.amount > 0).length;
    return nonZeroMonths > 0 ? totalSpent / nonZeroMonths : 0;
  })();

  const topCategory = categoryData[0] ?? null;

  const mostExpensiveMonth = monthlyData.reduce(
    (best, m) => (m.amount > best.amount ? m : best),
    { month: "N/A", amount: 0 }
  );

  // ── Loading skeleton ────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ background: "var(--background)" }}
      >
        <div className="flex flex-col items-center gap-4">
          <div
            className="w-12 h-12 rounded-full border-2 border-t-transparent animate-spin"
            style={{ borderColor: "var(--primary)", borderTopColor: "transparent" }}
          />
          <p style={{ color: "var(--muted-foreground)" }} className="text-sm">
            Loading analytics...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen mesh-bg"
      style={{ background: "var(--background)" }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 pt-24">

        {/* ── Page Header ── */}
        <Reveal>
          <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1
                className="text-3xl font-bold tracking-tight"
                style={{ color: "var(--foreground)" }}
              >
                Analytics
              </h1>
              <p className="mt-1 text-sm" style={{ color: "var(--muted-foreground)" }}>
                Visual breakdown of your spending patterns over the last 6 months.
              </p>
            </div>
            {usingMock && (
              <span
                className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium border"
                style={{
                  background: "rgba(245,158,11,0.1)",
                  borderColor: "rgba(245,158,11,0.3)",
                  color: "var(--accent)",
                }}
              >
                Demo data
              </span>
            )}
          </div>
        </Reveal>

        {/* ── Summary Cards ── */}
        <Reveal>
          <motion.div
            variants={staggerContainer}
            initial="hidden"
            animate="visible"
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8"
          >
            <SummaryCard
              icon={TrendingUp}
              label="Total Expenses"
              value={formatCurrency(totalSpent)}
              sub={`Across ${expenses.length} transactions`}
              accent="#6366F1"
            />
            <SummaryCard
              icon={BarChart2}
              label="Average Monthly"
              value={formatCurrency(avgMonthly)}
              sub="Based on active months"
              accent="#10B981"
            />
            <SummaryCard
              icon={PieIcon}
              label="Top Category"
              value={topCategory ? `${topCategory.icon} ${topCategory.name}` : "N/A"}
              sub={topCategory ? formatCurrency(topCategory.value) : "No data yet"}
              accent="#F59E0B"
            />
            <SummaryCard
              icon={Calendar}
              label="Highest Month"
              value={mostExpensiveMonth.month}
              sub={formatCurrency(mostExpensiveMonth.amount)}
              accent="#8B5CF6"
            />
          </motion.div>
        </Reveal>

        {/* ── Charts Row ── */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 mb-8">

          {/* Monthly Bar Chart — wider */}
          <Reveal className="lg:col-span-3">
            <div
              className="rounded-2xl border p-6 h-full"
              style={{
                background: "var(--card)",
                borderColor: "var(--border)",
                boxShadow: "0 1px 2px rgba(0,0,0,0.08), 0 8px 24px -8px rgba(0,0,0,0.24)",
              }}
            >
              <div className="flex items-center gap-3 mb-6">
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center"
                  style={{ background: "rgba(99,102,241,0.15)" }}
                >
                  <BarChart2 className="w-4 h-4" style={{ color: "var(--primary)" }} />
                </div>
                <div>
                  <h2 className="text-base font-semibold" style={{ color: "var(--foreground)" }}>
                    Monthly Spending
                  </h2>
                  <p className="text-xs" style={{ color: "var(--muted-foreground)" }}>
                    Last 6 months
                  </p>
                </div>
              </div>

              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={monthlyData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="var(--border)"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="month"
                    tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v: number) => `$${v}`}
                    width={52}
                  />
                  <Tooltip content={<CustomBarTooltip />} cursor={{ fill: "rgba(99,102,241,0.06)" }} />
                  <Bar
                    dataKey="amount"
                    fill="var(--primary)"
                    radius={[6, 6, 0, 0]}
                    maxBarSize={48}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Reveal>

          {/* Category Donut Chart — narrower */}
          <Reveal className="lg:col-span-2">
            <div
              className="rounded-2xl border p-6 h-full"
              style={{
                background: "var(--card)",
                borderColor: "var(--border)",
                boxShadow: "0 1px 2px rgba(0,0,0,0.08), 0 8px 24px -8px rgba(0,0,0,0.24)",
              }}
            >
              <div className="flex items-center gap-3 mb-6">
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center"
                  style={{ background: "rgba(245,158,11,0.15)" }}
                >
                  <PieIcon className="w-4 h-4" style={{ color: "var(--accent)" }} />
                </div>
                <div>
                  <h2 className="text-base font-semibold" style={{ color: "var(--foreground)" }}>
                    Category Breakdown
                  </h2>
                  <p className="text-xs" style={{ color: "var(--muted-foreground)" }}>
                    By total spend
                  </p>
                </div>
              </div>

              {categoryData.length === 0 ? (
                <div className="flex items-center justify-center h-48">
                  <p className="text-sm" style={{ color: "var(--muted-foreground)" }}>
                    No category data available.
                  </p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie
                      data={categoryData}
                      cx="50%"
                      cy="45%"
                      innerRadius={60}
                      outerRadius={95}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {categoryData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} stroke="transparent" />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomPieTooltip />} />
                    <Legend
                      formatter={(value: string) => (
                        <span style={{ color: "var(--muted-foreground)", fontSize: 12 }}>{value}</span>
                      )}
                      iconType="circle"
                      iconSize={8}
                    />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
          </Reveal>
        </div>

        {/* ── Category Detail Table ── */}
        <Reveal>
          <div
            className="rounded-2xl border overflow-hidden"
            style={{
              background: "var(--card)",
              borderColor: "var(--border)",
              boxShadow: "0 1px 2px rgba(0,0,0,0.08), 0 8px 24px -8px rgba(0,0,0,0.24)",
            }}
          >
            <div className="px-6 py-5 border-b" style={{ borderColor: "var(--border)" }}>
              <h2 className="text-base font-semibold" style={{ color: "var(--foreground)" }}>
                Spending by Category
              </h2>
              <p className="text-xs mt-0.5" style={{ color: "var(--muted-foreground)" }}>
                All-time totals across your tracked expenses
              </p>
            </div>

            <div className="divide-y" style={{ borderColor: "var(--border)" }}>
              {categoryData.length === 0 ? (
                <div className="px-6 py-10 text-center">
                  <p className="text-sm" style={{ color: "var(--muted-foreground)" }}>
                    No expenses recorded yet.
                  </p>
                </div>
              ) : (
                categoryData.map((cat, idx) => {
                  const pct = totalSpent > 0 ? (cat.value / totalSpent) * 100 : 0;
                  return (
                    <div
                      key={`cat-row-${idx}`}
                      className="px-6 py-4 flex items-center gap-4"
                    >
                      {/* Icon */}
                      <div
                        className="w-9 h-9 rounded-xl flex items-center justify-center text-lg flex-shrink-0"
                        style={{ background: cat.color + "22" }}
                      >
                        {cat.icon}
                      </div>

                      {/* Name + bar */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1.5">
                          <span
                            className="text-sm font-medium truncate"
                            style={{ color: "var(--foreground)" }}
                          >
                            {cat.name}
                          </span>
                          <span
                            className="text-sm font-semibold ml-4 flex-shrink-0"
                            style={{ color: "var(--foreground)" }}
                          >
                            {formatCurrency(cat.value)}
                          </span>
                        </div>
                        <div
                          className="h-1.5 rounded-full overflow-hidden"
                          style={{ background: "var(--border)" }}
                        >
                          <div
                            className="h-full rounded-full transition-all duration-700"
                            style={{ width: `${pct}%`, background: cat.color }}
                          />
                        </div>
                      </div>

                      {/* Percentage */}
                      <span
                        className="text-xs font-medium w-12 text-right flex-shrink-0"
                        style={{ color: "var(--muted-foreground)" }}
                      >
                        {pct.toFixed(1)}%
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </Reveal>

        {/* ── Recent Expenses ── */}
        <Reveal className="mt-6">
          <div
            className="rounded-2xl border overflow-hidden"
            style={{
              background: "var(--card)",
              borderColor: "var(--border)",
              boxShadow: "0 1px 2px rgba(0,0,0,0.08), 0 8px 24px -8px rgba(0,0,0,0.24)",
            }}
          >
            <div className="px-6 py-5 border-b" style={{ borderColor: "var(--border)" }}>
              <h2 className="text-base font-semibold" style={{ color: "var(--foreground)" }}>
                Recent Transactions
              </h2>
              <p className="text-xs mt-0.5" style={{ color: "var(--muted-foreground)" }}>
                Latest 8 expense entries
              </p>
            </div>

            <div className="divide-y" style={{ borderColor: "var(--border)" }}>
              {expenses.slice(0, 8).map((expense, idx) => {
                const cat = categories.find((c) => c.id === expense.category_id);
                const staticCat = EXPENSE_CATEGORIES.find((c) => c.name === cat?.name);
                const icon = cat?.icon ?? staticCat?.icon ?? "📦";
                const color = cat?.color ?? staticCat?.color ?? "#94A3B8";
                const catName = cat?.name ?? "Other";

                return (
                  <div
                    key={expense.id}
                    className="px-6 py-4 flex items-center gap-4"
                  >
                    <div
                      className="w-9 h-9 rounded-xl flex items-center justify-center text-lg flex-shrink-0"
                      style={{ background: color + "22" }}
                    >
                      {icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p
                        className="text-sm font-medium truncate"
                        style={{ color: "var(--foreground)" }}
                      >
                        {expense.title}
                      </p>
                      <p className="text-xs mt-0.5" style={{ color: "var(--muted-foreground)" }}>
                        {catName} &middot; {formatDate(expense.expense_date)}
                      </p>
                    </div>
                    <span
                      className="text-sm font-semibold flex-shrink-0"
                      style={{ color: "var(--foreground)" }}
                    >
                      {formatCurrency(parseFloat(expense.amount) || 0, expense.currency)}
                    </span>
                  </div>
                );
              })}

              {expenses.length === 0 && (
                <div className="px-6 py-10 text-center">
                  <p className="text-sm" style={{ color: "var(--muted-foreground)" }}>
                    No transactions recorded yet.
                  </p>
                </div>
              )}
            </div>
          </div>
        </Reveal>

        {/* Bottom padding */}
        <div className="h-12" />
      </div>
    </div>
  );
}
