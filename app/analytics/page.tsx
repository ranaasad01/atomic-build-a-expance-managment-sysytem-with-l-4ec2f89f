"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  Cell,
  PieChart,
  Pie,
} from "recharts";
import { TrendingUp, BarChart2, Calendar, ArrowLeft, Flame, Award } from 'lucide-react';
import { Reveal } from "@/components/Reveal";
import { createClient } from "@/lib/supabase/client";
import { EXPENSE_CATEGORIES } from "@/lib/data";
import { fadeInUp, staggerContainer } from "@/lib/motion";

// ─── Types ────────────────────────────────────────────────────────────────────

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

interface CategoryRow {
  id: string;
  name: string;
  icon: string | null;
  color: string | null;
  created_at: string;
}

interface MonthlyData {
  month: string;
  amount: number;
  prevYear: number;
}

interface CategoryData {
  name: string;
  value: number;
  color: string;
  icon: string;
}

interface DayOfWeekData {
  day: string;
  amount: number;
  pct: number;
}

interface HeatmapCell {
  date: string;
  amount: number;
  intensity: number; // 0–4
}

interface SummaryStats {
  totalThisYear: number;
  avgMonthly: number;
  highestMonth: string;
  highestMonthAmount: number;
  topCategory: string;
  topCategoryAmount: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(amount: number): string {
  try {
    return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount ?? 0);
  } catch {
    return `$${(amount ?? 0).toFixed(2)}`;
  }
}

const MONTH_ABBR = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function buildMonthlyData(expenses: ExpenseRow[]): MonthlyData[] {
  const now = new Date();
  const currentYear = now.getFullYear();
  const prevYear = currentYear - 1;

  const currentMap: Record<number, number> = {};
  const prevMap: Record<number, number> = {};

  for (const e of expenses) {
    const d = new Date(e.expense_date + "T00:00:00");
    const yr = d.getFullYear();
    const mo = d.getMonth();
    const amt = parseFloat(e.amount) || 0;
    if (yr === currentYear) currentMap[mo] = (currentMap[mo] ?? 0) + amt;
    else if (yr === prevYear) prevMap[mo] = (prevMap[mo] ?? 0) + amt;
  }

  return MONTH_ABBR.map((month, i) => ({
    month,
    amount: Math.round((currentMap[i] ?? 0) * 100) / 100,
    prevYear: Math.round((prevMap[i] ?? 0) * 100) / 100,
  }));
}

function buildCategoryData(expenses: ExpenseRow[], categories: CategoryRow[]): CategoryData[] {
  const map: Record<string, number> = {};
  for (const e of expenses) {
    map[e.category_id] = (map[e.category_id] ?? 0) + (parseFloat(e.amount) || 0);
  }

  return categories
    .map((cat) => {
      const fallback = EXPENSE_CATEGORIES.find((c) => c.name === cat.name);
      return {
        name: cat.name,
        value: Math.round((map[cat.id] ?? 0) * 100) / 100,
        color: cat.color ?? fallback?.color ?? "#94A3B8",
        icon: cat.icon ?? fallback?.icon ?? "📦",
      };
    })
    .filter((c) => c.value > 0)
    .sort((a, b) => b.value - a.value);
}

function buildDayOfWeekData(expenses: ExpenseRow[]): DayOfWeekData[] {
  const map: Record<number, number> = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
  for (const e of expenses) {
    const d = new Date(e.expense_date + "T00:00:00");
    // getDay() returns 0=Sun..6=Sat; remap to Mon=0..Sun=6
    const raw = d.getDay();
    const idx = raw === 0 ? 6 : raw - 1;
    map[idx] = (map[idx] ?? 0) + (parseFloat(e.amount) || 0);
  }
  const max = Math.max(...Object.values(map), 1);
  return DAY_NAMES.map((day, i) => ({
    day,
    amount: Math.round((map[i] ?? 0) * 100) / 100,
    pct: Math.round(((map[i] ?? 0) / max) * 100),
  }));
}

function buildHeatmap(expenses: ExpenseRow[]): HeatmapCell[] {
  // Build a 5-week × 7-day grid ending today
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Find the most recent Sunday (end of last full week) or today
  const dayOfWeek = today.getDay(); // 0=Sun
  // We want 35 cells (5 weeks × 7 days), ending on the Saturday of this week
  const daysToSaturday = dayOfWeek === 6 ? 0 : 6 - dayOfWeek;
  const endDate = new Date(today);
  endDate.setDate(today.getDate() + daysToSaturday);

  const startDate = new Date(endDate);
  startDate.setDate(endDate.getDate() - 34);

  // Build spend map by date string
  const spendMap: Record<string, number> = {};
  for (const e of expenses) {
    const key = e.expense_date.slice(0, 10);
    spendMap[key] = (spendMap[key] ?? 0) + (parseFloat(e.amount) || 0);
  }

  const cells: HeatmapCell[] = [];
  const cursor = new Date(startDate);
  while (cursor <= endDate) {
    const key = cursor.toISOString().slice(0, 10);
    cells.push({ date: key, amount: spendMap[key] ?? 0, intensity: 0 });
    cursor.setDate(cursor.getDate() + 1);
  }

  // Compute intensity 0–4
  const max = Math.max(...cells.map((c) => c.amount), 1);
  return cells.map((c) => ({
    ...c,
    intensity: c.amount === 0 ? 0 : Math.min(4, Math.ceil((c.amount / max) * 4)),
  }));
}

function buildSummaryStats(
  expenses: ExpenseRow[],
  monthlyData: MonthlyData[],
  categoryData: CategoryData[]
): SummaryStats {
  const now = new Date();
  const currentYear = now.getFullYear();

  const yearExpenses = expenses.filter((e) => {
    const yr = new Date(e.expense_date + "T00:00:00").getFullYear();
    return yr === currentYear;
  });

  const totalThisYear = yearExpenses.reduce((s, e) => s + (parseFloat(e.amount) || 0), 0);
  const monthsWithData = monthlyData.filter((m) => m.amount > 0).length;
  const avgMonthly = monthsWithData > 0 ? totalThisYear / monthsWithData : 0;

  const highestMonthEntry = [...monthlyData].sort((a, b) => b.amount - a.amount)[0];
  const topCat = categoryData[0];

  return {
    totalThisYear,
    avgMonthly,
    highestMonth: highestMonthEntry?.month ?? "N/A",
    highestMonthAmount: highestMonthEntry?.amount ?? 0,
    topCategory: topCat?.name ?? "N/A",
    topCategoryAmount: topCat?.value ?? 0,
  };
}

// ─── Custom Tooltip ───────────────────────────────────────────────────────────

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number; name: string; color: string }>; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="glass rounded-xl p-3 border border-[var(--border)] shadow-lg">
      <p className="text-xs text-[var(--muted-foreground)] mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} className="text-sm font-semibold" style={{ color: p.color }}>
          {p.name}: {fmt(p.value)}
        </p>
      ))}
    </div>
  );
}

// ─── Heatmap intensity colors ─────────────────────────────────────────────────

const INTENSITY_COLORS = [
  "var(--border)",       // 0 — no spend
  "rgba(99,102,241,0.2)", // 1 — low
  "rgba(99,102,241,0.4)", // 2
  "rgba(99,102,241,0.65)",// 3
  "var(--primary)",       // 4 — high
];

// ─── Page ────────────────────────────────────────────────────────────────────

export default function AnalyticsPage() {
  const [expenses, setExpenses] = useState<ExpenseRow[]>([]);
  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [authed, setAuthed] = useState(true);

  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([]);
  const [categoryData, setCategoryData] = useState<CategoryData[]>([]);
  const [dayData, setDayData] = useState<DayOfWeekData[]>([]);
  const [heatmap, setHeatmap] = useState<HeatmapCell[]>([]);
  const [stats, setStats] = useState<SummaryStats>({
    totalThisYear: 0,
    avgMonthly: 0,
    highestMonth: "N/A",
    highestMonthAmount: 0,
    topCategory: "N/A",
    topCategoryAmount: 0,
  });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setAuthed(false);
        setLoading(false);
        return;
      }

      const [{ data: exps }, { data: cats }] = await Promise.all([
        supabase
          .from("expenses")
          .select("*")
          .eq("user_id", user.id)
          .order("expense_date", { ascending: true }),
        supabase.from("categories").select("*").order("name"),
      ]);

      const expList = (exps ?? []) as ExpenseRow[];
      const catList = (cats ?? []) as CategoryRow[];

      setExpenses(expList);
      setCategories(catList);

      const monthly = buildMonthlyData(expList);
      const catBreakdown = buildCategoryData(expList, catList);
      const dayBreakdown = buildDayOfWeekData(expList);
      const heatmapData = buildHeatmap(expList);
      const summaryStats = buildSummaryStats(expList, monthly, catBreakdown);

      setMonthlyData(monthly);
      setCategoryData(catBreakdown);
      setDayData(dayBreakdown);
      setHeatmap(heatmapData);
      setStats(summaryStats);
    } catch (err) {
      console.error("Analytics fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ── Loading ──────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--background)" }}>
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 rounded-full border-2 border-[var(--primary)] border-t-transparent animate-spin" />
          <p className="text-[var(--muted-foreground)] text-sm">Loading analytics...</p>
        </div>
      </div>
    );
  }

  // ── Unauthenticated ──────────────────────────────────────────────────────
  if (!authed) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--background)" }}>
        <div className="glass rounded-2xl p-10 border border-[var(--border)] text-center max-w-sm">
          <p className="text-[var(--foreground)] font-semibold text-lg mb-2">Sign in to view analytics</p>
          <p className="text-[var(--muted-foreground)] text-sm mb-6">Your spending insights are waiting.</p>
          <Link
            href="/login"
            className="inline-flex items-center gap-2 rounded-xl bg-[var(--primary)] px-5 py-2.5 text-sm font-semibold text-white transition-all duration-200 hover:opacity-90"
          >
            Sign In
          </Link>
        </div>
      </div>
    );
  }

  // ── Page ─────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen" style={{ background: "var(--background)" }}>

      {/* ── 1. HERO ─────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden mesh-bg pt-28 pb-16 px-4">
        {/* Glow orb */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-32 left-1/2 -translate-x-1/2 w-[600px] h-[400px] rounded-full"
          style={{
            background:
              "radial-gradient(ellipse at center, rgba(99,102,241,0.18) 0%, transparent 70%)",
            filter: "blur(40px)",
          }}
        />

        <div className="relative max-w-4xl mx-auto text-center">
          <motion.div
            variants={staggerContainer}
            initial="hidden"
            animate="visible"
            className="flex flex-col items-center gap-5"
          >
            <motion.div variants={fadeInUp}>
              <span className="inline-flex items-center gap-2 rounded-full border border-[var(--primary)]/40 bg-[var(--primary)]/10 px-4 py-1.5 text-xs font-semibold text-[var(--primary)] tracking-wide uppercase">
                <BarChart2 className="w-3.5 h-3.5" />
                Deep-Dive Analytics
              </span>
            </motion.div>

            <motion.h1
              variants={fadeInUp}
              className="text-4xl sm:text-5xl font-bold tracking-tight text-[var(--foreground)] text-balance"
            >
              Understand Your{" "}
              <span style={{ color: "var(--primary)" }}>Spending Patterns</span>
            </motion.h1>

            <motion.p
              variants={fadeInUp}
              className="max-w-xl text-[var(--muted-foreground)] text-base leading-relaxed text-pretty"
            >
              Turn raw expense data into actionable insights. Spot trends, compare years,
              and discover exactly where your money flows every month.
            </motion.p>

            <motion.div variants={fadeInUp}>
              <Link
                href="/dashboard"
                className="inline-flex items-center gap-2 text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors duration-200"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Dashboard
              </Link>
            </motion.div>
          </motion.div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-24 space-y-8">

        {/* ── 2. SUMMARY STATS ──────────────────────────────────────────── */}
        <Reveal>
          <motion.div
            variants={staggerContainer}
            initial="hidden"
            animate="visible"
            className="grid grid-cols-2 lg:grid-cols-4 gap-4"
          >
            {[
              {
                icon: <TrendingUp className="w-5 h-5" style={{ color: "var(--primary)" }} />,
                label: "Total This Year",
                value: fmt(stats.totalThisYear),
                bg: "rgba(99,102,241,0.1)",
              },
              {
                icon: <Calendar className="w-5 h-5" style={{ color: "var(--accent)" }} />,
                label: "Avg Monthly",
                value: fmt(stats.avgMonthly),
                bg: "rgba(245,158,11,0.1)",
              },
              {
                icon: <Flame className="w-5 h-5" style={{ color: "#EF4444" }} />,
                label: `Highest Month (${stats.highestMonth})`,
                value: fmt(stats.highestMonthAmount),
                bg: "rgba(239,68,68,0.1)",
              },
              {
                icon: <Award className="w-5 h-5" style={{ color: "#10B981" }} />,
                label: `Top Category (${stats.topCategory})`,
                value: fmt(stats.topCategoryAmount),
                bg: "rgba(16,185,129,0.1)",
              },
            ].map((card, i) => (
              <motion.div
                key={i}
                variants={fadeInUp}
                className="glass rounded-2xl p-5 border border-[var(--border)] flex flex-col gap-3"
              >
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center"
                  style={{ background: card.bg }}
                >
                  {card.icon}
                </div>
                <div>
                  <p className="text-2xl font-bold text-[var(--foreground)] tracking-tight">{card.value}</p>
                  <p className="text-xs text-[var(--muted-foreground)] mt-0.5">{card.label}</p>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </Reveal>

        {/* ── 3. MONTHLY TREND ──────────────────────────────────────────── */}
        <Reveal>
          <div className="glass rounded-2xl p-6 border border-[var(--border)]">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-9 h-9 rounded-xl bg-[var(--primary)]/10 flex items-center justify-center">
                <TrendingUp className="w-4.5 h-4.5" style={{ color: "var(--primary)" }} />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-[var(--foreground)]">Monthly Spending Trend</h2>
                <p className="text-xs text-[var(--muted-foreground)]">Last 12 months of spending activity</p>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={320}>
              <LineChart data={monthlyData} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
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
                  tickFormatter={(v: number) => `$${v >= 1000 ? `${(v / 1000).toFixed(1)}k` : v}`}
                />
                <Tooltip content={<CustomTooltip />} />
                <Line
                  type="monotone"
                  dataKey="amount"
                  name="Spending"
                  stroke="var(--primary)"
                  strokeWidth={2.5}
                  dot={{ fill: "var(--primary)", r: 4, strokeWidth: 0 }}
                  activeDot={{ r: 6, fill: "var(--primary)", strokeWidth: 0 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Reveal>

        {/* ── 4. YEAR-OVER-YEAR ─────────────────────────────────────────── */}
        <Reveal>
          <div className="glass rounded-2xl p-6 border border-[var(--border)]">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-9 h-9 rounded-xl bg-[var(--accent)]/10 flex items-center justify-center">
                <BarChart2 className="w-4.5 h-4.5" style={{ color: "var(--accent)" }} />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-[var(--foreground)]">Year-over-Year Comparison</h2>
                <p className="text-xs text-[var(--muted-foreground)]">Current year vs previous year by month</p>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={320}>
              <BarChart data={monthlyData} margin={{ top: 8, right: 16, left: 0, bottom: 0 }} barGap={4}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
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
                  tickFormatter={(v: number) => `$${v >= 1000 ? `${(v / 1000).toFixed(1)}k` : v}`}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend
                  wrapperStyle={{ color: "var(--muted-foreground)", fontSize: 12, paddingTop: 12 }}
                />
                <Bar dataKey="amount" name="This Year" fill="var(--primary)" radius={[4, 4, 0, 0]} maxBarSize={28} />
                <Bar dataKey="prevYear" name="Last Year" fill="var(--accent)" fillOpacity={0.5} radius={[4, 4, 0, 0]} maxBarSize={28} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Reveal>

        {/* ── 5. CATEGORY BREAKDOWN + TOP SPENDING DAYS ─────────────────── */}
        <Reveal>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Donut chart */}
            <div className="glass rounded-2xl p-6 border border-[var(--border)]">
              <h2 className="text-xl font-semibold text-[var(--foreground)] mb-1">Category Breakdown</h2>
              <p className="text-xs text-[var(--muted-foreground)] mb-5">Spending share by category this year</p>

              {categoryData.length === 0 ? (
                <div className="flex items-center justify-center h-48 text-[var(--muted-foreground)] text-sm">
                  No expense data yet.
                </div>
              ) : (
                <>
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Pie
                        data={categoryData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={90}
                        paddingAngle={3}
                        dataKey="value"
                      >
                        {categoryData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        content={({ active, payload }) => {
                          if (!active || !payload?.length) return null;
                          const d = payload[0]?.payload as CategoryData;
                          return (
                            <div className="glass rounded-xl p-3 border border-[var(--border)] shadow-lg">
                              <p className="text-sm font-semibold text-[var(--foreground)]">
                                {d.icon} {d.name}
                              </p>
                              <p className="text-xs text-[var(--muted-foreground)]">{fmt(d.value)}</p>
                            </div>
                          );
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>

                  {/* Legend */}
                  <div className="mt-4 space-y-2">
                    {categoryData.slice(0, 5).map((cat, i) => (
                      <div key={i} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span
                            className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                            style={{ background: cat.color }}
                          />
                          <span className="text-xs text-[var(--muted-foreground)]">
                            {cat.icon} {cat.name}
                          </span>
                        </div>
                        <span className="text-xs font-semibold text-[var(--foreground)]">{fmt(cat.value)}</span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* Top spending days */}
            <div className="glass rounded-2xl p-6 border border-[var(--border)]">
              <h2 className="text-xl font-semibold text-[var(--foreground)] mb-1">Top Spending Days</h2>
              <p className="text-xs text-[var(--muted-foreground)] mb-5">Average spend by day of week</p>

              <div className="space-y-3">
                {dayData
                  .slice()
                  .sort((a, b) => b.amount - a.amount)
                  .map((d, i) => (
                    <div key={d.day} className="flex items-center gap-3">
                      <span className="w-8 text-xs font-medium text-[var(--muted-foreground)] flex-shrink-0">
                        {d.day}
                      </span>
                      <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: "var(--border)" }}>
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${d.pct}%`,
                            background: i === 0 ? "var(--primary)" : i === 1 ? "rgba(99,102,241,0.7)" : "rgba(99,102,241,0.4)",
                          }}
                        />
                      </div>
                      <span className="w-20 text-right text-xs font-semibold text-[var(--foreground)] flex-shrink-0">
                        {fmt(d.amount)}
                      </span>
                    </div>
                  ))}
              </div>

              {/* Quick insight */}
              {dayData.length > 0 && (() => {
                const top = [...dayData].sort((a, b) => b.amount - a.amount)[0];
                return (
                  <div className="mt-6 rounded-xl bg-[var(--primary)]/10 border border-[var(--primary)]/20 p-4">
                    <p className="text-xs text-[var(--primary)] font-semibold mb-0.5">Insight</p>
                    <p className="text-sm text-[var(--foreground)]">
                      You spend the most on <strong>{top.day}s</strong> — averaging {fmt(top.amount)} per {top.day}.
                    </p>
                  </div>
                );
              })()}
            </div>
          </div>
        </Reveal>

        {/* ── 6. HEATMAP ────────────────────────────────────────────────── */}
        <Reveal>
          <div className="glass rounded-2xl p-6 border border-[var(--border)]">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-9 h-9 rounded-xl bg-[var(--accent)]/10 flex items-center justify-center">
                <Flame className="w-4.5 h-4.5" style={{ color: "var(--accent)" }} />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-[var(--foreground)]">Spending Heatmap</h2>
                <p className="text-xs text-[var(--muted-foreground)]">Last 5 weeks — darker cells mean higher spend</p>
              </div>
            </div>

            {/* Day labels */}
            <div className="grid grid-cols-7 gap-1.5 mb-1.5">
              {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
                <div key={d} className="text-center text-[10px] text-[var(--muted-foreground)] font-medium">
                  {d}
                </div>
              ))}
            </div>

            {/* Cells */}
            <div className="grid grid-cols-7 gap-1.5">
              {heatmap.map((cell, i) => (
                <div
                  key={i}
                  title={`${cell.date}: ${fmt(cell.amount)}`}
                  className="aspect-square rounded-md transition-all duration-200 hover:ring-1 hover:ring-[var(--primary)] cursor-default"
                  style={{ background: INTENSITY_COLORS[cell.intensity] }}
                />
              ))}
            </div>

            {/* Legend */}
            <div className="mt-4 flex items-center gap-2 justify-end">
              <span className="text-[10px] text-[var(--muted-foreground)]">Less</span>
              {INTENSITY_COLORS.map((color, i) => (
                <div
                  key={i}
                  className="w-4 h-4 rounded-sm"
                  style={{ background: color }}
                />
              ))}
              <span className="text-[10px] text-[var(--muted-foreground)]">More</span>
            </div>
          </div>
        </Reveal>

        {/* ── Bottom CTA ────────────────────────────────────────────────── */}
        <Reveal>
          <div className="flex flex-wrap items-center justify-center gap-4 pt-4">
            <Link
              href="/expenses"
              className="inline-flex items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--card)] px-5 py-2.5 text-sm font-medium text-[var(--foreground)] transition-all duration-200 hover:border-[var(--primary)]/50 hover:bg-[var(--primary)]/5"
            >
              View All Expenses
            </Link>
            <Link
              href="/reports"
              className="inline-flex items-center gap-2 rounded-xl bg-[var(--primary)] px-5 py-2.5 text-sm font-semibold text-white transition-all duration-200 hover:opacity-90 shadow-[0_0_16px_rgba(99,102,241,0.3)]"
            >
              Generate Report
            </Link>
          </div>
        </Reveal>
      </div>
    </div>
  );
}
