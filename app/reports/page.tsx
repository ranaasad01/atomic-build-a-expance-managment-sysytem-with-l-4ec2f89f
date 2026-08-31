"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Reveal } from "@/components/Reveal";
import { createClient } from "@/lib/supabase/client";
import { EXPENSE_CATEGORIES } from "@/lib/data";
import { fadeInUp, staggerContainer } from "@/lib/motion";
import { FileText, Download, Calendar, Filter, ArrowLeft, TrendingUp, ChevronDown, ChevronUp, Search } from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Category {
  id: string;
  name: string;
  icon: string | null;
  color: string | null;
}

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
  category?: Category | null;
}

type SortField = "expense_date" | "title" | "amount" | "category";
type SortDir = "asc" | "desc";

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
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return dateStr;
  }
}

function getMonthRange(offset = 0): { start: string; end: string } {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + offset;
  const start = new Date(year, month, 1);
  const end = new Date(year, month + 1, 0);
  return {
    start: start.toISOString().split("T")[0],
    end: end.toISOString().split("T")[0],
  };
}

function getYearRange(): { start: string; end: string } {
  const now = new Date();
  return {
    start: `${now.getFullYear()}-01-01`,
    end: `${now.getFullYear()}-12-31`,
  };
}

const PAGE_SIZE = 15;

// ─── Category Badge ───────────────────────────────────────────────────────────

function CategoryBadge({ category }: { category?: Category | null }) {
  const fallback = EXPENSE_CATEGORIES[0];
  const icon = category?.icon ?? fallback.icon;
  const color = category?.color ?? "#94A3B8";
  const name = category?.name ?? "Other";
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap"
      style={{
        backgroundColor: color + "22",
        color,
        border: `1px solid ${color}44`,
      }}
    >
      <span>{icon}</span>
      {name}
    </span>
  );
}

// ─── Sort Header ──────────────────────────────────────────────────────────────

function SortHeader({
  label,
  field,
  sortField,
  sortDir,
  onSort,
}: {
  label: string;
  field: SortField;
  sortField: SortField;
  sortDir: SortDir;
  onSort: (f: SortField) => void;
}) {
  const active = sortField === field;
  return (
    <button
      onClick={() => onSort(field)}
      className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors duration-200 group"
    >
      {label}
      <span className="opacity-60 group-hover:opacity-100">
        {active ? (
          sortDir === "asc" ? (
            <ChevronUp className="w-3.5 h-3.5" />
          ) : (
            <ChevronDown className="w-3.5 h-3.5" />
          )
        ) : (
          <ChevronDown className="w-3.5 h-3.5 opacity-40" />
        )}
      </span>
    </button>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function ReportsPage() {
  const supabase = createClient();

  // Filter state
  const today = new Date().toISOString().split("T")[0];
  const thisMonth = getMonthRange(0);
  const [startDate, setStartDate] = useState(thisMonth.start);
  const [endDate, setEndDate] = useState(thisMonth.end);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [categoryDropdownOpen, setCategoryDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Data state
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generated, setGenerated] = useState(false);

  // Table state
  const [sortField, setSortField] = useState<SortField>("expense_date");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [page, setPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setCategoryDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // Fetch categories on mount
  useEffect(() => {
    async function fetchCategories() {
      const { data } = await supabase.from("categories").select("*").order("name");
      setCategories((data as Category[]) ?? []);
    }
    fetchCategories();
  }, []);

  // Generate report
  const generateReport = useCallback(async () => {
    setLoading(true);
    setError(null);
    setPage(1);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setError("You must be signed in to generate reports.");
        setLoading(false);
        return;
      }

      let query = supabase
        .from("expenses")
        .select("*, category:categories(id, name, icon, color)")
        .eq("user_id", user.id)
        .gte("expense_date", startDate)
        .lte("expense_date", endDate)
        .order("expense_date", { ascending: false });

      if (selectedCategories.length > 0) {
        query = query.in("category_id", selectedCategories);
      }

      const { data, error: fetchError } = await query;
      if (fetchError) throw fetchError;

      setExpenses((data as Expense[]) ?? []);
      setGenerated(true);
    } catch (e) {
      setError("Failed to load expense data. Please try again.");
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate, selectedCategories]);

  // Quick date selectors
  const applyQuickRange = (range: "this-month" | "last-month" | "last-3" | "this-year") => {
    if (range === "this-month") {
      const r = getMonthRange(0);
      setStartDate(r.start);
      setEndDate(r.end);
    } else if (range === "last-month") {
      const r = getMonthRange(-1);
      setStartDate(r.start);
      setEndDate(r.end);
    } else if (range === "last-3") {
      const r3 = getMonthRange(-2);
      const r0 = getMonthRange(0);
      setStartDate(r3.start);
      setEndDate(r0.end);
    } else if (range === "this-year") {
      const r = getYearRange();
      setStartDate(r.start);
      setEndDate(r.end);
    }
  };

  // Toggle category selection
  const toggleCategory = (id: string) => {
    setSelectedCategories((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
    );
  };

  // Sort handler
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir("desc");
    }
    setPage(1);
  };

  // Filtered + sorted expenses
  const filteredExpenses = expenses.filter((e) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      e.title.toLowerCase().includes(q) ||
      (e.category?.name ?? "").toLowerCase().includes(q) ||
      (e.notes ?? "").toLowerCase().includes(q)
    );
  });

  const sortedExpenses = [...filteredExpenses].sort((a, b) => {
    let cmp = 0;
    if (sortField === "expense_date") {
      cmp = a.expense_date.localeCompare(b.expense_date);
    } else if (sortField === "title") {
      cmp = a.title.localeCompare(b.title);
    } else if (sortField === "amount") {
      cmp = parseFloat(a.amount) - parseFloat(b.amount);
    } else if (sortField === "category") {
      cmp = (a.category?.name ?? "").localeCompare(b.category?.name ?? "");
    }
    return sortDir === "asc" ? cmp : -cmp;
  });

  const totalPages = Math.max(1, Math.ceil(sortedExpenses.length / PAGE_SIZE));
  const pagedExpenses = sortedExpenses.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // Summary stats
  const totalAmount = filteredExpenses.reduce((sum, e) => sum + parseFloat(e.amount ?? "0"), 0);
  const avgAmount = filteredExpenses.length > 0 ? totalAmount / filteredExpenses.length : 0;
  const topCategoryEntry = (() => {
    const map: Record<string, { name: string; icon: string; total: number }> = {};
    for (const e of filteredExpenses) {
      const key = e.category_id;
      if (!map[key]) {
        map[key] = {
          name: e.category?.name ?? "Other",
          icon: e.category?.icon ?? "📦",
          total: 0,
        };
      }
      map[key].total += parseFloat(e.amount ?? "0");
    }
    return Object.values(map).sort((a, b) => b.total - a.total)[0] ?? null;
  })();

  // Category breakdown
  const categoryBreakdown = (() => {
    const map: Record<
      string,
      { id: string; name: string; icon: string; color: string; count: number; total: number }
    > = {};
    for (const e of filteredExpenses) {
      const key = e.category_id;
      if (!map[key]) {
        map[key] = {
          id: key,
          name: e.category?.name ?? "Other",
          icon: e.category?.icon ?? "📦",
          color: e.category?.color ?? "#94A3B8",
          count: 0,
          total: 0,
        };
      }
      map[key].count += 1;
      map[key].total += parseFloat(e.amount ?? "0");
    }
    return Object.values(map).sort((a, b) => b.total - a.total);
  })();

  // CSV Export
  const exportCSV = () => {
    if (filteredExpenses.length === 0) return;
    const headers = ["Date", "Title", "Category", "Amount", "Currency", "Notes"];
    const rows = filteredExpenses.map((e) => [
      e.expense_date,
      `"${e.title.replace(/"/g, '""')}"`,
      `"${(e.category?.name ?? "Other").replace(/"/g, '""')}"`,
      parseFloat(e.amount ?? "0").toFixed(2),
      e.currency ?? "USD",
      `"${(e.notes ?? "").replace(/"/g, '""')}"`,
    ]);
    const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const dateStr = new Date().toISOString().split("T")[0];
    link.href = url;
    link.download = `expenses-report-${dateStr}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const selectedCategoryNames =
    selectedCategories.length === 0
      ? "All Categories"
      : selectedCategories.length === 1
      ? categories.find((c) => c.id === selectedCategories[0])?.name ?? "1 selected"
      : `${selectedCategories.length} categories`;

  return (
    <div
      className="min-h-screen"
      style={{ background: "var(--background)", color: "var(--foreground)" }}
    >
      {/* ── Hero ── */}
      <section className="relative mesh-bg pt-28 pb-16 px-4">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 overflow-hidden"
        >
          <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[700px] h-[400px] rounded-full bg-[var(--primary)]/10 blur-[100px]" />
        </div>

        <div className="relative max-w-5xl mx-auto">
          <Reveal>
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors duration-200 mb-8 group"
            >
              <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform duration-200" />
              Back to Dashboard
            </Link>
          </Reveal>

          <Reveal delay={0.05}>
            <div className="inline-flex items-center gap-2 rounded-full border border-[var(--primary)]/30 bg-[var(--primary)]/10 px-4 py-1.5 text-xs font-semibold text-[var(--primary)] mb-5">
              <FileText className="w-3.5 h-3.5" />
              Expense Reports
            </div>
          </Reveal>

          <Reveal delay={0.1}>
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-[var(--foreground)] mb-4 text-balance">
              Generate &amp; Export Reports
            </h1>
          </Reveal>

          <Reveal delay={0.15}>
            <p className="text-lg text-[var(--muted-foreground)] max-w-2xl leading-relaxed text-pretty">
              Select a date range and category filters to generate a detailed expense report.
              Export your data as CSV for use in spreadsheets or accounting tools.
            </p>
          </Reveal>
        </div>
      </section>

      {/* ── Filter Bar ── */}
      <section className="px-4 py-8">
        <div className="max-w-5xl mx-auto">
          <Reveal>
            <div className="glass rounded-2xl border border-[var(--border)] p-6">
              <div className="flex items-center gap-2 mb-5">
                <Filter className="w-4 h-4 text-[var(--primary)]" />
                <h2 className="text-sm font-semibold text-[var(--foreground)] uppercase tracking-wider">
                  Report Filters
                </h2>
              </div>

              {/* Quick range buttons */}
              <div className="flex flex-wrap gap-2 mb-5">
                {([
                  { label: "This Month", value: "this-month" },
                  { label: "Last Month", value: "last-month" },
                  { label: "Last 3 Months", value: "last-3" },
                  { label: "This Year", value: "this-year" },
                ] as const).map((q) => (
                  <button
                    key={q.value}
                    onClick={() => applyQuickRange(q.value)}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium border border-[var(--border)] text-[var(--muted-foreground)] hover:border-[var(--primary)]/50 hover:text-[var(--primary)] transition-all duration-200"
                  >
                    {q.label}
                  </button>
                ))}
              </div>

              {/* Date + Category row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
                {/* Start date */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium text-[var(--muted-foreground)] flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5" />
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full rounded-xl border border-[var(--border)] bg-[var(--card)]/60 px-3 py-2.5 text-sm text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/50 transition-all duration-200"
                  />
                </div>

                {/* End date */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium text-[var(--muted-foreground)] flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5" />
                    End Date
                  </label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full rounded-xl border border-[var(--border)] bg-[var(--card)]/60 px-3 py-2.5 text-sm text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/50 transition-all duration-200"
                  />
                </div>

                {/* Category multi-select */}
                <div className="flex flex-col gap-1.5 relative" ref={dropdownRef}>
                  <label className="text-xs font-medium text-[var(--muted-foreground)] flex items-center gap-1.5">
                    <Filter className="w-3.5 h-3.5" />
                    Categories
                  </label>
                  <button
                    onClick={() => setCategoryDropdownOpen((o) => !o)}
                    className="w-full rounded-xl border border-[var(--border)] bg-[var(--card)]/60 px-3 py-2.5 text-sm text-[var(--foreground)] text-left flex items-center justify-between focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/50 transition-all duration-200"
                  >
                    <span className="truncate">{selectedCategoryNames}</span>
                    <ChevronDown className="w-4 h-4 text-[var(--muted-foreground)] flex-shrink-0" />
                  </button>
                  {categoryDropdownOpen && (
                    <div className="absolute top-full left-0 right-0 mt-1 z-30 glass rounded-xl border border-[var(--border)] shadow-[0_8px_32px_rgba(0,0,0,0.4)] overflow-hidden">
                      <div className="p-1">
                        <button
                          onClick={() => setSelectedCategories([])}
                          className="w-full text-left px-3 py-2 text-xs rounded-lg hover:bg-[var(--primary)]/10 text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors duration-150"
                        >
                          All Categories
                        </button>
                        {categories.map((cat) => (
                          <button
                            key={cat.id}
                            onClick={() => toggleCategory(cat.id)}
                            className={`w-full text-left px-3 py-2 text-xs rounded-lg flex items-center gap-2 transition-colors duration-150 ${
                              selectedCategories.includes(cat.id)
                                ? "bg-[var(--primary)]/15 text-[var(--primary)]"
                                : "hover:bg-[var(--primary)]/10 text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                            }`}
                          >
                            <span>{cat.icon}</span>
                            {cat.name}
                            {selectedCategories.includes(cat.id) && (
                              <span className="ml-auto text-[var(--primary)]">✓</span>
                            )}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Search */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium text-[var(--muted-foreground)] flex items-center gap-1.5">
                    <Search className="w-3.5 h-3.5" />
                    Search
                  </label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--muted-foreground)]" />
                    <input
                      type="text"
                      placeholder="Filter results..."
                      value={searchQuery}
                      onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
                      className="w-full rounded-xl border border-[var(--border)] bg-[var(--card)]/60 pl-9 pr-3 py-2.5 text-sm text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/50 transition-all duration-200"
                    />
                  </div>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={generateReport}
                  disabled={loading}
                  className="inline-flex items-center gap-2 rounded-xl bg-[var(--primary)] px-5 py-2.5 text-sm font-semibold text-white hover:opacity-90 hover:shadow-[0_0_20px_rgba(99,102,241,0.4)] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <TrendingUp className="w-4 h-4" />
                  )}
                  {loading ? "Generating..." : "Generate Report"}
                </button>

                <button
                  onClick={exportCSV}
                  disabled={!generated || filteredExpenses.length === 0}
                  className="inline-flex items-center gap-2 rounded-xl border border-[var(--accent)]/40 bg-[var(--accent)]/10 px-5 py-2.5 text-sm font-semibold text-[var(--accent)] hover:bg-[var(--accent)]/20 hover:border-[var(--accent)]/60 transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <Download className="w-4 h-4" />
                  Export CSV
                </button>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── Error state ── */}
      {error && (
        <div className="max-w-5xl mx-auto px-4 mb-6">
          <div className="rounded-xl border border-[var(--destructive)]/30 bg-[var(--destructive)]/10 px-4 py-3 text-sm text-[var(--destructive)] flex items-center gap-2">
            <span className="text-base">⚠️</span>
            {error}
          </div>
        </div>
      )}

      {/* ── Results (only shown after generate) ── */}
      {generated && !loading && (
        <>
          {/* ── Summary Cards ── */}
          <section className="px-4 pb-8">
            <div className="max-w-5xl mx-auto">
              <motion.div
                variants={staggerContainer}
                initial="hidden"
                animate="visible"
                className="grid grid-cols-2 lg:grid-cols-4 gap-4"
              >
                {/* Total Expenses count */}
                <motion.div
                  variants={fadeInUp}
                  className="glass rounded-2xl border border-[var(--border)] p-5"
                >
                  <p className="text-xs font-medium text-[var(--muted-foreground)] uppercase tracking-wider mb-2">
                    Total Expenses
                  </p>
                  <p className="text-3xl font-bold text-[var(--foreground)]">
                    {filteredExpenses.length}
                  </p>
                  <p className="text-xs text-[var(--muted-foreground)] mt-1">entries found</p>
                </motion.div>

                {/* Total Amount */}
                <motion.div
                  variants={fadeInUp}
                  className="glass rounded-2xl border border-[var(--border)] p-5"
                >
                  <p className="text-xs font-medium text-[var(--muted-foreground)] uppercase tracking-wider mb-2">
                    Total Amount
                  </p>
                  <p className="text-3xl font-bold text-[var(--primary)]">
                    {formatCurrency(totalAmount)}
                  </p>
                  <p className="text-xs text-[var(--muted-foreground)] mt-1">in selected period</p>
                </motion.div>

                {/* Average per Expense */}
                <motion.div
                  variants={fadeInUp}
                  className="glass rounded-2xl border border-[var(--border)] p-5"
                >
                  <p className="text-xs font-medium text-[var(--muted-foreground)] uppercase tracking-wider mb-2">
                    Avg per Expense
                  </p>
                  <p className="text-3xl font-bold text-[var(--accent)]">
                    {formatCurrency(avgAmount)}
                  </p>
                  <p className="text-xs text-[var(--muted-foreground)] mt-1">per transaction</p>
                </motion.div>

                {/* Top Category */}
                <motion.div
                  variants={fadeInUp}
                  className="glass rounded-2xl border border-[var(--border)] p-5"
                >
                  <p className="text-xs font-medium text-[var(--muted-foreground)] uppercase tracking-wider mb-2">
                    Top Category
                  </p>
                  <p className="text-2xl font-bold text-[var(--foreground)] flex items-center gap-2">
                    {topCategoryEntry ? (
                      <>
                        <span>{topCategoryEntry.icon}</span>
                        <span className="truncate">{topCategoryEntry.name}</span>
                      </>
                    ) : (
                      <span className="text-[var(--muted-foreground)] text-base">None</span>
                    )}
                  </p>
                  <p className="text-xs text-[var(--muted-foreground)] mt-1">
                    {topCategoryEntry ? formatCurrency(topCategoryEntry.total) : "no data"}
                  </p>
                </motion.div>
              </motion.div>
            </div>
          </section>

          {/* ── Expense Table ── */}
          <section className="px-4 pb-8">
            <div className="max-w-5xl mx-auto">
              <Reveal>
                <div className="glass rounded-2xl border border-[var(--border)] overflow-hidden">
                  <div className="px-6 py-4 border-b border-[var(--border)] flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-[var(--primary)]" />
                      <h2 className="text-sm font-semibold text-[var(--foreground)]">Expense Details</h2>
                    </div>
                    <span className="text-xs text-[var(--muted-foreground)]">
                      {filteredExpenses.length} record{filteredExpenses.length !== 1 ? "s" : ""}
                    </span>
                  </div>

                  {filteredExpenses.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-center px-4">
                      <div className="w-14 h-14 rounded-2xl bg-[var(--primary)]/10 flex items-center justify-center text-2xl mb-4">
                        📋
                      </div>
                      <p className="text-base font-semibold text-[var(--foreground)] mb-1">
                        No expenses found for this period
                      </p>
                      <p className="text-sm text-[var(--muted-foreground)] max-w-xs">
                        Try adjusting your date range or category filters and generate the report again.
                      </p>
                    </div>
                  ) : (
                    <>
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead>
                            <tr className="border-b border-[var(--border)]">
                              <th className="px-6 py-3 text-left">
                                <SortHeader
                                  label="Date"
                                  field="expense_date"
                                  sortField={sortField}
                                  sortDir={sortDir}
                                  onSort={handleSort}
                                />
                              </th>
                              <th className="px-6 py-3 text-left">
                                <SortHeader
                                  label="Title"
                                  field="title"
                                  sortField={sortField}
                                  sortDir={sortDir}
                                  onSort={handleSort}
                                />
                              </th>
                              <th className="px-6 py-3 text-left">
                                <SortHeader
                                  label="Category"
                                  field="category"
                                  sortField={sortField}
                                  sortDir={sortDir}
                                  onSort={handleSort}
                                />
                              </th>
                              <th className="px-6 py-3 text-right">
                                <SortHeader
                                  label="Amount"
                                  field="amount"
                                  sortField={sortField}
                                  sortDir={sortDir}
                                  onSort={handleSort}
                                />
                              </th>
                              <th className="px-6 py-3 text-left hidden lg:table-cell">
                                <span className="text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
                                  Notes
                                </span>
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {pagedExpenses.map((expense, idx) => (
                              <tr
                                key={expense.id}
                                className={`border-b border-[var(--border)]/50 hover:bg-[var(--primary)]/5 transition-colors duration-150 ${
                                  idx === pagedExpenses.length - 1 ? "border-b-0" : ""
                                }`}
                              >
                                <td className="px-6 py-3.5 text-sm text-[var(--muted-foreground)] whitespace-nowrap">
                                  {formatDate(expense.expense_date)}
                                </td>
                                <td className="px-6 py-3.5">
                                  <span className="text-sm font-medium text-[var(--foreground)]">
                                    {expense.title}
                                  </span>
                                </td>
                                <td className="px-6 py-3.5">
                                  <CategoryBadge category={expense.category} />
                                </td>
                                <td className="px-6 py-3.5 text-right">
                                  <span className="text-sm font-semibold text-[var(--foreground)]">
                                    {formatCurrency(parseFloat(expense.amount ?? "0"), expense.currency)}
                                  </span>
                                </td>
                                <td className="px-6 py-3.5 hidden lg:table-cell">
                                  <span className="text-xs text-[var(--muted-foreground)] line-clamp-1">
                                    {expense.notes ?? "—"}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      {/* Pagination */}
                      {totalPages > 1 && (
                        <div className="px-6 py-4 border-t border-[var(--border)] flex items-center justify-between">
                          <span className="text-xs text-[var(--muted-foreground)]">
                            Page {page} of {totalPages} ({filteredExpenses.length} records)
                          </span>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => setPage((p) => Math.max(1, p - 1))}
                              disabled={page === 1}
                              className="px-3 py-1.5 rounded-lg border border-[var(--border)] text-xs text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:border-[var(--primary)]/40 transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                              Previous
                            </button>
                            <button
                              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                              disabled={page === totalPages}
                              className="px-3 py-1.5 rounded-lg border border-[var(--border)] text-xs text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:border-[var(--primary)]/40 transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                              Next
                            </button>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </Reveal>
            </div>
          </section>

          {/* ── Category Breakdown ── */}
          {categoryBreakdown.length > 0 && (
            <section className="px-4 pb-16">
              <div className="max-w-5xl mx-auto">
                <Reveal>
                  <div className="glass rounded-2xl border border-[var(--border)] overflow-hidden">
                    <div className="px-6 py-4 border-b border-[var(--border)] flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-[var(--accent)]" />
                      <h2 className="text-sm font-semibold text-[var(--foreground)]">Category Breakdown</h2>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-[var(--border)]">
                            <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
                              Category
                            </th>
                            <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
                              Count
                            </th>
                            <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
                              Total
                            </th>
                            <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
                              Share
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)] hidden md:table-cell">
                              Distribution
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {categoryBreakdown.map((cat, idx) => {
                            const pct =
                              totalAmount > 0
                                ? Math.round((cat.total / totalAmount) * 100)
                                : 0;
                            return (
                              <tr
                                key={cat.id}
                                className={`border-b border-[var(--border)]/50 hover:bg-[var(--primary)]/5 transition-colors duration-150 ${
                                  idx === categoryBreakdown.length - 1 ? "border-b-0" : ""
                                }`}
                              >
                                <td className="px-6 py-4">
                                  <div className="flex items-center gap-2.5">
                                    <span
                                      className="w-8 h-8 rounded-lg flex items-center justify-center text-base flex-shrink-0"
                                      style={{ backgroundColor: cat.color + "22" }}
                                    >
                                      {cat.icon}
                                    </span>
                                    <span className="text-sm font-medium text-[var(--foreground)]">
                                      {cat.name}
                                    </span>
                                  </div>
                                </td>
                                <td className="px-6 py-4 text-right">
                                  <span className="text-sm text-[var(--muted-foreground)]">
                                    {cat.count}
                                  </span>
                                </td>
                                <td className="px-6 py-4 text-right">
                                  <span className="text-sm font-semibold text-[var(--foreground)]">
                                    {formatCurrency(cat.total)}
                                  </span>
                                </td>
                                <td className="px-6 py-4 text-right">
                                  <span
                                    className="text-sm font-bold"
                                    style={{ color: cat.color }}
                                  >
                                    {pct}%
                                  </span>
                                </td>
                                <td className="px-6 py-4 hidden md:table-cell">
                                  <div className="w-32 h-1.5 rounded-full bg-[var(--border)] overflow-hidden">
                                    <div
                                      className="h-full rounded-full transition-all duration-500"
                                      style={{
                                        width: `${pct}%`,
                                        backgroundColor: cat.color,
                                      }}
                                    />
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </Reveal>
              </div>
            </section>
          )}
        </>
      )}

      {/* ── Empty / Initial state ── */}
      {!generated && !loading && (
        <section className="px-4 pb-24">
          <div className="max-w-5xl mx-auto">
            <Reveal>
              <div className="glass rounded-2xl border border-[var(--border)] flex flex-col items-center justify-center py-24 text-center px-4">
                <div className="w-16 h-16 rounded-2xl bg-[var(--primary)]/10 flex items-center justify-center text-3xl mb-5">
                  📊
                </div>
                <h3 className="text-lg font-semibold text-[var(--foreground)] mb-2">
                  Ready to generate your report
                </h3>
                <p className="text-sm text-[var(--muted-foreground)] max-w-sm">
                  Choose a date range and optional category filters above, then click{" "}
                  <span className="text-[var(--primary)] font-medium">Generate Report</span> to see
                  your expense breakdown.
                </p>
              </div>
            </Reveal>
          </div>
        </section>
      )}

      {/* ── Loading skeleton ── */}
      {loading && (
        <section className="px-4 pb-24">
          <div className="max-w-5xl mx-auto space-y-4">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="glass rounded-2xl border border-[var(--border)] h-24 animate-pulse"
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
