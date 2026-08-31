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
  expense_date: "",
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

  const supabase = createClient();

  // ── Fetch categories ────────────────────────────────────────────────────────
  const fetchCategories = useCallback(async () => {
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
    } else {
      // Set today's date only on mount for new expense
      setForm((prev) => ({ ...prev, expense_date: getTodayString() }));
    }
  }, [expenseId, fetchExpense]);

  // ── Validation ──────────────────────────────────────────────────────────────
  const validate = (): boolean => {
    const newErrors: FormErrors = {};
    if (!form.category_id) newErrors.category_id = "Please select a category.";
    if (!form.title.trim()) newErrors.title = "Expense title is required.";
    else if (form.title.length > 200) newErrors.title = "Title must be under 200 characters.";
    if (!form.amount) newErrors.amount = "Amount is required.";
    else if (isNaN(parseFloat(form.amount)) || parseFloat(form.amount) <= 0)
      newErrors.amount = "Enter a valid positive amount.";
    if (!form.expense_date) newErrors.expense_date = "Date is required.";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // ── Field change ────────────────────────────────────────────────────────────
  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (errors[name as keyof FormErrors]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  };

  // ── Category select ─────────────────────────────────────────────────────────
  const handleCategorySelect = (catId: string) => {
    setForm((prev) => ({ ...prev, category_id: catId }));
    if (errors.category_id) {
      setErrors((prev) => ({ ...prev, category_id: undefined }));
    }
  };

  // ── Save ────────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);
    setSubmitStatus("idle");
    setSubmitMessage("");

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated.");

      const payload = {
        title: form.title.trim(),
        amount: parseFloat(form.amount),
        currency: form.currency,
        category_id: form.category_id,
        expense_date: form.expense_date,
        notes: form.notes.trim() || null,
        updated_at: new Date().toISOString(),
      };

      if (isEditing && expenseId) {
        const { error } = await supabase
          .from("expenses")
          .update(payload)
          .eq("id", expenseId)
          .eq("user_id", user.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("expenses").insert({
          ...payload,
          user_id: user.id,
          created_at: new Date().toISOString(),
        });
        if (error) throw error;
      }

      setSubmitStatus("success");
      setSubmitMessage(isEditing ? "Expense updated!" : "Expense saved!");

      setTimeout(() => {
        router.push("/expenses");
      }, 1500);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to save expense.";
      setSubmitStatus("error");
      setSubmitMessage(message);
    } finally {
      setSaving(false);
    }
  };

  // ── Delete ──────────────────────────────────────────────────────────────────
  const handleDelete = async () => {
    if (!expenseId) return;
    setDeleting(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated.");

      const { error } = await supabase
        .from("expenses")
        .delete()
        .eq("id", expenseId)
        .eq("user_id", user.id);
      if (error) throw error;

      router.push("/expenses");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to delete expense.";
      setSubmitStatus("error");
      setSubmitMessage(message);
      setDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  // ── Render ──────────────────────────────────────────────────────────────────

  // Success overlay
  if (submitStatus === "success") {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--background)" }}>
        <motion.div
          initial={{ opacity: 0, scale: 0.85 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          className="flex flex-col items-center gap-4 text-center"
        >
          <div className="w-20 h-20 rounded-full bg-[#10B981]/20 flex items-center justify-center">
            <Check className="w-10 h-10 text-[#10B981]" />
          </div>
          <h2 className="text-2xl font-bold text-[var(--foreground)]">{submitMessage}</h2>
          <p className="text-[var(--muted-foreground)] text-sm">Redirecting to your expenses...</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: "var(--background)" }}>
      {/* ── Hero ── */}
      <section className="relative py-12 mesh-bg">
        <div className="max-w-2xl mx-auto px-4 sm:px-6">
          <Reveal>
            <Link
              href="/expenses"
              className="inline-flex items-center gap-2 text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors duration-200 mb-6 group"
            >
              <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform duration-200" />
              Back to Expenses
            </Link>
          </Reveal>

          <Reveal delay={0.05}>
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-[var(--foreground)] mb-3">
              {isEditing ? "Edit Expense" : "Add New Expense"}
            </h1>
          </Reveal>

          <Reveal delay={0.1}>
            <p className="text-[var(--muted-foreground)] leading-relaxed">
              Log your spending in seconds — categorized, dated, and saved to your account.
            </p>
          </Reveal>
        </div>
      </section>

      {/* ── Form Card ── */}
      <section className="py-10 pb-24">
        <div className="max-w-2xl mx-auto px-4 sm:px-6">
          <Reveal delay={0.15}>
            <div className="glass rounded-2xl border border-[var(--border)] p-6 sm:p-8 shadow-[0_4px_32px_rgba(0,0,0,0.35),0_1px_4px_rgba(99,102,241,0.08)]">

              {/* Loading state for edit */}
              {fetchingExpense ? (
                <div className="flex flex-col items-center justify-center py-16 gap-4">
                  <Loader2 className="w-10 h-10 text-[var(--primary)] animate-spin" />
                  <p className="text-[var(--muted-foreground)] text-sm">Loading expense...</p>
                </div>
              ) : (
                <motion.div
                  variants={staggerContainer}
                  initial="hidden"
                  animate="visible"
                  className="space-y-6"
                >
                  {/* ── Category Selector ── */}
                  <motion.div variants={fadeInUp}>
                    <label className={labelCls}>
                      <Tag className="inline w-4 h-4 mr-1.5 opacity-70" />
                      Category
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-2">
                      {(categories.length > 0 ? categories : EXPENSE_CATEGORIES.map((c, i) => ({
                        id: `static-${i}`,
                        name: c.name,
                        icon: c.icon,
                        color: c.color,
                      }))).map((cat) => {
                        const isSelected = form.category_id === cat.id;
                        return (
                          <button
                            key={cat.id}
                            type="button"
                            onClick={() => handleCategorySelect(cat.id)}
                            className={[
                              "flex flex-col items-center gap-1.5 rounded-xl border px-2 py-3 text-xs font-medium transition-all duration-200 cursor-pointer",
                              isSelected
                                ? "border-[var(--primary)] bg-[var(--primary)]/10 text-[var(--primary)] shadow-[0_0_12px_rgba(99,102,241,0.2)]"
                                : "border-[var(--border)] text-[var(--muted-foreground)] hover:border-[var(--primary)]/50 hover:text-[var(--foreground)]",
                            ].join(" ")}
                          >
                            <span className="text-xl">{cat.icon ?? "📦"}</span>
                            <span className="text-center leading-tight">{cat.name}</span>
                          </button>
                        );
                      })}
                    </div>
                    {errors.category_id && (
                      <p className="mt-1.5 text-sm text-[var(--destructive)] flex items-center gap-1">
                        <AlertCircle className="w-3.5 h-3.5" />
                        {errors.category_id}
                      </p>
                    )}
                  </motion.div>

                  {/* ── Title ── */}
                  <motion.div variants={fadeInUp}>
                    <label htmlFor="title" className={labelCls}>
                      <FileText className="inline w-4 h-4 mr-1.5 opacity-70" />
                      Expense Title
                    </label>
                    <input
                      id="title"
                      name="title"
                      type="text"
                      value={form.title}
                      onChange={handleChange}
                      placeholder="e.g. Grocery run at Whole Foods"
                      className={inputCls}
                      maxLength={200}
                    />
                    {errors.title && (
                      <p className="mt-1.5 text-sm text-[var(--destructive)] flex items-center gap-1">
                        <AlertCircle className="w-3.5 h-3.5" />
                        {errors.title}
                      </p>
                    )}
                  </motion.div>

                  {/* ── Amount + Currency ── */}
                  <motion.div variants={fadeInUp}>
                    <div className="grid grid-cols-3 gap-3">
                      <div className="col-span-2">
                        <label htmlFor="amount" className={labelCls}>
                          <DollarSign className="inline w-4 h-4 mr-1.5 opacity-70" />
                          Amount
                        </label>
                        <input
                          id="amount"
                          name="amount"
                          type="number"
                          min="0"
                          step="0.01"
                          value={form.amount}
                          onChange={handleChange}
                          placeholder="0.00"
                          className={inputCls}
                        />
                        {errors.amount && (
                          <p className="mt-1.5 text-sm text-[var(--destructive)] flex items-center gap-1">
                            <AlertCircle className="w-3.5 h-3.5" />
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
                          name="currency"
                          value={form.currency}
                          onChange={handleChange}
                          className={inputCls}
                        >
                          {CURRENCIES.map((c) => (
                            <option key={c.code} value={c.code}>
                              {c.code}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </motion.div>

                  {/* ── Date ── */}
                  <motion.div variants={fadeInUp}>
                    <label htmlFor="expense_date" className={labelCls}>
                      <Calendar className="inline w-4 h-4 mr-1.5 opacity-70" />
                      Date
                    </label>
                    <input
                      id="expense_date"
                      name="expense_date"
                      type="date"
                      value={form.expense_date}
                      onChange={handleChange}
                      className={inputCls}
                    />
                    {errors.expense_date && (
                      <p className="mt-1.5 text-sm text-[var(--destructive)] flex items-center gap-1">
                        <AlertCircle className="w-3.5 h-3.5" />
                        {errors.expense_date}
                      </p>
                    )}
                  </motion.div>

                  {/* ── Notes ── */}
                  <motion.div variants={fadeInUp}>
                    <label htmlFor="notes" className={labelCls}>
                      Notes
                      <span className="ml-1 text-[var(--muted-foreground)] font-normal">(optional)</span>
                    </label>
                    <textarea
                      id="notes"
                      name="notes"
                      rows={3}
                      value={form.notes}
                      onChange={handleChange}
                      placeholder="Any additional details..."
                      className={`${inputCls} resize-none`}
                    />
                  </motion.div>

                  {/* ── Error message ── */}
                  {submitStatus === "error" && submitMessage && (
                    <motion.div
                      variants={fadeInUp}
                      className="flex items-center gap-2 rounded-xl border border-[var(--destructive)]/30 bg-[var(--destructive)]/10 px-4 py-3 text-sm text-[var(--destructive)]"
                    >
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      {submitMessage}
                    </motion.div>
                  )}

                  {/* ── Action Buttons ── */}
                  <motion.div
                    variants={fadeInUp}
                    className="flex items-center justify-between gap-3 pt-2"
                  >
                    {/* Delete (edit mode only) */}
                    {isEditing && (
                      <div className="flex items-center gap-2">
                        {showDeleteConfirm ? (
                          <>
                            <span className="text-sm text-[var(--muted-foreground)]">
                              Are you sure?
                            </span>
                            <button
                              type="button"
                              onClick={handleDelete}
                              disabled={deleting}
                              className="inline-flex items-center gap-1.5 rounded-xl bg-[var(--destructive)] px-4 py-2.5 text-sm font-semibold text-white transition-all duration-200 hover:opacity-90 disabled:opacity-60"
                            >
                              {deleting ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <Trash2 className="w-4 h-4" />
                              )}
                              {deleting ? "Deleting..." : "Confirm"}
                            </button>
                            <button
                              type="button"
                              onClick={() => setShowDeleteConfirm(false)}
                              className="rounded-xl border border-[var(--border)] px-4 py-2.5 text-sm font-medium text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors duration-200"
                            >
                              Cancel
                            </button>
                          </>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setShowDeleteConfirm(true)}
                            className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--destructive)]/40 bg-[var(--destructive)]/10 px-4 py-2.5 text-sm font-medium text-[var(--destructive)] hover:bg-[var(--destructive)]/20 transition-all duration-200"
                          >
                            <Trash2 className="w-4 h-4" />
                            Delete
                          </button>
                        )}
                      </div>
                    )}

                    {/* Right side: Cancel + Save */}
                    <div className="flex items-center gap-3 ml-auto">
                      <Link
                        href="/expenses"
                        className="rounded-xl border border-[var(--border)] px-5 py-2.5 text-sm font-medium text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:border-[var(--primary)]/40 transition-all duration-200"
                      >
                        Cancel
                      </Link>
                      <button
                        type="button"
                        onClick={handleSave}
                        disabled={saving}
                        className="inline-flex items-center gap-2 rounded-xl bg-[var(--primary)] px-6 py-2.5 text-sm font-semibold text-white hover:bg-[var(--primary)]/90 transition-all duration-200 disabled:opacity-60 shadow-[0_0_16px_rgba(99,102,241,0.3)] hover:shadow-[0_0_24px_rgba(99,102,241,0.45)]"
                      >
                        {saving ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Save className="w-4 h-4" />
                        )}
                        {saving
                          ? "Saving..."
                          : isEditing
                          ? "Update Expense"
                          : "Save Expense"}
                      </button>
                    </div>
                  </motion.div>
                </motion.div>
              )}
            </div>
          </Reveal>

          {/* ── Tips card ── */}
          <Reveal delay={0.25}>
            <div className="mt-6 glass rounded-xl border border-[var(--border)] p-5">
              <h3 className="text-sm font-semibold text-[var(--foreground)] mb-3">Quick tips</h3>
              <ul className="space-y-2">
                {[
                  "Pick the category that best matches your purchase for accurate reports.",
                  "Use the notes field to add merchant names, receipt numbers, or context.",
                  "Log expenses the same day to keep your records accurate.",
                ].map((tip, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-[var(--muted-foreground)]">
                    <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-[var(--primary)]/20 text-[var(--primary)] text-[10px] font-bold">
                      {i + 1}
                    </span>
                    {tip}
                  </li>
                ))}
              </ul>
            </div>
          </Reveal>
        </div>
      </section>
    </div>
  );
}

// ─── Suspense wrapper (required for useSearchParams in App Router) ─────────────

function LoadingFallback() {
  return (
    <div
      className="min-h-screen flex items-center justify-center"
      style={{ background: "var(--background)" }}
    >
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="w-10 h-10 text-[var(--primary)] animate-spin" />
        <p className="text-[var(--muted-foreground)] text-sm">Loading...</p>
      </div>
    </div>
  );
}

export default function AddEditExpensePage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <AddEditExpenseInner />
    </Suspense>
  );
}
