"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Reveal } from "@/components/Reveal";
import { fadeInUp, staggerContainer } from "@/lib/motion";
import { EXPENSE_CATEGORIES } from "@/lib/data";
import { createClient } from "@/lib/supabase/client";
import { BarChart2, Download, Calendar, Filter } from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatCurrency(amount: number, currency = "USD"): string {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
    }).format(amount ?? 0);
  } catch {
    return `$${(amount ?? 0).toFixed(2)}`;
  }
}

function formatDate(dateStr: string): string {
  try {
    const d = new Date(dateStr + "T00:00:00");
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface ExpenseRow {
  id: string;
  title: string;
  amount: string | number;
  currency: string;
  category_id: string;
  expense_date: string;
}

interface CategoryRow {
  id: string;
  name: string;
  icon: string | null;
  color: string | null;
}

interface ChartDataPoint {
  category: string;
  amount: number;
  color: string;
  icon: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const CURRENT_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: 5 }, (_, i) => CURRENT_YEAR - i);

// ─── Custom Tooltip ───────────────────────────────────────────────────────────

function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ value: number; payload: ChartDataPoint }>;
  label?: string;
}) {
  if (!active || !payload || payload.length === 0) return null;
  const item = payload[0];
  return (
    <div className="glass rounded-xl border border-[var(--border)] px-4 py-3 shadow-xl">
      <p className="text-xs text-[var(--muted-foreground)] mb-1">{label}</p>
      <p className="text-sm font-semibold text-[var(--foreground)]">
        {formatCurrency(item.value)}
      </p>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ReportsPage() {
  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth());
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());

  const [expenses, setExpenses] = useState<ExpenseRow[]>([]);
  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ── Fetch categories once ────────────────────────────────────────────────
  useEffect(() => {
    async function fetchCategories() {
      const supabase = createClient();
      const { data, error: catErr } = await supabase
        .from("categories")
        .select("id, name, icon, color")
        .order("name");

      if (!catErr && data && data.length > 0) {
        setCategories(data as CategoryRow[]);
      } else {
        // Fallback to static categories
        setCategories(
          EXPENSE_CATEGORIES.map((c, i) => ({
            id: `static-${i}`,
            name: c.name,
            icon: c.icon,
            color: c.color,
          }))
        );
      }
    }
    fetchCategories();
  }, []);

  // ── Fetch expenses for selected month/year ───────────────────────────────
  useEffect(() => {
    async function fetchExpenses() {
      setLoading(true);
      setError(null);

      try {
        const supabase = createClient();
        const { data: userData } = await supabase.auth.getUser();
        if (!userData.user) {
          setError("Please log in to view reports.");
          setLoading(false);
          return;
        }

        const startDate = `${selectedYear}-${String(selectedMonth + 1).padStart(2, "0")}-01`;
        const lastDay = new Date(selectedYear, selectedMonth + 1, 0).getDate();
        const endDate = `${selectedYear}-${String(selectedMonth + 1).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;

        const { data, error: expErr } = await supabase
          .from("expenses")
          .select("id, title, amount, currency, category_id, expense_date")
          .eq("user_id", userData.user.id)
          .gte("expense_date", startDate)
          .lte("expense_date", endDate)
          .order("expense_date", { ascending: false });

        if (expErr) {
          setError(expErr.message);
        } else {
          setExpenses((data as ExpenseRow[]) ?? []);
        }
      } catch (err) {
        setError("Failed to load expenses.");
      } finally {
        setLoading(false);
      }
    }

    fetchExpenses();
  }, [selectedMonth, selectedYear]);

  // ── Derived stats ────────────────────────────────────────────────────────
  const totalSpent = expenses.reduce(
    (sum, e) => sum + parseFloat(String(e.amount) || "0"),
    0
  );
  const txCount = expenses.length;
  const avgPerTx = txCount > 0 ? totalSpent / txCount : 0;

  // ── Category chart data ──────────────────────────────────────────────────
  const chartData: ChartDataPoint[] = EXPENSE_CATEGORIES.map((cat, i) => {
    const matchedCat = categories.find((c) => c.name === cat.name);
    const catId = matchedCat?.id ?? `static-${i}`;
    const total = expenses
      .filter((e) => e.category_id === catId)
      .reduce((sum, e) => sum + parseFloat(String(e.amount) || "0"), 0);
    return {
      category: cat.name,
      amount: total,
      color: cat.color,
      icon: cat.icon,
    };
  }).filter((d) => d.amount > 0);

  // ── Category lookup map ──────────────────────────────────────────────────
  const categoryMap = new Map<string, CategoryRow>();
  categories.forEach((c) => categoryMap.set(c.id, c));

  // ── Export CSV ───────────────────────────────────────────────────────────
  function handleExportCSV() {
    const header = "Date,Title,Category,Amount,Currency";
    const rows = expenses.map((e) => {
      const cat = categoryMap.get(e.category_id);
      return [
        e.expense_date,
        `"${e.title.replace(/"/g, '""')}"`,
        cat?.name ?? "Other",
        parseFloat(String(e.amount)).toFixed(2),
        e.currency,
      ].join(",");
    });
    const csv = [header, ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `expenses-${MONTHS[selectedMonth]}-${selectedYear}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div
      className="min-h-screen mesh-bg"
      style={{ background: "var(--background)" }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 pt-24">
        {/* ── Page Header ── */}
        <Reveal>
          <motion.div
            variants={staggerContainer}
            initial="hidden"
            animate="visible"
            className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8"
          >
            <motion.div variants={fadeInUp}>
              <div className="flex items-center gap-3 mb-1">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center"
                  style={{
                    background: "rgba(99,102,241,0.15)",
                    border: "1px solid rgba(99,102,241,0.3)",
                  }}
                >
                  <BarChart2
                    className="w-5 h-5"
                    style={{ color: "var(--primary)" }}
                  />
                </div>
                <h1
                  className="text-2xl sm:text-3xl font-bold tracking-tight"
                  style={{ color: "var(--foreground)" }}
                >
                  Reports
                </h1>
              </div>
              <p
                className="text-sm ml-13"
                style={{ color: "var(--muted-foreground)", marginLeft: "52px" }}
              >
                Spending breakdown for {MONTHS[selectedMonth]} {selectedYear}
              </p>
            </motion.div>

            <motion.button
              variants={fadeInUp}
              onClick={handleExportCSV}
              disabled={expenses.length === 0}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
              style={{
                background: "rgba(245,158,11,0.15)",
                border: "1px solid rgba(245,158,11,0.3)",
                color: "var(--accent)",
              }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Download className="w-4 h-4" />
              Export CSV
            </motion.button>
          </motion.div>
        </Reveal>

        {/* ── Date Range Selector ── */}
        <Reveal delay={0.05}>
          <div
            className="glass rounded-2xl p-5 mb-6 flex flex-wrap items-center gap-4"
            style={{ border: "1px solid var(--border)" }}
          >
            <div className="flex items-center gap-2">
              <Calendar
                className="w-4 h-4"
                style={{ color: "var(--muted-foreground)" }}
              />
              <span
                className="text-sm font-medium"
                style={{ color: "var(--foreground)" }}
              >
                Period
              </span>
            </div>

            <div className="flex items-center gap-3 flex-wrap">
              {/* Month selector */}
              <div className="relative">
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(Number(e.target.value))}
                  className="appearance-none pl-3 pr-8 py-2 rounded-xl text-sm font-medium cursor-pointer transition-colors duration-200 focus:outline-none focus:ring-2"
                  style={{
                    background: "var(--card)",
                    border: "1px solid var(--border)",
                    color: "var(--foreground)",
                  }}
                >
                  {MONTHS.map((m, i) => (
                    <option key={m} value={i}>
                      {m}
                    </option>
                  ))}
                </select>
                <Filter
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 pointer-events-none"
                  style={{ color: "var(--muted-foreground)" }}
                />
              </div>

              {/* Year selector */}
              <div className="relative">
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(Number(e.target.value))}
                  className="appearance-none pl-3 pr-8 py-2 rounded-xl text-sm font-medium cursor-pointer transition-colors duration-200 focus:outline-none focus:ring-2"
                  style={{
                    background: "var(--card)",
                    border: "1px solid var(--border)",
                    color: "var(--foreground)",
                  }}
                >
                  {YEARS.map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
                <Filter
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 pointer-events-none"
                  style={{ color: "var(--muted-foreground)" }}
                />
              </div>
            </div>
          </div>
        </Reveal>

        {/* ── Error State ── */}
        {error && (
          <Reveal>
            <div
              className="rounded-xl px-5 py-4 mb-6 text-sm"
              style={{
                background: "rgba(220,38,38,0.1)",
                border: "1px solid rgba(220,38,38,0.3)",
                color: "#FCA5A5",
              }}
            >
              {error}
            </div>
          </Reveal>
        )}

        {/* ── Summary Cards ── */}
        <Reveal delay={0.08}>
          <motion.div
            variants={staggerContainer}
            initial="hidden"
            animate="visible"
            className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8"
          >
            {/* Total Spent */}
            <motion.div
              variants={fadeInUp}
              className="glass rounded-2xl p-5"
              style={{ border: "1px solid var(--border)" }}
            >
              <p
                className="text-xs font-medium uppercase tracking-wider mb-2"
                style={{ color: "var(--muted-foreground)" }}
              >
                Total Spent
              </p>
              {loading ? (
                <div
                  className="h-8 w-32 rounded-lg animate-pulse"
                  style={{ background: "var(--border)" }}
                />
              ) : (
                <p
                  className="text-2xl font-bold tracking-tight"
                  style={{ color: "var(--foreground)" }}
                >
                  {formatCurrency(totalSpent)}
                </p>
              )}
              <p
                className="text-xs mt-1"
                style={{ color: "var(--muted-foreground)" }}
              >
                {MONTHS[selectedMonth]} {selectedYear}
              </p>
            </motion.div>

            {/* Transactions */}
            <motion.div
              variants={fadeInUp}
              className="glass rounded-2xl p-5"
              style={{ border: "1px solid var(--border)" }}
            >
              <p
                className="text-xs font-medium uppercase tracking-wider mb-2"
                style={{ color: "var(--muted-foreground)" }}
              >
                Transactions
              </p>
              {loading ? (
                <div
                  className="h-8 w-16 rounded-lg animate-pulse"
                  style={{ background: "var(--border)" }}
                />
              ) : (
                <p
                  className="text-2xl font-bold tracking-tight"
                  style={{ color: "var(--foreground)" }}
                >
                  {txCount}
                </p>
              )}
              <p
                className="text-xs mt-1"
                style={{ color: "var(--muted-foreground)" }}
              >
                expense entries
              </p>
            </motion.div>

            {/* Average */}
            <motion.div
              variants={fadeInUp}
              className="glass rounded-2xl p-5"
              style={{ border: "1px solid var(--border)" }}
            >
              <p
                className="text-xs font-medium uppercase tracking-wider mb-2"
                style={{ color: "var(--muted-foreground)" }}
              >
                Avg per Transaction
              </p>
              {loading ? (
                <div
                  className="h-8 w-28 rounded-lg animate-pulse"
                  style={{ background: "var(--border)" }}
                />
              ) : (
                <p
                  className="text-2xl font-bold tracking-tight"
                  style={{ color: "var(--foreground)" }}
                >
                  {formatCurrency(avgPerTx)}
                </p>
              )}
              <p
                className="text-xs mt-1"
                style={{ color: "var(--muted-foreground)" }}
              >
                per entry
              </p>
            </motion.div>
          </motion.div>
        </Reveal>

        {/* ── Bar Chart ── */}
        <Reveal delay={0.12}>
          <div
            className="glass rounded-2xl p-6 mb-8"
            style={{ border: "1px solid var(--border)" }}
          >
            <div className="flex items-center gap-2 mb-6">
              <BarChart2
                className="w-4 h-4"
                style={{ color: "var(--primary)" }}
              />
              <h2
                className="text-base font-semibold"
                style={{ color: "var(--foreground)" }}
              >
                Spending by Category
              </h2>
            </div>

            {loading ? (
              <div
                className="h-64 rounded-xl animate-pulse"
                style={{ background: "var(--border)" }}
              />
            ) : chartData.length === 0 ? (
              <div className="h-64 flex flex-col items-center justify-center gap-3">
                <span className="text-4xl">📊</span>
                <p
                  className="text-sm"
                  style={{ color: "var(--muted-foreground)" }}
                >
                  No spending data for this period
                </p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart
                  data={chartData}
                  margin={{ top: 4, right: 8, left: 0, bottom: 4 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="var(--border)"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="category"
                    tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                    interval={0}
                    angle={-20}
                    textAnchor="end"
                    height={48}
                  />
                  <YAxis
                    tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v: number) => `$${v}`}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar
                    dataKey="amount"
                    radius={[6, 6, 0, 0]}
                    fill="var(--primary)"
                  >
                    {chartData.map((entry, index) => (
                      <rect
                        key={`bar-${index}`}
                        fill={entry.color}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </Reveal>

        {/* ── Expense Table ── */}
        <Reveal delay={0.16}>
          <div
            className="glass rounded-2xl overflow-hidden"
            style={{ border: "1px solid var(--border)" }}
          >
            <div
              className="px-6 py-4 border-b"
              style={{ borderColor: "var(--border)" }}
            >
              <h2
                className="text-base font-semibold"
                style={{ color: "var(--foreground)" }}
              >
                Expense Entries
              </h2>
              <p
                className="text-xs mt-0.5"
                style={{ color: "var(--muted-foreground)" }}
              >
                {txCount} transaction{txCount !== 1 ? "s" : ""} in{" "}
                {MONTHS[selectedMonth]} {selectedYear}
              </p>
            </div>

            {loading ? (
              <div className="p-6 space-y-3">
                {[1, 2, 3, 4].map((i) => (
                  <div
                    key={i}
                    className="h-12 rounded-xl animate-pulse"
                    style={{ background: "var(--border)" }}
                  />
                ))}
              </div>
            ) : expenses.length === 0 ? (
              <div className="py-20 flex flex-col items-center justify-center gap-3">
                <span className="text-4xl">💸</span>
                <p
                  className="text-sm font-medium"
                  style={{ color: "var(--foreground)" }}
                >
                  No expenses this period
                </p>
                <p
                  className="text-xs"
                  style={{ color: "var(--muted-foreground)" }}
                >
                  Try selecting a different month or year.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr
                      style={{
                        borderBottom: "1px solid var(--border)",
                        background: "rgba(255,255,255,0.02)",
                      }}
                    >
                      {["Date", "Title", "Category", "Amount"].map((h) => (
                        <th
                          key={h}
                          className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider"
                          style={{ color: "var(--muted-foreground)" }}
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {expenses.map((expense, idx) => {
                      const cat = categoryMap.get(expense.category_id);
                      const staticCat = EXPENSE_CATEGORIES.find(
                        (c) => c.name === cat?.name
                      );
                      const color =
                        cat?.color ?? staticCat?.color ?? "#94A3B8";
                      const icon = cat?.icon ?? staticCat?.icon ?? "📦";
                      const catName = cat?.name ?? "Other";

                      return (
                        <motion.tr
                          key={expense.id}
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: idx * 0.03, duration: 0.3 }}
                          className="transition-colors duration-150"
                          style={{
                            borderBottom:
                              idx < expenses.length - 1
                                ? "1px solid var(--border)"
                                : "none",
                          }}
                          onMouseEnter={(e) => {
                            (e.currentTarget as HTMLTableRowElement).style.background =
                              "rgba(255,255,255,0.03)";
                          }}
                          onMouseLeave={(e) => {
                            (e.currentTarget as HTMLTableRowElement).style.background =
                              "transparent";
                          }}
                        >
                          <td
                            className="px-6 py-4 text-sm whitespace-nowrap"
                            style={{ color: "var(--muted-foreground)" }}
                          >
                            {formatDate(expense.expense_date)}
                          </td>
                          <td
                            className="px-6 py-4 text-sm font-medium"
                            style={{ color: "var(--foreground)" }}
                          >
                            {expense.title}
                          </td>
                          <td className="px-6 py-4">
                            <span
                              className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium"
                              style={{
                                background: color + "22",
                                color: color,
                                border: `1px solid ${color}44`,
                              }}
                            >
                              <span>{icon}</span>
                              {catName}
                            </span>
                          </td>
                          <td
                            className="px-6 py-4 text-sm font-semibold text-right"
                            style={{ color: "var(--accent)" }}
                          >
                            {formatCurrency(
                              parseFloat(String(expense.amount) || "0"),
                              expense.currency
                            )}
                          </td>
                        </motion.tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </Reveal>
      </div>
    </div>
  );
}
