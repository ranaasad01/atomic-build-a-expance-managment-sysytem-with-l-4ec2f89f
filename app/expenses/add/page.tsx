"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import Link from "next/link";
import { ArrowLeft, Save, Trash2, AlertCircle, Check, Calendar, FileText, DollarSign, Tag, Loader2 } from 'lucide-react';
import { Reveal } from "@/components/Reveal";
import { fadeInUp, staggerContainer } from "@/lib/motion";
import { EXPENSE_CATEGORIES, CURRENCIES } from "@/lib/data";
import { createClient } from "@/lib/supabase/client";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Category {
  id: string;
  name: string;
  icon: string | null;
  color: string | null;
}

interface FormData {
  title: string;
  amount: string;
  currency: string;
  category_id: string;
  expense_date: string;
  notes: string;
}

interface FormErrors {
  title?: string;
  amount?: string;
  currency?: string;
  category_id?: string;
  expense_date?: string;
  notes?: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getTodayString(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

const DEFAULT_FORM: FormData = {
  title: "",
  amount: "",
  currency: "USD",
  category_id: "",
  expense_date: getTodayString(),
  notes: "",
};

// ─── Input class helper ───────────────────────────────────────────────────────

const inputCls =
  "w-full bg-[var(--card)] border border-[var(--border)] rounded-xl px-4 py-3 text-[var(--foreground)] placeholder-[var(--muted-foreground)] focus:border-[var(--primary)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)] transition-colors duration-200";

const labelCls = "block text-sm font-medium text-[var(--foreground)] mb-1.5";

// ─── Inner component (uses useSearchParams) ───────────────────────────────────

function AddEditExpenseInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const expenseId = searchParams.get("id");
  const isEditing = Boolean(expenseId);

  const [form, setForm] = useState<FormData>({ ...DEFAULT_FORM });
  const [categories, setCategories] = useState<Category[]>([]);
  const [errors, setErrors] = useState<FormErrors>({});
  const [fetchingExpense, setFetchingExpense] = useState(isEditing);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<"idle" | "success" | "error">("idle");
  const [submitMessage, setSubmitMessage] = useState("");

  // ── Fetch categories ────────────────────────────────────────────────────────
  const fetchCategories = useCallback(async () => {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("categories")
      .select("id, name, icon, color")
      .order("name");
    if (!error && data) {
      setCategories(data as Category[]);
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
  }, []);

  // ── Fetch expense for edit ──────────────────────────────────────────────────
  const fetchExpense = useCallback(
    async (id: string) => {
      setFetchingExpense(true);
      const supabase = createClient();
      const { data, error } = await supabase
        .from("expenses")
        .select("*")
        .eq("id", id)
        .single();
      if (!error && data) {
        setForm({
          title: data.title ?? "",
          amount: data.amount?.toString() ?? "",
          currency: data.currency ?? "USD",
          category_id: data.category_id ?? "",
          expense_date: data.expense_date ?? getTodayString(),
          notes: data.notes ?? "",
        });
      }
      setFetchingExpense(false);
    },
    []
  );

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  useEffect(() => {
    if (expenseId) {
      fetchExpense(expenseId);
    }
  }, [expenseId, fetchExpense]);

  // ── Validation ──────────────────────────────────────────────────────────────
  function validate(): boolean {
    const errs: FormErrors = {};
    if (!form.title.trim()) errs.title = "Title is required.";
    if (!form.amount) {
      errs.amount = "Amount is required.";
    } else if (isNaN(Number(form.amount)) || Number(form.amount) <= 0) {
      errs.amount = "Enter a valid positive amount.";
    }
    if (!form.category_id) errs.category_id = "Please select a category.";
    if (!form.expense_date) errs.expense_date = "Date is required.";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  // ── Submit ──────────────────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setSaving(true);
    setSubmitStatus("idle");

    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        setSubmitStatus("error");
        setSubmitMessage("You must be logged in to save an expense.");
        setSaving(false);
        return;
      }

      const payload = {
        user_id: user.id,
        title: form.title.trim(),
        amount: parseFloat(form.amount),
        currency: form.currency,
        category_id: form.category_id,
        expense_date: form.expense_date,
        notes: form.notes.trim() || null,
        updated_at: new Date().toISOString(),
      };

      let saveError: { message: string } | null = null;

      if (isEditing && expenseId) {
        const { error } = await supabase
          .from("expenses")
          .update(payload)
          .eq("id", expenseId)
          .eq("user_id", user.id);
        saveError = error;
      } else {
        const { error } = await supabase
          .from("expenses")
          .insert({ ...payload, created_at: new Date().toISOString() });
        saveError = error;
      }

      if (saveError) {
        setSubmitStatus("error");
        setSubmitMessage(saveError.message);
        setSaving(false);
        return;
      }

      setSubmitStatus("success");
      setSubmitMessage(
        isEditing ? "Expense updated successfully!" : "Expense added successfully!"
      );

      setTimeout(() => {
        router.push("/expenses");
      }, 1200);
    } catch (err) {
      setSubmitStatus("error");
      setSubmitMessage("An unexpected error occurred. Please try again.");
      setSaving(false);
    }
  };

  // ── Delete ──────────────────────────────────────────────────────────────────
  const handleDelete = async () => {
    if (!expenseId) return;
    setDeleting(true);

    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        setDeleting(false);
        return;
      }

      const { error } = await supabase
        .from("expenses")
        .delete()
        .eq("id", expenseId)
        .eq("user_id", user.id);

      if (!error) {
        router.push("/expenses");
      } else {
        setSubmitStatus("error");
        setSubmitMessage(error.message);
        setDeleting(false);
        setShowDeleteConfirm(false);
      }
    } catch {
      setDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  // ── Field updater ───────────────────────────────────────────────────────────
  function setField<K extends keyof FormData>(key: K, value: FormData[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: undefined }));
  }

  // ── Loading state ───────────────────────────────────────────────────────────
  if (fetchingExpense) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[var(--primary)]" />
      </div>
    );
  }

  const selectedCategory = categories.find((c) => c.id === form.category_id);

  return (
    <div className="min-h-screen mesh-bg pt-20 pb-16 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Back link */}
        <Reveal>
          <Link
            href="/expenses"
            className="inline-flex items-center gap-2 text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors duration-200 mb-6"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Expenses
          </Link>
        </Reveal>

        {/* Header */}
        <Reveal delay={0.05}>
          <div className="mb-8">
            <h1 className="text-2xl font-bold tracking-tight text-[var(--foreground)]">
              {isEditing ? "Edit Expense" : "Add Expense"}
            </h1>
            <p className="mt-1 text-sm text-[var(--muted-foreground)]">
              {isEditing
                ? "Update the details of your expense."
                : "Log a new expense to keep your budget on track."}
            </p>
          </div>
        </Reveal>

        {/* Status banner */}
        {submitStatus !== "idle" && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className={`mb-6 flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium border ${
              submitStatus === "success"
                ? "bg-emerald-950/60 border-emerald-800/50 text-emerald-300"
                : "bg-red-950/60 border-red-800/50 text-red-300"
            }`}
          >
            {submitStatus === "success" ? (
              <Check className="h-4 w-4 shrink-0" />
            ) : (
              <AlertCircle className="h-4 w-4 shrink-0" />
            )}
            {submitMessage}
          </motion.div>
        )}

        {/* Form card */}
        <Reveal delay={0.1}>
          <form
            onSubmit={handleSubmit}
            noValidate
            className="glass rounded-2xl p-6 md:p-8 space-y-6"
          >
            <motion.div
              variants={staggerContainer}
              initial="hidden"
              animate="visible"
              className="space-y-6"
            >
              {/* Title */}
              <motion.div variants={fadeInUp}>
                <label htmlFor="title" className={labelCls}>
                  <span className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-[var(--primary)]" />
                    Title
                  </span>
                </label>
                <input
                  id="title"
                  type="text"
                  value={form.title}
                  onChange={(e) => setField("title", e.target.value)}
                  placeholder="e.g. Grocery run, Netflix subscription"
                  className={inputCls}
                  maxLength={120}
                />
                {errors.title && (
                  <p className="mt-1.5 text-xs text-red-400 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {errors.title}
                  </p>
                )}
              </motion.div>

              {/* Amount + Currency */}
              <motion.div variants={fadeInUp} className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="amount" className={labelCls}>
                    <span className="flex items-center gap-2">
                      <DollarSign className="h-4 w-4 text-[var(--primary)]" />
                      Amount
                    </span>
                  </label>
                  <input
                    id="amount"
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={form.amount}
                    onChange={(e) => setField("amount", e.target.value)}
                    placeholder="0.00"
                    className={inputCls}
                  />
                  {errors.amount && (
                    <p className="mt-1.5 text-xs text-red-400 flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      {errors.amount}
                    </p>
                  )}
                </div>

                <div>
                  <label htmlFor="currency" className={labelCls}>
                    Currency
                  </label>
                  <select
                    id="currency"
                    value={form.currency}
                    onChange={(e) => setField("currency", e.target.value)}
                    className={inputCls}
                  >
                    {CURRENCIES.map((c) => (
                      <option key={c.code} value={c.code}>
                        {c.symbol} {c.code} — {c.label}
                      </option>
                    ))}
                  </select>
                </div>
              </motion.div>

              {/* Category */}
              <motion.div variants={fadeInUp}>
                <label className={labelCls}>
                  <span className="flex items-center gap-2">
                    <Tag className="h-4 w-4 text-[var(--primary)]" />
                    Category
                  </span>
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {categories.map((cat) => {
                    const isSelected = form.category_id === cat.id;
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => setField("category_id", cat.id)}
                        className={`flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium border transition-all duration-200 ${
                          isSelected
                            ? "border-[var(--primary)] bg-[var(--primary)]/15 text-[var(--foreground)]"
                            : "border-[var(--border)] bg-[var(--card)] text-[var(--muted-foreground)] hover:border-[var(--primary)]/50 hover:text-[var(--foreground)]"
                        }`}
                        style={isSelected ? { boxShadow: `0 0 0 1px var(--primary)` } : {}}
                      >
                        <span>{cat.icon ?? "📦"}</span>
                        <span className="truncate">{cat.name}</span>
                      </button>
                    );
                  })}
                </div>
                {errors.category_id && (
                  <p className="mt-1.5 text-xs text-red-400 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {errors.category_id}
                  </p>
                )}
              </motion.div>

              {/* Date */}
              <motion.div variants={fadeInUp}>
                <label htmlFor="expense_date" className={labelCls}>
                  <span className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-[var(--primary)]" />
                    Date
                  </span>
                </label>
                <input
                  id="expense_date"
                  type="date"
                  value={form.expense_date}
                  onChange={(e) => setField("expense_date", e.target.value)}
                  className={inputCls}
                  max={getTodayString()}
                />
                {errors.expense_date && (
                  <p className="mt-1.5 text-xs text-red-400 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {errors.expense_date}
                  </p>
                )}
              </motion.div>

              {/* Notes */}
              <motion.div variants={fadeInUp}>
                <label htmlFor="notes" className={labelCls}>
                  Notes
                  <span className="ml-1 text-xs text-[var(--muted-foreground)] font-normal">
                    (optional)
                  </span>
                </label>
                <textarea
                  id="notes"
                  value={form.notes}
                  onChange={(e) => setField("notes", e.target.value)}
                  placeholder="Any additional details..."
                  rows={3}
                  className={`${inputCls} resize-none`}
                  maxLength={500}
                />
              </motion.div>

              {/* Actions */}
              <motion.div
                variants={fadeInUp}
                className="flex items-center justify-between gap-4 pt-2"
              >
                {isEditing ? (
                  <button
                    type="button"
                    onClick={() => setShowDeleteConfirm(true)}
                    disabled={deleting || saving}
                    className="inline-flex items-center gap-2 rounded-xl border border-red-800/50 bg-red-950/40 px-4 py-2.5 text-sm font-medium text-red-400 hover:bg-red-950/70 transition-all duration-200 disabled:opacity-50"
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete
                  </button>
                ) : (
                  <div />
                )}

                <button
                  type="submit"
                  disabled={saving || deleting}
                  className="inline-flex items-center gap-2 rounded-xl bg-[var(--primary)] px-6 py-2.5 text-sm font-semibold text-white hover:opacity-90 transition-all duration-200 disabled:opacity-50 shadow-[0_0_16px_rgba(99,102,241,0.3)]"
                >
                  {saving ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  {saving
                    ? "Saving..."
                    : isEditing
                    ? "Update Expense"
                    : "Add Expense"}
                </button>
              </motion.div>
            </motion.div>
          </form>
        </Reveal>

        {/* Delete confirmation modal */}
        {showDeleteConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setShowDeleteConfirm(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.94, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              className="relative glass rounded-2xl p-6 max-w-sm w-full shadow-2xl"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-950/60 border border-red-800/50">
                  <Trash2 className="h-5 w-5 text-red-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-[var(--foreground)]">Delete Expense</h3>
                  <p className="text-xs text-[var(--muted-foreground)]">This action cannot be undone.</p>
                </div>
              </div>
              <p className="text-sm text-[var(--muted-foreground)] mb-6">
                Are you sure you want to delete this expense? It will be permanently removed.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  disabled={deleting}
                  className="flex-1 rounded-xl border border-[var(--border)] bg-[var(--card)] px-4 py-2.5 text-sm font-medium text-[var(--foreground)] hover:bg-[var(--border)] transition-all duration-200 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  className="flex-1 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-700 transition-all duration-200 disabled:opacity-50 inline-flex items-center justify-center gap-2"
                >
                  {deleting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4" />
                  )}
                  {deleting ? "Deleting..." : "Delete"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Page export (wraps inner in Suspense for useSearchParams) ────────────────

export default function AddEditExpensePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-[var(--primary)]" />
        </div>
      }
    >
      <AddEditExpenseInner />
    </Suspense>
  );
}
