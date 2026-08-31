"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence, type Variants } from "framer-motion";
import { Search, ChevronDown, ChevronUp, Edit, Trash2, X, AlertCircle, ChevronRight, ArrowLeft, Plus, Filter, Calendar } from 'lucide-react';
import Link from "next/link";
import { Reveal } from "@/components/Reveal";
import { createClient } from "@/lib/supabase/client";
import { EXPENSE_CATEGORIES } from "@/lib/data";
import { fadeInUp, staggerContainer, scaleIn } from "@/lib/motion";

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

interface Category {
  id: string;
  name: string;
  icon: string | null;
  color: string | null;
  created_at: string;
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
}

type SortField = "title" | "amount" | "expense_date" | "category";
type SortDir = "asc" | "desc";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function cn(...classes: (string | undefined | false | null)[]): string {
  return classes.filter(Boolean).join(" ");
}

const PAGE_SIZE = 10;

const modalVariants: Variants = {
  hidden: { opacity: 0, scale: 0.94, y: 12 },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { duration: 0.22, ease: "easeOut" },
  },
  exit: {
    opacity: 0,
    scale: 0.94,
    y: 12,
    transition: { duration: 0.18, ease: "easeIn" },
  },
};

const overlayVariants: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.2 } },
  exit: { opacity: 0, transition: { duration: 0.18 } },
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function CategoryBadge({
  category,
}: {
  category: Category | undefined;
}) {
  const fallback = EXPENSE_CATEGORIES.find(() => true);
  const icon = category?.icon ?? fallback?.icon ?? "📦";
  const color = category?.color ?? "#94A3B8";
  const name = category?.name ?? "Other";

  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium"
      style={{
        backgroundColor: color + "22",
        color: color,
        border: `1px solid ${color}44`,
      }}
    >
      <span>{icon}</span>
      {name}
    </span>
  );
}

function EmptyState({ filtered }: { filtered: boolean }) {
  return (
    <motion.div
      variants={scaleIn}
      initial="hidden"
      animate="visible"
      className="flex flex-col items-center justify-center py-24 text-center"
    >
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--accent)]/10 text-3xl">
        {filtered ? "🔍" : "💸"}
      </div>
      <h3 className="text-lg font-semibold text-[var(--foreground)]">
        {filtered ? "No matching expenses" : "No expenses yet"}
      </h3>
      <p className="mt-1.5 max-w-xs text-sm text-[var(--muted-foreground)]">
        {filtered
          ? "Try adjusting your filters or search query to find what you're looking for."
          : "Start tracking your spending by adding your first expense."}
      </p>
      {!filtered && (
        <Link
          href="/expenses/add"
          className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[var(--accent)] px-5 py-2.5 text-sm font-semibold text-black transition-all duration-200 hover:opacity-90 hover:shadow-lg"
        >
          <Plus className="h-4 w-4" />
          Add Expense
        </Link>
      )}
    </motion.div>
  );
}

function DeleteConfirmModal({
  expense,
  onConfirm,
  onCancel,
  loading,
}: {
  expense: Expense;
  onConfirm: () => void;
  onCancel: () => void;
  loading: boolean;
}) {
  return (
    <AnimatePresence>
      <motion.div
        key="overlay"
        variants={overlayVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4"
        onClick={onCancel}
      >
        <motion.div
          key="modal"
          variants={modalVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          className="relative w-full max-w-md rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-[0_8px_40px_rgba(0,0,0,0.5)]"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-red-500/10">
            <AlertCircle className="h-6 w-6 text-red-400" />
          </div>
          <h2 className="text-lg font-semibold text-[var(--foreground)]">Delete Expense</h2>
          <p className="mt-2 text-sm text-[var(--muted-foreground)]">
            Are you sure you want to delete{" "}
            <span className="font-medium text-[var(--foreground)]">{expense.title}</span>? This
            action cannot be undone.
          </p>
          <div className="mt-6 flex gap-3">
            <button
              onClick={onCancel}
              disabled={loading}
              className="flex-1 rounded-xl border border-[var(--border)] bg-transparent px-4 py-2.5 text-sm font-medium text-[var(--foreground)] transition-colors hover:bg-white/5 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              disabled={loading}
              className="flex-1 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition-all hover:bg-red-500 disabled:opacity-50"
            >
              {loading ? "Deleting..." : "Delete"}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  // Sorting
  const [sortField, setSortField] = useState<SortField>("expense_date");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  // Pagination
  const [page, setPage] = useState(1);

  // Delete
  const [deleteTarget, setDeleteTarget] = useState<Expense | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const supabase = createClient();

  // ── Fetch data ──────────────────────────────────────────────────────────────
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setError("Please log in to view your expenses.");
        setLoading(false);
        return;
      }

      const [catResult, expResult] = await Promise.all([
        supabase.from("categories").select("*").order("name"),
        supabase
          .from("expenses")
          .select("*")
          .eq("user_id", user.id)
          .order("expense_date", { ascending: false }),
      ]);

      if (catResult.error) throw catResult.error;
      if (expResult.error) throw expResult.error;

      setCategories((catResult.data as Category[]) ?? []);
      setExpenses((expResult.data as Expense[]) ?? []);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to load expenses.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ── Filtering ───────────────────────────────────────────────────────────────
  const filtered = expenses.filter((e) => {
    const matchSearch =
      !search ||
      e.title.toLowerCase().includes(search.toLowerCase()) ||
      (e.notes ?? "").toLowerCase().includes(search.toLowerCase());

    const matchCategory =
      selectedCategory === "all" || e.category_id === selectedCategory;

    const matchFrom = !dateFrom || e.expense_date >= dateFrom;
    const matchTo = !dateTo || e.expense_date <= dateTo;

    return matchSearch && matchCategory && matchFrom && matchTo;
  });

  // ── Sorting ─────────────────────────────────────────────────────────────────
  const sorted = [...filtered].sort((a, b) => {
    let aVal: string | number = "";
    let bVal: string | number = "";

    if (sortField === "amount") {
      aVal = parseFloat(a.amount) || 0;
      bVal = parseFloat(b.amount) || 0;
    } else if (sortField === "expense_date") {
      aVal = a.expense_date;
      bVal = b.expense_date;
    } else if (sortField === "title") {
      aVal = a.title.toLowerCase();
      bVal = b.title.toLowerCase();
    } else if (sortField === "category") {
      const aCat = categories.find((c) => c.id === a.category_id)?.name ?? "";
      const bCat = categories.find((c) => c.id === b.category_id)?.name ?? "";
      aVal = aCat.toLowerCase();
      bVal = bCat.toLowerCase();
    }

    if (aVal < bVal) return sortDir === "asc" ? -1 : 1;
    if (aVal > bVal) return sortDir === "asc" ? 1 : -1;
    return 0;
  });

  // ── Pagination ──────────────────────────────────────────────────────────────
  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const paginated = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir("asc");
    }
    setPage(1);
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ChevronDown className="h-3.5 w-3.5 opacity-30" />;
    return sortDir === "asc" ? (
      <ChevronUp className="h-3.5 w-3.5 text-[var(--primary)]" />
    ) : (
      <ChevronDown className="h-3.5 w-3.5 text-[var(--primary)]" />
    );
  };

  // ── Delete ──────────────────────────────────────────────────────────────────
  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try {
      const { error: delErr } = await supabase
        .from("expenses")
        .delete()
        .eq("id", deleteTarget.id);
      if (delErr) throw delErr;
      setExpenses((prev) => prev.filter((e) => e.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to delete expense.";
      setError(msg);
    } finally {
      setDeleteLoading(false);
    }
  };

  const isFiltered =
    search !== "" ||
    selectedCategory !== "all" ||
    dateFrom !== "" ||
    dateTo !== "";

  const totalSpent = filtered.reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0);

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[var(--background)] mesh-bg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pt-24">
        {/* Header */}
        <Reveal>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Link
                  href="/dashboard"
                  className="text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
                >
                  <ArrowLeft className="h-4 w-4" />
                </Link>
                <h1 className="text-2xl font-bold tracking-tight text-[var(--foreground)]">
                  Expenses
                </h1>
              </div>
              <p className="text-sm text-[var(--muted-foreground)]">
                {filtered.length} expense{filtered.length !== 1 ? "s" : ""} &middot;{" "}
                {formatCurrency(totalSpent)} total
              </p>
            </div>
            <Link
              href="/expenses/add"
              className="inline-flex items-center gap-2 rounded-xl bg-[var(--primary)] px-5 py-2.5 text-sm font-semibold text-white shadow-[0_0_16px_rgba(99,102,241,0.3)] transition-all duration-200 hover:opacity-90 hover:shadow-[0_0_24px_rgba(99,102,241,0.45)]"
            >
              <Plus className="h-4 w-4" />
              Add Expense
            </Link>
          </div>
        </Reveal>

        {/* Search + Filter bar */}
        <Reveal delay={0.05}>
          <div className="mb-4 flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--muted-foreground)]" />
              <input
                type="text"
                placeholder="Search expenses..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                className="w-full rounded-xl border border-[var(--border)] bg-[var(--card)] pl-9 pr-4 py-2.5 text-sm text-[var(--foreground)] placeholder-[var(--muted-foreground)] focus:border-[var(--primary)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)] transition-colors"
              />
              {search && (
                <button
                  onClick={() => { setSearch(""); setPage(1); }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
            <button
              onClick={() => setShowFilters((v) => !v)}
              className={cn(
                "inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-medium transition-colors",
                showFilters
                  ? "border-[var(--primary)] bg-[var(--primary)]/10 text-[var(--primary)]"
                  : "border-[var(--border)] bg-[var(--card)] text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
              )}
            >
              <Filter className="h-4 w-4" />
              Filters
              {isFiltered && (
                <span className="ml-1 flex h-4 w-4 items-center justify-center rounded-full bg-[var(--primary)] text-[10px] font-bold text-white">
                  !
                </span>
              )}
            </button>
          </div>

          {/* Expanded filters */}
          <AnimatePresence>
            {showFilters && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="mb-4 grid grid-cols-1 sm:grid-cols-3 gap-3 rounded-xl border border-[var(--border)] bg-[var(--card)] p-4">
                  {/* Category filter */}
                  <div>
                    <label className="block text-xs font-medium text-[var(--muted-foreground)] mb-1.5">
                      Category
                    </label>
                    <select
                      value={selectedCategory}
                      onChange={(e) => { setSelectedCategory(e.target.value); setPage(1); }}
                      className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)] focus:border-[var(--primary)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)] transition-colors"
                    >
                      <option value="all">All Categories</option>
                      {categories.map((cat) => (
                        <option key={cat.id} value={cat.id}>
                          {cat.icon} {cat.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Date from */}
                  <div>
                    <label className="block text-xs font-medium text-[var(--muted-foreground)] mb-1.5">
                      From
                    </label>
                    <input
                      type="date"
                      value={dateFrom}
                      onChange={(e) => { setDateFrom(e.target.value); setPage(1); }}
                      className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)] focus:border-[var(--primary)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)] transition-colors"
                    />
                  </div>

                  {/* Date to */}
                  <div>
                    <label className="block text-xs font-medium text-[var(--muted-foreground)] mb-1.5">
                      To
                    </label>
                    <input
                      type="date"
                      value={dateTo}
                      onChange={(e) => { setDateTo(e.target.value); setPage(1); }}
                      className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)] focus:border-[var(--primary)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)] transition-colors"
                    />
                  </div>
                </div>

                {isFiltered && (
                  <button
                    onClick={() => {
                      setSearch("");
                      setSelectedCategory("all");
                      setDateFrom("");
                      setDateTo("");
                      setPage(1);
                    }}
                    className="mb-4 text-xs text-[var(--muted-foreground)] hover:text-[var(--foreground)] underline transition-colors"
                  >
                    Clear all filters
                  </button>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </Reveal>

        {/* Error */}
        {error && (
          <div className="mb-4 flex items-center gap-3 rounded-xl border border-red-800/40 bg-red-950/30 px-4 py-3 text-sm text-red-300">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {error}
          </div>
        )}

        {/* Table */}
        <Reveal delay={0.1}>
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] overflow-hidden shadow-[0_2px_4px_rgba(0,0,0,0.08),0_8px_32px_-8px_rgba(0,0,0,0.24)]">
            {loading ? (
              <div className="flex items-center justify-center py-24">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--border)] border-t-[var(--primary)]" />
              </div>
            ) : paginated.length === 0 ? (
              <EmptyState filtered={isFiltered} />
            ) : (
              <>
                {/* Desktop table */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-[var(--border)] bg-[var(--background)]/50">
                        <th className="px-5 py-3.5 text-left">
                          <button
                            onClick={() => handleSort("title")}
                            className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
                          >
                            Title <SortIcon field="title" />
                          </button>
                        </th>
                        <th className="px-5 py-3.5 text-left">
                          <button
                            onClick={() => handleSort("category")}
                            className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
                          >
                            Category <SortIcon field="category" />
                          </button>
                        </th>
                        <th className="px-5 py-3.5 text-left">
                          <button
                            onClick={() => handleSort("expense_date")}
                            className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
                          >
                            Date <SortIcon field="expense_date" />
                          </button>
                        </th>
                        <th className="px-5 py-3.5 text-right">
                          <button
                            onClick={() => handleSort("amount")}
                            className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
                          >
                            Amount <SortIcon field="amount" />
                          </button>
                        </th>
                        <th className="px-5 py-3.5 text-right">
                          <span className="text-xs font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">
                            Actions
                          </span>
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--border)]">
                      <AnimatePresence mode="popLayout">
                        {paginated.map((expense) => {
                          const cat = categories.find((c) => c.id === expense.category_id);
                          return (
                            <motion.tr
                              key={expense.id}
                              variants={fadeInUp}
                              initial="hidden"
                              animate="visible"
                              exit={{ opacity: 0, x: -20 }}
                              className="group hover:bg-white/[0.02] transition-colors"
                            >
                              <td className="px-5 py-4">
                                <div className="font-medium text-[var(--foreground)]">{expense.title}</div>
                                {expense.notes && (
                                  <div className="mt-0.5 text-xs text-[var(--muted-foreground)] truncate max-w-[200px]">
                                    {expense.notes}
                                  </div>
                                )}
                              </td>
                              <td className="px-5 py-4">
                                <CategoryBadge category={cat} />
                              </td>
                              <td className="px-5 py-4 text-[var(--muted-foreground)]">
                                {formatDate(expense.expense_date)}
                              </td>
                              <td className="px-5 py-4 text-right font-semibold text-[var(--foreground)]">
                                {formatCurrency(parseFloat(expense.amount) || 0, expense.currency)}
                              </td>
                              <td className="px-5 py-4">
                                <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <Link
                                    href={`/expenses/add?id=${expense.id}`}
                                    className="flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--background)] text-[var(--muted-foreground)] hover:text-[var(--primary)] hover:border-[var(--primary)] transition-colors"
                                    title="Edit"
                                  >
                                    <Edit className="h-3.5 w-3.5" />
                                  </Link>
                                  <button
                                    onClick={() => setDeleteTarget(expense)}
                                    className="flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--background)] text-[var(--muted-foreground)] hover:text-red-400 hover:border-red-800 transition-colors"
                                    title="Delete"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </button>
                                </div>
                              </td>
                            </motion.tr>
                          );
                        })}
                      </AnimatePresence>
                    </tbody>
                  </table>
                </div>

                {/* Mobile cards */}
                <div className="md:hidden divide-y divide-[var(--border)]">
                  {paginated.map((expense) => {
                    const cat = categories.find((c) => c.id === expense.category_id);
                    return (
                      <div key={expense.id} className="px-4 py-4 flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-[var(--foreground)] truncate">{expense.title}</div>
                          <div className="mt-1 flex items-center gap-2 flex-wrap">
                            <CategoryBadge category={cat} />
                            <span className="text-xs text-[var(--muted-foreground)]">
                              {formatDate(expense.expense_date)}
                            </span>
                          </div>
                          {expense.notes && (
                            <div className="mt-1 text-xs text-[var(--muted-foreground)] truncate">
                              {expense.notes}
                            </div>
                          )}
                        </div>
                        <div className="flex flex-col items-end gap-2 shrink-0">
                          <span className="font-semibold text-[var(--foreground)]">
                            {formatCurrency(parseFloat(expense.amount) || 0, expense.currency)}
                          </span>
                          <div className="flex items-center gap-1.5">
                            <Link
                              href={`/expenses/add?id=${expense.id}`}
                              className="flex h-7 w-7 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--background)] text-[var(--muted-foreground)] hover:text-[var(--primary)] transition-colors"
                            >
                              <Edit className="h-3 w-3" />
                            </Link>
                            <button
                              onClick={() => setDeleteTarget(expense)}
                              className="flex h-7 w-7 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--background)] text-[var(--muted-foreground)] hover:text-red-400 transition-colors"
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between border-t border-[var(--border)] px-5 py-4">
                    <p className="text-xs text-[var(--muted-foreground)]">
                      Page {page} of {totalPages} &middot; {sorted.length} results
                    </p>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                        disabled={page === 1}
                        className="flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--background)] text-[var(--muted-foreground)] hover:text-[var(--foreground)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                      >
                        <ArrowLeft className="h-3.5 w-3.5" />
                      </button>
                      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        const pageNum = Math.max(1, Math.min(page - 2, totalPages - 4)) + i;
                        return (
                          <button
                            key={pageNum}
                            onClick={() => setPage(pageNum)}
                            className={cn(
                              "flex h-8 w-8 items-center justify-center rounded-lg text-xs font-medium transition-colors",
                              pageNum === page
                                ? "bg-[var(--primary)] text-white"
                                : "border border-[var(--border)] bg-[var(--background)] text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                            )}
                          >
                            {pageNum}
                          </button>
                        );
                      })}
                      <button
                        onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                        disabled={page === totalPages}
                        className="flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--background)] text-[var(--muted-foreground)] hover:text-[var(--foreground)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                      >
                        <ChevronRight className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </Reveal>
      </div>

      {/* Delete modal */}
      {deleteTarget && (
        <DeleteConfirmModal
          expense={deleteTarget}
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
          loading={deleteLoading}
        />
      )}
    </div>
  );
}
