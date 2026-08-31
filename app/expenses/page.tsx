"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence, type Variants } from "framer-motion";
import { Search, ChevronDown, ChevronUp, Edit, Trash2, X, AlertCircle, ChevronRight, ArrowLeft, Plus, Filter, Calendar } from 'lucide-react';
import Link from "next/link";
import { Reveal } from "@/components/Reveal";
import { createClient } from "@/lib/supabase/client";
import { EXPENSE_CATEGORIES } from "@/lib/data";
type formatCurrency = any;
const formatCurrency: any = [];
type formatDate = any;
const formatDate: any = [];
import { fadeInUp, staggerContainer, scaleIn } from "@/lib/motion";

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
      <h3 className="text-lg font-semibold text-[hsl(var(--foreground))]">
        {filtered ? "No matching expenses" : "No expenses yet"}
      </h3>
      <p className="mt-1.5 max-w-xs text-sm text-[hsl(var(--muted-foreground))]">
        {filtered
          ? "Try adjusting your filters or search query to find what you're looking for."
          : "Start tracking your spending by adding your first expense."}
      </p>
      {!filtered && (
        <Link
          href="/expenses/new"
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
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        variants={overlayVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
      >
        <motion.div
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          onClick={onCancel}
        />
        <motion.div
          className="relative z-10 w-full max-w-md rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6 shadow-[0_8px_40px_rgba(0,0,0,0.3)]"
          variants={modalVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
        >
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-red-500/10">
            <AlertCircle className="h-6 w-6 text-red-500" />
          </div>
          <h2 className="text-lg font-semibold text-[hsl(var(--foreground))]">
            Delete Expense
          </h2>
          <p className="mt-2 text-sm text-[hsl(var(--muted-foreground))]">
            Are you sure you want to delete{" "}
            <span className="font-medium text-[hsl(var(--foreground))]">
              &ldquo;{expense.title}&rdquo;
            </span>
            ? This action cannot be undone.
          </p>
          <div className="mt-6 flex gap-3">
            <button
              onClick={onCancel}
              disabled={loading}
              className="flex-1 rounded-xl border border-[hsl(var(--border))] bg-transparent px-4 py-2.5 text-sm font-medium text-[hsl(var(--foreground))] transition-colors hover:bg-[hsl(var(--muted))] disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              disabled={loading}
              className="flex-1 rounded-xl bg-red-500 px-4 py-2.5 text-sm font-semibold text-white transition-all hover:bg-red-600 disabled:opacity-50"
            >
              {loading ? "Deleting..." : "Delete"}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

function SortIcon({
  field,
  active,
  dir,
}: {
  field: SortField;
  active: SortField;
  dir: SortDir;
}) {
  if (field !== active)
    return (
      <span className="ml-1 opacity-30">
        <ChevronDown className="inline h-3.5 w-3.5" />
      </span>
    );
  return dir === "asc" ? (
    <ChevronUp className="ml-1 inline h-3.5 w-3.5 text-[var(--accent)]" />
  ) : (
    <ChevronDown className="ml-1 inline h-3.5 w-3.5 text-[var(--accent)]" />
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ExpensesPage() {
  const supabase = createClient();

  // Data state
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter state
  const [search, setSearch] = useState("");
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [catDropOpen, setCatDropOpen] = useState(false);
  const catDropRef = useRef<HTMLDivElement>(null);

  // Sort state
  const [sortField, setSortField] = useState<SortField>("expense_date");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  // Pagination
  const [page, setPage] = useState(1);

  // Delete modal
  const [deleteTarget, setDeleteTarget] = useState<Expense | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // ── Fetch data ──────────────────────────────────────────────────────────────

  const fetchExpenses = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: err } = await supabase
        .from("expenses")
        .select("*")
        .order("expense_date", { ascending: false });
      if (err) throw err;
      setExpenses(data ?? []);
    } catch (e) {
      setError((e as Error).message ?? "Failed to load expenses.");
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  const fetchCategories = useCallback(async () => {
    const { data } = await supabase.from("categories").select("*");
    setCategories(data ?? []);
  }, [supabase]);

  useEffect(() => {
    fetchExpenses();
    fetchCategories();
  }, [fetchExpenses, fetchCategories]);

  // ── Realtime subscription ───────────────────────────────────────────────────

  useEffect(() => {
    const channel = supabase
      .channel("expenses-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "expenses" },
        () => {
          fetchExpenses();
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, fetchExpenses]);

  // ── Close category dropdown on outside click ────────────────────────────────

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (
        catDropRef.current &&
        !catDropRef.current.contains(e.target as Node)
      ) {
        setCatDropOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // ── Filter + sort ───────────────────────────────────────────────────────────

  const filtered = expenses.filter((exp) => {
    const q = search.toLowerCase();
    const matchSearch =
      !q ||
      exp.title.toLowerCase().includes(q) ||
      (exp.notes ?? "").toLowerCase().includes(q);

    const matchCat =
      selectedCategories.length === 0 ||
      selectedCategories.includes(exp.category_id);

    const matchFrom = !dateFrom || exp.expense_date >= dateFrom;
    const matchTo = !dateTo || exp.expense_date <= dateTo;

    return matchSearch && matchCat && matchFrom && matchTo;
  });

  const sorted = [...filtered].sort((a, b) => {
    let cmp = 0;
    if (sortField === "title") {
      cmp = a.title.localeCompare(b.title);
    } else if (sortField === "amount") {
      cmp = parseFloat(a.amount) - parseFloat(b.amount);
    } else if (sortField === "expense_date") {
      cmp = a.expense_date.localeCompare(b.expense_date);
    } else if (sortField === "category") {
      const catA =
        categories.find((c) => c.id === a.category_id)?.name ?? "";
      const catB =
        categories.find((c) => c.id === b.category_id)?.name ?? "";
      cmp = catA.localeCompare(catB);
    }
    return sortDir === "asc" ? cmp : -cmp;
  });

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paginated = sorted.slice(
    (safePage - 1) * PAGE_SIZE,
    safePage * PAGE_SIZE
  );

  // ── Sort toggle ─────────────────────────────────────────────────────────────

  function handleSort(field: SortField) {
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir("asc");
    }
    setPage(1);
  }

  // ── Delete ──────────────────────────────────────────────────────────────────

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try {
      const { error: err } = await supabase
        .from("expenses")
        .delete()
        .eq("id", deleteTarget.id);
      if (err) throw err;
      setDeleteTarget(null);
    } catch (e) {
      console.error("Delete failed:", e);
    } finally {
      setDeleteLoading(false);
    }
  }

  // ── Category toggle ─────────────────────────────────────────────────────────

  function toggleCategory(id: string) {
    setSelectedCategories((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
    );
    setPage(1);
  }

  function clearFilters() {
    setSearch("");
    setSelectedCategories([]);
    setDateFrom("");
    setDateTo("");
    setPage(1);
  }

  const hasFilters =
    search || selectedCategories.length > 0 || dateFrom || dateTo;

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-[hsl(var(--background))]">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        {/* Header */}
        <Reveal>
          <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="mb-1 flex items-center gap-2 text-sm text-[hsl(var(--muted-foreground))]">
                <Link
                  href="/dashboard"
                  className="flex items-center gap-1 hover:text-[var(--accent)] transition-colors"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  Dashboard
                </Link>
                <ChevronRight className="h-3.5 w-3.5 opacity-40" />
                <span>Expenses</span>
              </div>
              <h1 className="text-3xl font-bold tracking-tight text-[hsl(var(--foreground))]">
                All Expenses
              </h1>
              <p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">
                {loading
                  ? "Loading..."
                  : `${filtered.length} expense${filtered.length !== 1 ? "s" : ""} found`}
              </p>
            </div>
            <Link
              href="/expenses/new"
              className="inline-flex items-center gap-2 rounded-xl bg-[var(--accent)] px-5 py-2.5 text-sm font-semibold text-black shadow-[0_2px_12px_var(--accent)/30] transition-all duration-200 hover:opacity-90 hover:shadow-lg"
            >
              <Plus className="h-4 w-4" />
              Add Expense
            </Link>
          </div>
        </Reveal>

        {/* Filter Bar */}
        <Reveal delay={0.05}>
          <div className="mb-6 rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-4 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_4px_16px_-4px_rgba(0,0,0,0.1)]">
            <div className="flex flex-wrap gap-3">
              {/* Search */}
              <div className="relative min-w-[200px] flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[hsl(var(--muted-foreground))]" />
                <input
                  type="text"
                  placeholder="Search expenses..."
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                  className="h-10 w-full rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] pl-9 pr-4 text-sm text-[hsl(var(--foreground))] placeholder:text-[hsl(var(--muted-foreground))] focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20 transition-all"
                />
              </div>

              {/* Date From */}
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[hsl(var(--muted-foreground))]" />
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => {
                    setDateFrom(e.target.value);
                    setPage(1);
                  }}
                  className="h-10 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] pl-9 pr-3 text-sm text-[hsl(var(--foreground))] focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20 transition-all"
                />
              </div>

              {/* Date To */}
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[hsl(var(--muted-foreground))]" />
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => {
                    setDateTo(e.target.value);
                    setPage(1);
                  }}
                  className="h-10 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] pl-9 pr-3 text-sm text-[hsl(var(--foreground))] focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20 transition-all"
                />
              </div>

              {/* Category Multi-select */}
              <div className="relative" ref={catDropRef}>
                <button
                  onClick={() => setCatDropOpen((o) => !o)}
                  className={cn(
                    "flex h-10 items-center gap-2 rounded-xl border px-3 text-sm font-medium transition-all",
                    selectedCategories.length > 0
                      ? "border-[var(--accent)] bg-[var(--accent)]/10 text-[var(--accent)]"
                      : "border-[hsl(var(--border))] bg-[hsl(var(--background))] text-[hsl(var(--foreground))]"
                  )}
                >
                  <Filter className="h-4 w-4" />
                  {selectedCategories.length > 0
                    ? `${selectedCategories.length} categor${selectedCategories.length > 1 ? "ies" : "y"}`
                    : "All Categories"}
                  <ChevronDown
                    className={cn(
                      "h-3.5 w-3.5 transition-transform",
                      catDropOpen && "rotate-180"
                    )}
                  />
                </button>

                <AnimatePresence>
                  {catDropOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 6, scale: 0.97 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 6, scale: 0.97 }}
                      transition={{ duration: 0.15 }}
                      className="absolute right-0 top-12 z-30 w-56 rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-2 shadow-[0_8px_32px_rgba(0,0,0,0.2)]"
                    >
                      {categories.length === 0 ? (
                        <p className="px-3 py-2 text-xs text-[hsl(var(--muted-foreground))]">
                          Loading categories...
                        </p>
                      ) : (
                        categories.map((cat) => {
                          const checked = selectedCategories.includes(cat.id);
                          return (
                            <button
                              key={cat.id}
                              onClick={() => toggleCategory(cat.id)}
                              className={cn(
                                "flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-sm transition-colors",
                                checked
                                  ? "bg-[var(--accent)]/10 text-[var(--accent)]"
                                  : "text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted))]"
                              )}
                            >
                              <span>{cat.icon ?? "📦"}</span>
                              <span className="flex-1 text-left">
                                {cat.name}
                              </span>
                              {checked && (
                                <span className="h-4 w-4 rounded-full bg-[var(--accent)] text-center text-[10px] leading-4 text-black">
                                  ✓
                                </span>
                              )}
                            </button>
                          );
                        })
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Clear filters */}
              {hasFilters && (
                <button
                  onClick={clearFilters}
                  className="flex h-10 items-center gap-1.5 rounded-xl border border-[hsl(var(--border))] px-3 text-sm text-[hsl(var(--muted-foreground))] transition-colors hover:border-red-400 hover:text-red-400"
                >
                  <X className="h-3.5 w-3.5" />
                  Clear
                </button>
              )}
            </div>
          </div>
        </Reveal>

        {/* Error */}
        {error && (
          <Reveal>
            <div className="mb-6 flex items-center gap-3 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {error}
            </div>
          </Reveal>
        )}

        {/* Table */}
        <Reveal delay={0.08}>
          <div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] shadow-[0_1px_2px_rgba(0,0,0,0.04),0_8px_24px_-8px_rgba(0,0,0,0.12)] overflow-hidden">
            {loading ? (
              <div className="flex flex-col gap-3 p-6">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div
                    key={i}
                    className="h-12 animate-pulse rounded-xl bg-[hsl(var(--muted))]"
                    style={{ opacity: 1 - i * 0.12 }}
                  />
                ))}
              </div>
            ) : sorted.length === 0 ? (
              <EmptyState filtered={!!hasFilters} />
            ) : (
              <>
                {/* Desktop table */}
                <div className="hidden overflow-x-auto md:block">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-[hsl(var(--border))] bg-[hsl(var(--muted))]/40">
                        {(
                          [
                            { label: "Title", field: "title" as SortField },
                            {
                              label: "Category",
                              field: "category" as SortField,
                            },
                            { label: "Amount", field: "amount" as SortField },
                            { label: "Date", field: "expense_date" as SortField },
                            { label: "Notes", field: null },
                            { label: "Actions", field: null },
                          ] as { label: string; field: SortField | null }[]
                        ).map(({ label, field }) => (
                          <th
                            key={label}
                            className={cn(
                              "px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-[hsl(var(--muted-foreground))]",
                              field && "cursor-pointer select-none hover:text-[hsl(var(--foreground))] transition-colors"
                            )}
                            onClick={() => field && handleSort(field)}
                          >
                            {label}
                            {field && (
                              <SortIcon
                                field={field}
                                active={sortField}
                                dir={sortDir}
                              />
                            )}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <motion.tbody
                      variants={staggerContainer}
                      initial="hidden"
                      animate="visible"
                    >
                      {paginated.map((exp) => {
                        const cat = categories.find(
                          (c) => c.id === exp.category_id
                        );
                        return (
                          <motion.tr
                            key={exp.id}
                            variants={fadeInUp}
                            className="group border-b border-[hsl(var(--border))]/60 transition-colors last:border-0 hover:bg-[hsl(var(--muted))]/30"
                          >
                            <td className="px-5 py-4">
                              <span className="font-medium text-[hsl(var(--foreground))]">
                                {exp.title}
                              </span>
                            </td>
                            <td className="px-5 py-4">
                              <CategoryBadge category={cat} />
                            </td>
                            <td className="px-5 py-4">
                              <span className="font-semibold tabular-nums text-[hsl(var(--foreground))]">
                                {formatCurrency(exp.amount, exp.currency)}
                              </span>
                            </td>
                            <td className="px-5 py-4 text-[hsl(var(--muted-foreground))]">
                              {formatDate(exp.expense_date)}
                            </td>
                            <td className="max-w-[180px] px-5 py-4">
                              {exp.notes ? (
                                <span
                                  className="block truncate text-[hsl(var(--muted-foreground))]"
                                  title={exp.notes}
                                >
                                  {exp.notes}
                                </span>
                              ) : (
                                <span className="text-[hsl(var(--muted-foreground))]/40">
                                  —
                                </span>
                              )}
                            </td>
                            <td className="px-5 py-4">
                              <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                                <Link
                                  href={`/expenses/${exp.id}/edit`}
                                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--background))] text-[hsl(var(--muted-foreground))] transition-all hover:border-[var(--accent)] hover:text-[var(--accent)]"
                                >
                                  <Edit className="h-3.5 w-3.5" />
                                </Link>
                                <button
                                  onClick={() => setDeleteTarget(exp)}
                                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--background))] text-[hsl(var(--muted-foreground))] transition-all hover:border-red-400 hover:text-red-400"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            </td>
                          </motion.tr>
                        );
                      })}
                    </motion.tbody>
                  </table>
                </div>

                {/* Mobile cards */}
                <motion.div
                  className="flex flex-col divide-y divide-[hsl(var(--border))]/60 md:hidden"
                  variants={staggerContainer}
                  initial="hidden"
                  animate="visible"
                >
                  {paginated.map((exp) => {
                    const cat = categories.find(
                      (c) => c.id === exp.category_id
                    );
                    return (
                      <motion.div
                        key={exp.id}
                        variants={fadeInUp}
                        className="flex items-start justify-between gap-3 p-4"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium text-[hsl(var(--foreground))]">
                              {exp.title}
                            </span>
                            <CategoryBadge category={cat} />
                          </div>
                          <div className="mt-1 flex items-center gap-2 text-xs text-[hsl(var(--muted-foreground))]">
                            <span>{formatDate(exp.expense_date)}</span>
                            {exp.notes && (
                              <>
                                <span>·</span>
                                <span className="truncate max-w-[140px]">
                                  {exp.notes}
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                        <div className="flex shrink-0 flex-col items-end gap-2">
                          <span className="font-semibold tabular-nums text-[hsl(var(--foreground))]">
                            {formatCurrency(exp.amount, exp.currency)}
                          </span>
                          <div className="flex gap-1">
                            <Link
                              href={`/expenses/${exp.id}/edit`}
                              className="flex h-7 w-7 items-center justify-center rounded-lg border border-[hsl(var(--border))] text-[hsl(var(--muted-foreground))] transition-all hover:border-[var(--accent)] hover:text-[var(--accent)]"
                            >
                              <Edit className="h-3 w-3" />
                            </Link>
                            <button
                              onClick={() => setDeleteTarget(exp)}
                              className="flex h-7 w-7 items-center justify-center rounded-lg border border-[hsl(var(--border))] text-[hsl(var(--muted-foreground))] transition-all hover:border-red-400 hover:text-red-400"
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </motion.div>
              </>
            )}
          </div>
        </Reveal>

        {/* Pagination */}
        {!loading && sorted.length > PAGE_SIZE && (
          <Reveal delay={0.1}>
            <div className="mt-6 flex items-center justify-between gap-4">
              <p className="text-sm text-[hsl(var(--muted-foreground))]">
                Showing{" "}
                <span className="font-medium text-[hsl(var(--foreground))]">
                  {(safePage - 1) * PAGE_SIZE + 1}
                </span>{" "}
                to{" "}
                <span className="font-medium text-[hsl(var(--foreground))]">
                  {Math.min(safePage * PAGE_SIZE, sorted.length)}
                </span>{" "}
                of{" "}
                <span className="font-medium text-[hsl(var(--foreground))]">
                  {sorted.length}
                </span>{" "}
                expenses
              </p>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={safePage === 1}
                  className="flex h-9 w-9 items-center justify-center rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] text-[hsl(var(--foreground))] transition-all hover:border-[var(--accent)] hover:text-[var(--accent)] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <ArrowLeft className="h-4 w-4" />
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter(
                    (p) =>
                      p === 1 ||
                      p === totalPages ||
                      Math.abs(p - safePage) <= 1
                  )
                  .reduce<(number | "...")[]>((acc, p, idx, arr) => {
                    if (idx > 0 && p - (arr[idx - 1] as number) > 1) {
                      acc.push("...");
                    }
                    acc.push(p);
                    return acc;
                  }, [])
                  .map((p, i) =>
                    p === "..." ? (
                      <span
                        key={`ellipsis-${i}`}
                        className="flex h-9 w-9 items-center justify-center text-sm text-[hsl(var(--muted-foreground))]"
                      >
                        …
                      </span>
                    ) : (
                      <button
                        key={p}
                        onClick={() => setPage(p as number)}
                        className={cn(
                          "flex h-9 w-9 items-center justify-center rounded-xl border text-sm font-medium transition-all",
                          safePage === p
                            ? "border-[var(--accent)] bg-[var(--accent)] text-black"
                            : "border-[hsl(var(--border))] bg-[hsl(var(--card))] text-[hsl(var(--foreground))] hover:border-[var(--accent)] hover:text-[var(--accent)]"
                        )}
                      >
                        {p}
                      </button>
                    )
                  )}
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={safePage === totalPages}
                  className="flex h-9 w-9 items-center justify-center rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] text-[hsl(var(--foreground))] transition-all hover:border-[var(--accent)] hover:text-[var(--accent)] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </Reveal>
        )}
      </div>

      {/* Delete Modal */}
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