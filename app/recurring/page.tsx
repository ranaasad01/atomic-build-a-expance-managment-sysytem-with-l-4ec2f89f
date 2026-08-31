"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { Reveal } from "@/components/Reveal";
import { fadeInUp, staggerContainer } from "@/lib/motion";
import { EXPENSE_CATEGORIES, CURRENCIES } from "@/lib/data";
import { createClient } from "@/lib/supabase/client";
import { RefreshCw, Plus, Edit, Trash2, AlertCircle, Calendar, Check, X, Loader2 } from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface RecurringExpense {
  id: string;
  user_id: string;
  title: string;
  amount: number;
  currency: string;
  category_id: string | null;
  frequency: string;
  start_date: string;
  next_due_date: string | null;
  auto_create: boolean;
  active: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

interface FormState {
  title: string;
  amount: string;
  currency: string;
  category_id: string;
  frequency: string;
  start_date: string;
  auto_create: boolean;
  notes: string;
}

interface FormErrors {
  title?: string;
  amount?: string;
  start_date?: string;
}

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

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "—";
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

function getTodayString(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function calcMonthlyCost(items: RecurringExpense[]): number {
  return items
    .filter((r) => r.active)
    .reduce((sum, r) => {
      const amt = r.amount ?? 0;
      if (r.frequency === "weekly") return sum + amt * 4.33;
      if (r.frequency === "yearly") return sum + amt / 12;
      return sum + amt; // monthly
    }, 0);
}

function getNextDue(items: RecurringExpense[]): string {
  const active = items
    .filter((r) => r.active && r.next_due_date)
    .sort((a, b) =>
      (a.next_due_date ?? "").localeCompare(b.next_due_date ?? "")
    );
  return active.length > 0 ? formatDate(active[0].next_due_date) : "—";
}

const FREQUENCIES = [
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
  { value: "yearly", label: "Yearly" },
];

const DEFAULT_FORM: FormState = {
  title: "",
  amount: "",
  currency: "USD",
  category_id: "",
  frequency: "monthly",
  start_date: "",
  auto_create: false,
  notes: "",
};

const inputCls =
  "w-full bg-[var(--background)] border border-[var(--border)] rounded-xl px-4 py-3 text-[var(--foreground)] placeholder-[var(--muted-foreground)] focus:border-[var(--primary)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)] transition-colors duration-200 text-sm";

const labelCls = "block text-sm font-medium text-[var(--foreground)] mb-1.5";

// ─── Category Badge ───────────────────────────────────────────────────────────

function CategoryBadge({ categoryId }: { categoryId: string | null }) {
  const cat = EXPENSE_CATEGORIES.find((c) => c.name === categoryId) ?? EXPENSE_CATEGORIES[EXPENSE_CATEGORIES.length - 1];
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium"
      style={{
        backgroundColor: cat.color + "22",
        color: cat.color,
        border: `1px solid ${cat.color}44`,
      }}
    >
      <span>{cat.icon}</span>
      {cat.name}
    </span>
  );
}

// ─── Frequency Badge ──────────────────────────────────────────────────────────

function FrequencyBadge({ frequency }: { frequency: string }) {
  const colors: Record<string, string> = {
    weekly: "#6366F1",
    monthly: "#10B981",
    yearly: "#F59E0B",
  };
  const color = colors[frequency] ?? "#94A3B8";
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium capitalize"
      style={{
        backgroundColor: color + "22",
        color,
        border: `1px solid ${color}44`,
      }}
    >
      <RefreshCw className="w-3 h-3" />
      {frequency}
    </span>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function RecurringPage() {
  const [items, setItems] = useState<RecurringExpense[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>({ ...DEFAULT_FORM });
  const [formErrors, setFormErrors] = useState<FormErrors>({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Delete state
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Toggle loading
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const supabase = createClient();

  // ── Fetch ────────────────────────────────────────────────────────────────────

  async function fetchItems() {
    setLoading(true);
    setError(null);
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        setError("You must be signed in to view recurring expenses.");
        setLoading(false);
        return;
      }
      const { data, error: fetchError } = await supabase
        .from("recurring_expenses")
        .select("*")
        .eq("user_id", userData.user.id)
        .order("created_at", { ascending: false });

      if (fetchError) {
        setError(fetchError.message);
      } else {
        setItems((data as RecurringExpense[]) ?? []);
      }
    } catch (err) {
      setError("Failed to load recurring expenses.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchItems();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Form helpers ─────────────────────────────────────────────────────────────

  function openAdd() {
    setEditingId(null);
    setForm({ ...DEFAULT_FORM, start_date: getTodayString() });
    setFormErrors({});
    setSaveError(null);
    setShowModal(true);
  }

  function openEdit(item: RecurringExpense) {
    setEditingId(item.id);
    setForm({
      title: item.title ?? "",
      amount: String(item.amount ?? ""),
      currency: item.currency ?? "USD",
      category_id: item.category_id ?? "",
      frequency: item.frequency ?? "monthly",
      start_date: item.start_date ?? getTodayString(),
      auto_create: item.auto_create ?? false,
      notes: item.notes ?? "",
    });
    setFormErrors({});
    setSaveError(null);
    setShowModal(true);
  }

  function closeModal() {
    setShowModal(false);
    setEditingId(null);
    setSaveError(null);
  }

  function validateForm(): boolean {
    const errs: FormErrors = {};
    if (!form.title.trim()) errs.title = "Title is required.";
    if (!form.amount || isNaN(Number(form.amount)) || Number(form.amount) <= 0)
      errs.amount = "Enter a valid amount greater than 0.";
    if (!form.start_date) errs.start_date = "Start date is required.";
    setFormErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleSave() {
    if (!validateForm()) return;
    setSaving(true);
    setSaveError(null);
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        setSaveError("You must be signed in.");
        setSaving(false);
        return;
      }

      const payload = {
        user_id: userData.user.id,
        title: form.title.trim(),
        amount: parseFloat(form.amount),
        currency: form.currency,
        category_id: form.category_id || null,
        frequency: form.frequency,
        start_date: form.start_date,
        auto_create: form.auto_create,
        notes: form.notes.trim() || null,
        updated_at: new Date().toISOString(),
      };

      if (editingId) {
        const { error: updateError } = await supabase
          .from("recurring_expenses")
          .update(payload)
          .eq("id", editingId);
        if (updateError) throw new Error(updateError.message);
      } else {
        const { error: insertError } = await supabase
          .from("recurring_expenses")
          .insert({ ...payload, active: true });
        if (insertError) throw new Error(insertError.message);
      }

      closeModal();
      await fetchItems();
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Failed to save.");
    } finally {
      setSaving(false);
    }
  }

  // ── Toggle active ─────────────────────────────────────────────────────────────

  async function handleToggleActive(item: RecurringExpense) {
    setTogglingId(item.id);
    try {
      const { error: toggleError } = await supabase
        .from("recurring_expenses")
        .update({ active: !item.active, updated_at: new Date().toISOString() })
        .eq("id", item.id);
      if (!toggleError) {
        setItems((prev) =>
          prev.map((r) =>
            r.id === item.id ? { ...r, active: !r.active } : r
          )
        );
      }
    } catch {
      // silently fail toggle
    } finally {
      setTogglingId(null);
    }
  }

  // ── Delete ────────────────────────────────────────────────────────────────────

  async function handleDelete() {
    if (!deleteId) return;
    setDeleting(true);
    try {
      const { error: deleteError } = await supabase
        .from("recurring_expenses")
        .delete()
        .eq("id", deleteId);
      if (!deleteError) {
        setItems((prev) => prev.filter((r) => r.id !== deleteId));
        setDeleteId(null);
      }
    } catch {
      // silently fail
    } finally {
      setDeleting(false);
    }
  }

  // ── Derived stats ─────────────────────────────────────────────────────────────

  const totalActive = items.filter((r) => r.active).length;
  const monthlyCost = calcMonthlyCost(items);
  const nextDue = getNextDue(items);

  // ─── Render ───────────────────────────────────────────────────────────────────

  return (
    <div
      className="min-h-screen mesh-bg"
      style={{ background: "var(--background)" }}
    >
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 pt-24">
        {/* ── Header ── */}
        <Reveal>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <RefreshCw className="w-5 h-5 text-[var(--primary)]" />
                <h1 className="text-2xl font-bold tracking-tight text-[var(--foreground)]">
                  Recurring Expenses
                </h1>
              </div>
              <p className="text-sm text-[var(--muted-foreground)]">
                Manage your subscriptions and repeating bills in one place.
              </p>
            </div>
            <button
              onClick={openAdd}
              className="inline-flex items-center gap-2 rounded-xl bg-[var(--primary)] px-5 py-2.5 text-sm font-semibold text-white shadow-[0_0_16px_rgba(99,102,241,0.3)] hover:opacity-90 transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
            >
              <Plus className="w-4 h-4" />
              Add Recurring
            </button>
          </div>
        </Reveal>

        {/* ── Summary Cards ── */}
        <Reveal delay={0.05}>
          <motion.div
            variants={staggerContainer}
            initial="hidden"
            animate="visible"
            className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8"
          >
            {/* Total Active */}
            <motion.div
              variants={fadeInUp}
              className="glass rounded-2xl p-5 border border-[var(--border)] shadow-[0_1px_2px_rgba(0,0,0,0.04),0_8px_24px_-8px_rgba(0,0,0,0.18)]"
            >
              <p className="text-xs font-medium text-[var(--muted-foreground)] uppercase tracking-wide mb-1">
                Total Active
              </p>
              <p className="text-3xl font-bold text-[var(--foreground)]">
                {totalActive}
              </p>
              <p className="text-xs text-[var(--muted-foreground)] mt-1">
                recurring expenses
              </p>
            </motion.div>

            {/* Monthly Cost */}
            <motion.div
              variants={fadeInUp}
              className="glass rounded-2xl p-5 border border-[var(--border)] shadow-[0_1px_2px_rgba(0,0,0,0.04),0_8px_24px_-8px_rgba(0,0,0,0.18)]"
            >
              <p className="text-xs font-medium text-[var(--muted-foreground)] uppercase tracking-wide mb-1">
                Monthly Cost
              </p>
              <p className="text-3xl font-bold text-[var(--accent)]">
                {formatCurrency(monthlyCost)}
              </p>
              <p className="text-xs text-[var(--muted-foreground)] mt-1">
                estimated per month
              </p>
            </motion.div>

            {/* Next Due */}
            <motion.div
              variants={fadeInUp}
              className="glass rounded-2xl p-5 border border-[var(--border)] shadow-[0_1px_2px_rgba(0,0,0,0.04),0_8px_24px_-8px_rgba(0,0,0,0.18)]"
            >
              <p className="text-xs font-medium text-[var(--muted-foreground)] uppercase tracking-wide mb-1">
                Next Due
              </p>
              <p className="text-2xl font-bold text-[var(--foreground)] truncate">
                {nextDue}
              </p>
              <p className="text-xs text-[var(--muted-foreground)] mt-1">
                upcoming payment
              </p>
            </motion.div>
          </motion.div>
        </Reveal>

        {/* ── Error Banner ── */}
        {error && (
          <Reveal>
            <div className="mb-6 flex items-center gap-3 rounded-xl border border-red-800/40 bg-red-950/40 px-4 py-3 text-sm text-red-300">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {error}
            </div>
          </Reveal>
        )}

        {/* ── List ── */}
        <Reveal delay={0.1}>
          <div className="glass rounded-2xl border border-[var(--border)] overflow-hidden shadow-[0_1px_2px_rgba(0,0,0,0.04),0_8px_24px_-8px_rgba(0,0,0,0.18)]">
            {loading ? (
              <div className="flex items-center justify-center py-24">
                <Loader2 className="w-8 h-8 animate-spin text-[var(--primary)]" />
              </div>
            ) : items.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-24 text-center px-6">
                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--primary)]/10 text-3xl">
                  🔄
                </div>
                <h3 className="text-lg font-semibold text-[var(--foreground)] mb-1">
                  No recurring expenses yet
                </h3>
                <p className="text-sm text-[var(--muted-foreground)] max-w-xs mb-6">
                  Add subscriptions, rent, or any repeating bill to track them automatically.
                </p>
                <button
                  onClick={openAdd}
                  className="inline-flex items-center gap-2 rounded-xl bg-[var(--primary)] px-5 py-2.5 text-sm font-semibold text-white hover:opacity-90 transition-all duration-200"
                >
                  <Plus className="w-4 h-4" />
                  Add Recurring
                </button>
              </div>
            ) : (
              <div className="divide-y divide-[var(--border)]">
                {items.map((item) => (
                  <motion.div
                    key={item.id}
                    variants={fadeInUp}
                    initial="hidden"
                    animate="visible"
                    className="flex flex-col sm:flex-row sm:items-center gap-3 px-5 py-4 hover:bg-white/[0.02] transition-colors duration-150"
                  >
                    {/* Left: info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <span
                          className={`text-sm font-semibold ${
                            item.active
                              ? "text-[var(--foreground)]"
                              : "text-[var(--muted-foreground)] line-through"
                          }`}
                        >
                          {item.title}
                        </span>
                        <FrequencyBadge frequency={item.frequency} />
                        {item.category_id && (
                          <CategoryBadge categoryId={item.category_id} />
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-3 text-xs text-[var(--muted-foreground)]">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          Next: {formatDate(item.next_due_date)}
                        </span>
                        {item.auto_create && (
                          <span className="flex items-center gap-1 text-[var(--primary)]">
                            <Check className="w-3 h-3" />
                            Auto-create
                          </span>
                        )}
                        {item.notes && (
                          <span className="truncate max-w-[200px]">{item.notes}</span>
                        )}
                      </div>
                    </div>

                    {/* Right: amount + actions */}
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="text-base font-bold text-[var(--foreground)]">
                        {formatCurrency(item.amount, item.currency)}
                      </span>

                      {/* Active toggle */}
                      <button
                        onClick={() => handleToggleActive(item)}
                        disabled={togglingId === item.id}
                        title={item.active ? "Deactivate" : "Activate"}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] ${
                          item.active
                            ? "bg-[var(--primary)]"
                            : "bg-[var(--border)]"
                        }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform duration-200 ${
                            item.active ? "translate-x-6" : "translate-x-1"
                          }`}
                        />
                      </button>

                      {/* Edit */}
                      <button
                        onClick={() => openEdit(item)}
                        title="Edit"
                        className="flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--border)] text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:border-[var(--primary)] transition-all duration-200"
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </button>

                      {/* Delete */}
                      <button
                        onClick={() => setDeleteId(item.id)}
                        title="Delete"
                        className="flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--border)] text-[var(--muted-foreground)] hover:text-red-400 hover:border-red-800/60 transition-all duration-200"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </Reveal>
      </div>

      {/* ── Add/Edit Modal ── */}
      <AnimatePresence>
        {showModal && (
          <>
            {/* Overlay */}
            <motion.div
              key="modal-overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
              onClick={closeModal}
            />

            {/* Modal */}
            <motion.div
              key="modal-panel"
              initial={{ opacity: 0, scale: 0.94, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94, y: 16 }}
              transition={{ duration: 0.22, ease: "easeOut" }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4"
              aria-modal="true"
              role="dialog"
              aria-label={editingId ? "Edit recurring expense" : "Add recurring expense"}
            >
              <div
                className="w-full max-w-lg glass rounded-2xl border border-[var(--border)] shadow-[0_8px_48px_rgba(0,0,0,0.5)] overflow-hidden"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Modal Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border)]">
                  <h2 className="text-base font-semibold text-[var(--foreground)]">
                    {editingId ? "Edit Recurring Expense" : "Add Recurring Expense"}
                  </h2>
                  <button
                    onClick={closeModal}
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-white/5 transition-all duration-200"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Modal Body */}
                <div className="px-6 py-5 space-y-4 max-h-[70vh] overflow-y-auto">
                  {saveError && (
                    <div className="flex items-center gap-2 rounded-xl border border-red-800/40 bg-red-950/40 px-4 py-3 text-sm text-red-300">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      {saveError}
                    </div>
                  )}

                  {/* Title */}
                  <div>
                    <label className={labelCls} htmlFor="re-title">
                      Title <span className="text-red-400">*</span>
                    </label>
                    <input
                      id="re-title"
                      type="text"
                      className={inputCls}
                      placeholder="e.g. Netflix, Rent, Gym"
                      value={form.title}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, title: e.target.value }))
                      }
                    />
                    {formErrors.title && (
                      <p className="mt-1 text-xs text-red-400">{formErrors.title}</p>
                    )}
                  </div>

                  {/* Amount + Currency */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={labelCls} htmlFor="re-amount">
                        Amount <span className="text-red-400">*</span>
                      </label>
                      <input
                        id="re-amount"
                        type="number"
                        min="0"
                        step="0.01"
                        className={inputCls}
                        placeholder="0.00"
                        value={form.amount}
                        onChange={(e) =>
                          setForm((f) => ({ ...f, amount: e.target.value }))
                        }
                      />
                      {formErrors.amount && (
                        <p className="mt-1 text-xs text-red-400">{formErrors.amount}</p>
                      )}
                    </div>
                    <div>
                      <label className={labelCls} htmlFor="re-currency">
                        Currency
                      </label>
                      <select
                        id="re-currency"
                        className={inputCls}
                        value={form.currency}
                        onChange={(e) =>
                          setForm((f) => ({ ...f, currency: e.target.value }))
                        }
                      >
                        {CURRENCIES.map((c) => (
                          <option key={c.code} value={c.code}>
                            {c.code} — {c.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Category */}
                  <div>
                    <label className={labelCls} htmlFor="re-category">
                      Category
                    </label>
                    <select
                      id="re-category"
                      className={inputCls}
                      value={form.category_id}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, category_id: e.target.value }))
                      }
                    >
                      <option value="">Select category</option>
                      {EXPENSE_CATEGORIES.map((c) => (
                        <option key={c.name} value={c.name}>
                          {c.icon} {c.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Frequency */}
                  <div>
                    <label className={labelCls} htmlFor="re-frequency">
                      Frequency
                    </label>
                    <select
                      id="re-frequency"
                      className={inputCls}
                      value={form.frequency}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, frequency: e.target.value }))
                      }
                    >
                      {FREQUENCIES.map((f) => (
                        <option key={f.value} value={f.value}>
                          {f.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Start Date */}
                  <div>
                    <label className={labelCls} htmlFor="re-start-date">
                      Start Date <span className="text-red-400">*</span>
                    </label>
                    <input
                      id="re-start-date"
                      type="date"
                      className={inputCls}
                      value={form.start_date}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, start_date: e.target.value }))
                      }
                    />
                    {formErrors.start_date && (
                      <p className="mt-1 text-xs text-red-400">{formErrors.start_date}</p>
                    )}
                  </div>

                  {/* Auto-create toggle */}
                  <div className="flex items-center justify-between rounded-xl border border-[var(--border)] bg-[var(--background)] px-4 py-3">
                    <div>
                      <p className="text-sm font-medium text-[var(--foreground)]">
                        Auto-create expense
                      </p>
                      <p className="text-xs text-[var(--muted-foreground)] mt-0.5">
                        Automatically log this expense when it is due.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        setForm((f) => ({ ...f, auto_create: !f.auto_create }))
                      }
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] ${
                        form.auto_create
                          ? "bg-[var(--primary)]"
                          : "bg-[var(--border)]"
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform duration-200 ${
                          form.auto_create ? "translate-x-6" : "translate-x-1"
                        }`}
                      />
                    </button>
                  </div>

                  {/* Notes */}
                  <div>
                    <label className={labelCls} htmlFor="re-notes">
                      Notes
                    </label>
                    <textarea
                      id="re-notes"
                      rows={2}
                      className={inputCls + " resize-none"}
                      placeholder="Optional notes..."
                      value={form.notes}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, notes: e.target.value }))
                      }
                    />
                  </div>
                </div>

                {/* Modal Footer */}
                <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-[var(--border)]">
                  <button
                    onClick={closeModal}
                    className="rounded-xl border border-[var(--border)] px-4 py-2 text-sm font-medium text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:border-[var(--primary)] transition-all duration-200"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="inline-flex items-center gap-2 rounded-xl bg-[var(--primary)] px-5 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60 transition-all duration-200 shadow-[0_0_12px_rgba(99,102,241,0.25)]"
                  >
                    {saving ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Check className="w-4 h-4" />
                    )}
                    {saving ? "Saving..." : editingId ? "Save Changes" : "Add Recurring"}
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ── Delete Confirmation Modal ── */}
      <AnimatePresence>
        {deleteId && (
          <>
            <motion.div
              key="delete-overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
              onClick={() => setDeleteId(null)}
            />
            <motion.div
              key="delete-panel"
              initial={{ opacity: 0, scale: 0.94, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94, y: 16 }}
              transition={{ duration: 0.22, ease: "easeOut" }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4"
              role="dialog"
              aria-modal="true"
              aria-label="Confirm delete"
            >
              <div
                className="w-full max-w-sm glass rounded-2xl border border-[var(--border)] shadow-[0_8px_48px_rgba(0,0,0,0.5)] p-6"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-950/50 border border-red-800/40">
                    <Trash2 className="w-5 h-5 text-red-400" />
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-[var(--foreground)]">
                      Delete Recurring Expense
                    </h3>
                    <p className="text-xs text-[var(--muted-foreground)]">
                      This action cannot be undone.
                    </p>
                  </div>
                </div>
                <p className="text-sm text-[var(--muted-foreground)] mb-6">
                  Are you sure you want to delete{" "}
                  <span className="font-medium text-[var(--foreground)]">
                    {items.find((r) => r.id === deleteId)?.title ?? "this expense"}
                  </span>
                  ? It will be permanently removed.
                </p>
                <div className="flex items-center justify-end gap-3">
                  <button
                    onClick={() => setDeleteId(null)}
                    className="rounded-xl border border-[var(--border)] px-4 py-2 text-sm font-medium text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-all duration-200"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleDelete}
                    disabled={deleting}
                    className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60 transition-all duration-200"
                  >
                    {deleting ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Trash2 className="w-4 h-4" />
                    )}
                    {deleting ? "Deleting..." : "Delete"}
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
