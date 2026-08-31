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
type formatCurrency = any;
const formatCurrency: any = [];
type formatDate = any;
const formatDate: any = [];
import { createClient } from "@/lib/supabase/client";

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
  const daysInMonth = new Date(year, month + 1, 0).getDate();

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
    weeks[weekIdx].amount += parseFloat(e.amount);
  });

  return weeks;
}

function buildDonutData(expenses: ExpenseRow[], categories: CategoryRow[]) {
  const totals: Record<string, number> = {};
  expenses.forEach((e) => {
    totals[e.category_id] = (totals[e.category_id] ?? 0) + parseFloat(e.amount);
  });
  return categories
    .filter((c) => (totals[c.id] ?? 0) > 0)
    .map((c) => ({
      name: c.name,
      value: totals[c.id] ?? 0,
      color: c.color ?? "#94A3B8",
    }));
}

function getTopCategory(expenses: ExpenseRow[], categories: CategoryRow[]) {
  const totals: Record<string, number> = {};
  expenses.forEach((e) => {
    totals[e.category_id] = (totals[e.category_id] ?? 0) + parseFloat(e.amount);
  });
  let topId = "";
  let topAmt = 0;
  Object.entries(totals).forEach(([id, amt]) => {
    if (amt > topAmt) {
      topAmt = amt;
      topId = id;
    }
  });
  const cat = categories.find((c) => c.id === topId);
  return cat ? { name: cat.name, icon: cat.icon ?? "📦", amount: topAmt } : null;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SummaryCard({
  icon,
  label,
  value,
  sub,
  trend,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub: string;
  trend?: "up" | "down" | "neutral";
  accent?: string;
}) {
  return (
    <motion.div
      whileHover={{ y: -3, boxShadow: "0 8px 32px -8px rgba(0,0,0,0.18)" }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm p-5 flex flex-col gap-3 shadow-[0_1px_2px_rgba(0,0,0,0.08),0_4px_16px_-4px_rgba(0,0,0,0.14)]"
    >
      <div className="flex items-center justify-between">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center"
          style={{ background: accent ? `${accent}22` : "rgba(99,102,241,0.15)" }}
        >
          <span style={{ color: accent ?? "#6366F1" }}>{icon}</span>
        </div>
        {trend === "up" && (
          <span className="flex items-center gap-1 text-xs font-medium text-emerald-400">
            <TrendingUp size={13} /> Up
          </span>
        )}
        {trend === "down" && (
          <span className="flex items-center gap-1 text-xs font-medium text-rose-400">
            <TrendingDown size={13} /> Down
          </span>
        )}
      </div>
      <div>
        <p className="text-xs text-white/50 uppercase tracking-widest font-medium">{label}</p>
        <p className="text-2xl font-bold text-white mt-0.5 tracking-tight">{value}</p>
        <p className="text-xs text-white/40 mt-1">{sub}</p>
      </div>
    </motion.div>
  );
}

function CategoryBadge({ name, icon, color }: { name: string; icon: string | null; color: string | null }) {
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium"
      style={{
        background: color ? `${color}22` : "rgba(148,163,184,0.15)",
        color: color ?? "#94A3B8",
      }}
    >
      {icon && <span>{icon}</span>}
      {name}
    </span>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const [expenses, setExpenses] = useState<ExpenseRow[]>([]);
  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [budgets, setBudgets] = useState<BudgetRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [usingMock, setUsingMock] = useState(false);

  const loadData = useCallback(async () => {
    const supabase = createClient();

    const [{ data: cats, error: catErr }, { data: exps, error: expErr }, { data: buds, error: budErr }] =
      await Promise.all([
        supabase.from("categories").select("*"),
        supabase.from("expenses").select("*").order("expense_date", { ascending: false }),
        supabase.from("budgets").select("*"),
      ]);

    if (catErr || expErr || budErr || !cats || !exps || !buds) {
      setCategories(MOCK_CATEGORIES);
      setExpenses(MOCK_EXPENSES);
      setBudgets(MOCK_BUDGETS);
      setUsingMock(true);
    } else {
      setCategories(cats.length > 0 ? cats : MOCK_CATEGORIES);
      setExpenses(exps.length > 0 ? exps : MOCK_EXPENSES);
      setBudgets(buds.length > 0 ? buds : MOCK_BUDGETS);
      setUsingMock(cats.length === 0 && exps.length === 0);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();

    const supabase = createClient();
    const channel = supabase
      .channel("expenses-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "expenses" },
        () => { loadData(); }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [loadData]);

  // ── Derived stats ────────────────────────────────────────────────────────────

  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  const monthlyExpenses = expenses.filter((e) => {
    const d = new Date(e.expense_date + "T00:00:00");
    return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
  });

  const totalSpent = monthlyExpenses.reduce((s, e) => s + parseFloat(e.amount), 0);
  const totalBudget = budgets.reduce((s, b) => s + parseFloat(b.monthly_limit), 0);
  const remaining = totalBudget - totalSpent;
  const topCat = getTopCategory(monthlyExpenses, categories);

  const barData = buildBarData(expenses);
  const donutData = buildDonutData(monthlyExpenses, categories);
  const recentExpenses = [...expenses].slice(0, 5);

  const catMap = Object.fromEntries(categories.map((c) => [c.id, c]));

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <main className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      {/* Page header */}
      <Reveal>
        <div className="border-b border-white/8 bg-white/3 backdrop-blur-sm px-6 py-6 md:px-10">
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-4 flex-wrap">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-white">
                Dashboard
              </h1>
              <p className="text-sm text-white/50 mt-0.5">
                {now.toLocaleDateString("en-US", { month: "long", year: "numeric" })} overview
              </p>
            </div>
            {usingMock && (
              <span className="rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-400 text-xs px-3 py-1 font-medium">
                Demo data — add your first expense to get started
              </span>
            )}
            {loading && (
              <span className="rounded-full bg-white/10 text-white/50 text-xs px-3 py-1 font-medium animate-pulse">
                Loading...
              </span>
            )}
          </div>
        </div>
      </Reveal>

      <div className="max-w-7xl mx-auto px-6 md:px-10 py-8 space-y-8">

        {/* Summary cards */}
        <Reveal>
          <motion.div
            variants={staggerContainer}
            initial="hidden"
            animate="visible"
            className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4"
          >
            <motion.div variants={fadeInUp}>
              <SummaryCard
                icon={<DollarSign size={18} />}
                label="Total Spent"
                value={formatCurrency(totalSpent)}
                sub="This month"
                trend={totalSpent > totalBudget * 0.8 ? "up" : "neutral"}
                accent="#6366F1"
              />
            </motion.div>
            <motion.div variants={fadeInUp}>
              <SummaryCard
                icon={<Target size={18} />}
                label="Monthly Budget"
                value={formatCurrency(totalBudget)}
                sub={`${budgets.length} categor${budgets.length === 1 ? "y" : "ies"} set`}
                accent="#10B981"
              />
            </motion.div>
            <motion.div variants={fadeInUp}>
              <SummaryCard
                icon={<Wallet size={18} />}
                label="Remaining"
                value={formatCurrency(Math.max(remaining, 0))}
                sub={remaining < 0 ? "Over budget" : "Available to spend"}
                trend={remaining < 0 ? "down" : "neutral"}
                accent={remaining < 0 ? "#F43F5E" : "#10B981"}
              />
            </motion.div>
            <motion.div variants={fadeInUp}>
              <SummaryCard
                icon={<Star size={18} />}
                label="Top Category"
                value={topCat ? topCat.icon + " " + topCat.name : "None yet"}
                sub={topCat ? formatCurrency(topCat.amount) + " spent" : "No expenses this month"}
                accent="#F59E0B"
              />
            </motion.div>
          </motion.div>
        </Reveal>

        {/* Bar chart — full width */}
        <Reveal>
          <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm p-6 shadow-[0_1px_2px_rgba(0,0,0,0.08),0_4px_16px_-4px_rgba(0,0,0,0.14)]">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-base font-semibold text-white">Monthly Spending</h2>
                <p className="text-xs text-white/40 mt-0.5">Expenses by week this month</p>
              </div>
              <Link
                href="/expenses"
                className="text-xs text-[var(--accent)] hover:underline flex items-center gap-1 transition-colors"
              >
                View all <ArrowRight size={12} />
              </Link>
            </div>
            {loading ? (
              <div className="h-52 flex items-center justify-center text-white/30 text-sm animate-pulse">
                Loading chart...
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={barData} barSize={36} margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
                  <XAxis
                    dataKey="label"
                    tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 12 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 12 }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v) => `$${v}`}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "#1E1E2E",
                      border: "1px solid rgba(255,255,255,0.1)",
                      borderRadius: "12px",
                      color: "#fff",
                      fontSize: 13,
                    }}
                    formatter={(value: number) => [formatCurrency(value), "Spent"]}
                    cursor={{ fill: "rgba(255,255,255,0.04)" }}
                  />
                  <Bar dataKey="amount" radius={[8, 8, 0, 0]} fill="var(--accent)" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </Reveal>

        {/* Donut + Recent expenses side by side */}
        <Reveal>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

            {/* Donut chart */}
            <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm p-6 shadow-[0_1px_2px_rgba(0,0,0,0.08),0_4px_16px_-4px_rgba(0,0,0,0.14)]">
              <h2 className="text-base font-semibold text-white mb-1">Spending by Category</h2>
              <p className="text-xs text-white/40 mb-4">This month's breakdown</p>
              {loading ? (
                <div className="h-52 flex items-center justify-center text-white/30 text-sm animate-pulse">
                  Loading...
                </div>
              ) : donutData.length === 0 ? (
                <div className="h-52 flex flex-col items-center justify-center gap-2 text-white/30">
                  <span className="text-3xl">📊</span>
                  <span className="text-sm">No expenses this month</span>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie
                      data={donutData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={90}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {donutData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        background: "#1E1E2E",
                        border: "1px solid rgba(255,255,255,0.1)",
                        borderRadius: "12px",
                        color: "#fff",
                        fontSize: 13,
                      }}
                      formatter={(value: number) => [formatCurrency(value), "Spent"]}
                    />
                    <Legend
                      iconType="circle"
                      iconSize={8}
                      formatter={(value) => (
                        <span style={{ color: "rgba(255,255,255,0.6)", fontSize: 12 }}>{value}</span>
                      )}
                    />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Recent expenses */}
            <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm p-6 shadow-[0_1px_2px_rgba(0,0,0,0.08),0_4px_16px_-4px_rgba(0,0,0,0.14)]">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-base font-semibold text-white">Recent Expenses</h2>
                  <p className="text-xs text-white/40 mt-0.5">Last 5 transactions</p>
                </div>
                <Link
                  href="/expenses"
                  className="text-xs text-[var(--accent)] hover:underline flex items-center gap-1 transition-colors"
                >
                  See all <ArrowRight size={12} />
                </Link>
              </div>

              {loading ? (
                <div className="space-y-3">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="h-12 rounded-xl bg-white/5 animate-pulse" />
                  ))}
                </div>
              ) : recentExpenses.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-40 gap-2 text-white/30">
                  <span className="text-3xl">🧾</span>
                  <span className="text-sm">No expenses yet</span>
                </div>
              ) : (
                <motion.ul
                  variants={staggerContainer}
                  initial="hidden"
                  animate="visible"
                  className="space-y-2"
                >
                  {recentExpenses.map((exp) => {
                    const cat = catMap[exp.category_id];
                    return (
                      <motion.li
                        key={exp.id}
                        variants={fadeInUp}
                        className="flex items-center justify-between gap-3 rounded-xl px-4 py-3 bg-white/4 hover:bg-white/8 transition-colors border border-white/5"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <span className="text-xl shrink-0">{cat?.icon ?? "📦"}</span>
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-white truncate">{exp.title}</p>
                            <div className="flex items-center gap-2 mt-0.5">
                              {cat && (
                                <CategoryBadge
                                  name={cat.name}
                                  icon={null}
                                  color={cat.color}
                                />
                              )}
                              <span className="text-xs text-white/30">{formatDate(exp.expense_date)}</span>
                            </div>
                          </div>
                        </div>
                        <span className="text-sm font-semibold text-white shrink-0">
                          {formatCurrency(exp.amount, exp.currency)}
                        </span>
                      </motion.li>
                    );
                  })}
                </motion.ul>
              )}
            </div>
          </div>
        </Reveal>

        {/* Quick actions */}
        <Reveal>
          <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-[var(--accent)]/10 to-transparent backdrop-blur-sm p-6 shadow-[0_1px_2px_rgba(0,0,0,0.08),0_4px_16px_-4px_rgba(0,0,0,0.14)]">
            <h2 className="text-base font-semibold text-white mb-1">Quick Actions</h2>
            <p className="text-xs text-white/40 mb-5">Jump to the most common tasks</p>
            <div className="flex flex-wrap gap-3">
              <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                <Link
                  href="/expenses"
                  className="inline-flex items-center gap-2 rounded-xl bg-[var(--accent)] text-black font-semibold text-sm px-5 py-2.5 shadow-[0_2px_12px_rgba(99,102,241,0.35)] hover:opacity-90 transition-opacity"
                >
                  <Plus size={16} /> Add Expense
                </Link>
              </motion.div>
              <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                <Link
                  href="/expenses"
                  className="inline-flex items-center gap-2 rounded-xl bg-white/10 text-white font-medium text-sm px-5 py-2.5 border border-white/10 hover:bg-white/15 transition-colors"
                >
                  <List size={16} /> View All Expenses
                </Link>
              </motion.div>
              <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                <Link
                  href="/budget"
                  className="inline-flex items-center gap-2 rounded-xl bg-white/10 text-white font-medium text-sm px-5 py-2.5 border border-white/10 hover:bg-white/15 transition-colors"
                >
                  <Settings size={16} /> Set Budget
                </Link>
              </motion.div>
            </div>
          </div>
        </Reveal>

      </div>
    </main>
  );
}