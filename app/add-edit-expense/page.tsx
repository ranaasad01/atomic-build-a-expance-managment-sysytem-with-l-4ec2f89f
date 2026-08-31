"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowLeft, Save, Trash2, AlertCircle, Check, Calendar, FileText, DollarSign } from 'lucide-react';
import Link from "next/link";
import { Reveal } from "@/components/Reveal";
import { fadeInUp, staggerContainer } from "@/lib/motion";
import { EXPENSE_CATEGORIES } from "@/lib/data";
type formatCurrency = any;
const formatCurrency: any = [];
type DEFAULT_CURRENCY = any;
const DEFAULT_CURRENCY: any = [];
import { createClient } from "@/lib/supabase/client";

interface Category {
  id: string;
  name: string;
  icon: string | null;
  color: string | null;
}

interface ExpenseFormData {
  title: string;
  amount: string;
  category_id: string;
  expense_date: string;
  notes: string;
  currency: string;
}

const CURRENCIES = ["USD", "EUR", "GBP", "CAD", "AUD", "JPY", "INR"];

const defaultForm: ExpenseFormData = {
  title: "",
  amount: "",
  category_id: "",
  expense_date: new Date().toISOString().split("T")[0],
  notes: "",
  currency: DEFAULT_CURRENCY,
};

function AddEditExpensePageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const expenseId = searchParams.get("id");
  const isEditing = Boolean(expenseId);

  const [form, setForm] = useState<ExpenseFormData>(defaultForm);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetchingExpense, setFetchingExpense] = useState(isEditing);
  const [fetchingCategories, setFetchingCategories] = useState(true);
  const [errors, setErrors] = useState<Partial<ExpenseFormData>>({});
  const [submitStatus, setSubmitStatus] = useState<"idle" | "success" | "error">("idle");
  const [submitMessage, setSubmitMessage] = useState("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const supabase = createClient();

  const fetchCategories = useCallback(async () => {
    setFetchingCategories(true);
    const { data, error } = await supabase.from("categories").select("*").order("name");
    if (!error && data) {
      setCategories(data as Category[]);
    }
    setFetchingCategories(false);
  }, []);

  const fetchExpense = useCallback(async (id: string) => {
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
        category_id: data.category_id ?? "",
        expense_date: data.expense_date ?? defaultForm.expense_date,
        notes: data.notes ?? "",
        currency: data.currency ?? DEFAULT_CURRENCY,
      });
    }
    setFetchingExpense(false);
  }, []);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  useEffect(() => {
    if (expenseId) {
      fetchExpense(expenseId);
    }
  }, [expenseId, fetchExpense]);

  const validate = (): boolean => {
    const newErrors: Partial<ExpenseFormData> = {};
    if (!form.title.trim()) newErrors.title = "Title is required";
    else if (form.title.length > 200) newErrors.title = "Title must be under 200 characters";
    if (!form.amount) newErrors.amount = "Amount is required";
    else if (isNaN(parseFloat(form.amount)) || parseFloat(form.amount) <= 0)
      newErrors.amount = "Enter a valid positive amount";
    if (!form.category_id) newErrors.category_id = "Please select a category";
    if (!form.expense_date) newErrors.expense_date = "Date is required";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (errors[name as keyof ExpenseFormData]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    setSubmitStatus("idle");

    const payload = {
      title: form.title.trim(),
      amount: parseFloat(form.amount),
      category_id: form.category_id,
      expense_date: form.expense_date,
      notes: form.notes.trim() || null,
      currency: form.currency,
      updated_at: new Date().toISOString(),
    };

    try {
      if (isEditing && expenseId) {
        const { error } = await supabase
          .from("expenses")
          .update(payload)
          .eq("id", expenseId);
        if (error) throw error;
        setSubmitStatus("success");
        setSubmitMessage("Expense updated successfully.");
      } else {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("Not authenticated");
        const { error } = await supabase.from("expenses").insert({
          ...payload,
          user_id: user.id,
          created_at: new Date().toISOString(),
        });
        if (error) throw error;
        setSubmitStatus("success");
        setSubmitMessage("Expense added successfully.");
        setForm(defaultForm);
      }
      setTimeout(() => router.push("/expenses"), 1200);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Something went wrong. Please try again.";
      setSubmitStatus("error");
      setSubmitMessage(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!expenseId) return;
    setLoading(true);
    try {
      const { error } = await supabase.from("expenses").delete().eq("id", expenseId);
      if (error) throw error;
      router.push("/expenses");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to delete expense.";
      setSubmitStatus("error");
      setSubmitMessage(msg);
      setShowDeleteConfirm(false);
    } finally {
      setLoading(false);
    }
  };

  const selectedCategory = categories.find((c) => c.id === form.category_id);
  const fallbackIcon = EXPENSE_CATEGORIES.find(
    (ec) => selectedCategory && ec.name.toLowerCase().includes(selectedCategory.name.toLowerCase().split(" ")[0])
  )?.icon ?? "📦";

  if (fetchingExpense || fetchingCategories) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[hsl(var(--background))]">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
          className="w-10 h-10 rounded-full border-2 border-[var(--accent)] border-t-transparent"
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[hsl(var(--background))] pb-24">
      {/* Page header */}
      <Reveal>
        <div className="border-b border-[hsl(var(--border))] bg-[hsl(var(--card))]/60 backdrop-blur-sm sticky top-0 z-10">
          <div className="max-w-2xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
            <Link
              href="/expenses"
              className="inline-flex items-center gap-2 text-sm text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] transition-colors duration-200 group"
            >
              <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform duration-200" />
              Back to Expenses
            </Link>
            {isEditing && (
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(true)}
                className="inline-flex items-center gap-1.5 text-sm text-red-500 hover:text-red-600 transition-colors duration-200"
              >
                <Trash2 className="w-4 h-4" />
                Delete
              </button>
            )}
          </div>
        </div>
      </Reveal>

      <div className="max-w-2xl mx-auto px-4 sm:px-6 pt-10">
        {/* Title */}
        <Reveal>
          <div className="mb-8">
            <h1 className="text-3xl font-bold tracking-tight text-[hsl(var(--foreground))]">
              {isEditing ? "Edit Expense" : "Add Expense"}
            </h1>
            <p className="mt-1.5 text-[hsl(var(--muted-foreground))] text-sm leading-relaxed">
              {isEditing
                ? "Update the details of your expense below."
                : "Record a new expense to keep your budget on track."}
            </p>
          </div>
        </Reveal>

        {/* Status banner */}
        {submitStatus !== "idle" && (
          <Reveal>
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              className={`mb-6 flex items-start gap-3 rounded-xl border px-4 py-3 text-sm ${
                submitStatus === "success"
                  ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-600"
                  : "border-red-500/30 bg-red-500/10 text-red-600"
              }`}
            >
              {submitStatus === "success" ? (
                <Check className="w-4 h-4 mt-0.5 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              )}
              <span>{submitMessage}</span>
            </motion.div>
          </Reveal>
        )}

        {/* Form card */}
        <Reveal>
          <motion.form
            onSubmit={handleSubmit}
            variants={staggerContainer}
            initial="hidden"
            animate="visible"
            className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] shadow-[0_1px_2px_rgba(0,0,0,0.04),0_8px_24px_-8px_rgba(0,0,0,0.10)] overflow-hidden"
          >
            {/* Category selector */}
            <motion.div variants={fadeInUp} className="p-6 border-b border-[hsl(var(--border))]">
              <label className="block text-xs font-semibold uppercase tracking-widest text-[hsl(var(--muted-foreground))] mb-3">
                Category
              </label>
              {fetchingCategories ? (
                <div className="h-10 rounded-lg bg-[hsl(var(--muted))]/40 animate-pulse" />
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {categories.map((cat) => {
                    const match = EXPENSE_CATEGORIES.find(
                      (ec) =>
                        ec.name.toLowerCase().includes(cat.name.toLowerCase().split(" ")[0]) ||
                        cat.name.toLowerCase().includes(ec.name.toLowerCase().split(" ")[0])
                    );
                    const icon = cat.icon ?? match?.icon ?? "📦";
                    const color = cat.color ?? match?.color ?? "#94A3B8";
                    const isSelected = form.category_id === cat.id;
                    return (
                      <motion.button
                        key={cat.id}
                        type="button"
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => {
                          setForm((prev) => ({ ...prev, category_id: cat.id }));
                          setErrors((prev) => ({ ...prev, category_id: undefined }));
                        }}
                        className={`flex items-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-medium transition-all duration-200 ${
                          isSelected
                            ? "border-[var(--accent)] bg-[var(--accent)]/10 text-[hsl(var(--foreground))]"
                            : "border-[hsl(var(--border))] bg-[hsl(var(--background))] text-[hsl(var(--muted-foreground))] hover:border-[hsl(var(--foreground))]/20 hover:text-[hsl(var(--foreground))]"
                        }`}
                      >
                        <span className="text-base leading-none">{icon}</span>
                        <span className="truncate">{cat.name}</span>
                        {isSelected && (
                          <Check className="w-3.5 h-3.5 ml-auto shrink-0 text-[var(--accent)]" />
                        )}
                      </motion.button>
                    );
                  })}
                </div>
              )}
              {errors.category_id && (
                <p className="mt-2 text-xs text-red-500 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" /> {errors.category_id}
                </p>
              )}
            </motion.div>

            {/* Core fields */}
            <motion.div variants={fadeInUp} className="p-6 space-y-5">
              {/* Title */}
              <div>
                <label htmlFor="title" className="block text-sm font-medium text-[hsl(var(--foreground))] mb-1.5">
                  <span className="flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-[hsl(var(--muted-foreground))]" />
                    Title
                  </span>
                </label>
                <input
                  id="title"
                  name="title"
                  type="text"
                  value={form.title}
                  onChange={handleChange}
                  placeholder="e.g. Grocery run, Uber ride, Netflix..."
                  className={`w-full rounded-xl border px-4 py-2.5 text-sm bg-[hsl(var(--background))] text-[hsl(var(--foreground))] placeholder:text-[hsl(var(--muted-foreground))]/60 outline-none transition-all duration-200 focus:ring-2 focus:ring-[var(--accent)]/30 focus:border-[var(--accent)] ${
                    errors.title ? "border-red-500" : "border-[hsl(var(--border))]"
                  }`}
                />
                {errors.title && (
                  <p className="mt-1.5 text-xs text-red-500 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5" /> {errors.title}
                  </p>
                )}
              </div>

              {/* Amount + Currency */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="amount" className="block text-sm font-medium text-[hsl(var(--foreground))] mb-1.5">
                    <span className="flex items-center gap-1.5">
                      <DollarSign className="w-3.5 h-3.5 text-[hsl(var(--muted-foreground))]" />
                      Amount
                    </span>
                  </label>
                  <input
                    id="amount"
                    name="amount"
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={form.amount}
                    onChange={handleChange}
                    placeholder="0.00"
                    className={`w-full rounded-xl border px-4 py-2.5 text-sm bg-[hsl(var(--background))] text-[hsl(var(--foreground))] placeholder:text-[hsl(var(--muted-foreground))]/60 outline-none transition-all duration-200 focus:ring-2 focus:ring-[var(--accent)]/30 focus:border-[var(--accent)] ${
                      errors.amount ? "border-red-500" : "border-[hsl(var(--border))]"
                    }`}
                  />
                  {errors.amount && (
                    <p className="mt-1.5 text-xs text-red-500 flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5" /> {errors.amount}
                    </p>
                  )}
                </div>
                <div>
                  <label htmlFor="currency" className="block text-sm font-medium text-[hsl(var(--foreground))] mb-1.5">
                    Currency
                  </label>
                  <select
                    id="currency"
                    name="currency"
                    value={form.currency}
                    onChange={handleChange}
                    className="w-full rounded-xl border border-[hsl(var(--border))] px-4 py-2.5 text-sm bg-[hsl(var(--background))] text-[hsl(var(--foreground))] outline-none transition-all duration-200 focus:ring-2 focus:ring-[var(--accent)]/30 focus:border-[var(--accent)]"
                  >
                    {CURRENCIES.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Date */}
              <div>
                <label htmlFor="expense_date" className="block text-sm font-medium text-[hsl(var(--foreground))] mb-1.5">
                  <span className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-[hsl(var(--muted-foreground))]" />
                    Date
                  </span>
                </label>
                <input
                  id="expense_date"
                  name="expense_date"
                  type="date"
                  value={form.expense_date}
                  onChange={handleChange}
                  className={`w-full rounded-xl border px-4 py-2.5 text-sm bg-[hsl(var(--background))] text-[hsl(var(--foreground))] outline-none transition-all duration-200 focus:ring-2 focus:ring-[var(--accent)]/30 focus:border-[var(--accent)] ${
                    errors.expense_date ? "border-red-500" : "border-[hsl(var(--border))]"
                  }`}
                />
                {errors.expense_date && (
                  <p className="mt-1.5 text-xs text-red-500 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5" /> {errors.expense_date}
                  </p>
                )}
              </div>

              {/* Notes */}
              <div>
                <label htmlFor="notes" className="block text-sm font-medium text-[hsl(var(--foreground))] mb-1.5">
                  Notes
                  <span className="ml-1.5 text-xs text-[hsl(var(--muted-foreground))] font-normal">(optional)</span>
                </label>
                <textarea
                  id="notes"
                  name="notes"
                  rows={3}
                  value={form.notes}
                  onChange={handleChange}
                  placeholder="Any extra details about this expense..."
                  className="w-full rounded-xl border border-[hsl(var(--border))] px-4 py-2.5 text-sm bg-[hsl(var(--background))] text-[hsl(var(--foreground))] placeholder:text-[hsl(var(--muted-foreground))]/60 outline-none transition-all duration-200 focus:ring-2 focus:ring-[var(--accent)]/30 focus:border-[var(--accent)] resize-none"
                />
              </div>
            </motion.div>

            {/* Preview strip */}
            {form.title && form.amount && parseFloat(form.amount) > 0 && (
              <motion.div
                variants={fadeInUp}
                className="mx-6 mb-4 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-4 py-3 flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <span className="text-xl leading-none">
                    {selectedCategory
                      ? (selectedCategory.icon ?? fallbackIcon)
                      : "📦"}
                  </span>
                  <div>
                    <p className="text-sm font-medium text-[hsl(var(--foreground))] leading-tight">
                      {form.title}
                    </p>
                    <p className="text-xs text-[hsl(var(--muted-foreground))]">
                      {selectedCategory?.name ?? "Uncategorized"} · {form.expense_date}
                    </p>
                  </div>
                </div>
                <span className="text-base font-bold text-[var(--accent)]">
                  {formatCurrency(parseFloat(form.amount) || 0, form.currency)}
                </span>
              </motion.div>
            )}

            {/* Submit */}
            <motion.div variants={fadeInUp} className="px-6 pb-6">
              <motion.button
                type="submit"
                disabled={loading}
                whileHover={{ scale: loading ? 1 : 1.01 }}
                whileTap={{ scale: loading ? 1 : 0.98 }}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-[var(--accent)] px-6 py-3 text-sm font-semibold text-white shadow-[0_2px_12px_rgba(0,0,0,0.15)] hover:opacity-90 disabled:opacity-60 disabled:cursor-not-allowed transition-all duration-200"
              >
                {loading ? (
                  <>
                    <motion.span
                      animate={{ rotate: 360 }}
                      transition={{ repeat: Infinity, duration: 0.8, ease: "linear" }}
                      className="w-4 h-4 rounded-full border-2 border-white border-t-transparent inline-block"
                    />
                    {isEditing ? "Saving..." : "Adding..."}
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    {isEditing ? "Save Changes" : "Add Expense"}
                  </>
                )}
              </motion.button>
            </motion.div>
          </motion.form>
        </Reveal>

        {/* Tips */}
        <Reveal delay={0.1}>
          <div className="mt-6 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))]/50 px-5 py-4">
            <p className="text-xs font-semibold uppercase tracking-widest text-[hsl(var(--muted-foreground))] mb-2">
              Tips
            </p>
            <ul className="space-y-1.5 text-xs text-[hsl(var(--muted-foreground))] leading-relaxed">
              <li className="flex items-start gap-2">
                <span className="mt-0.5 text-[var(--accent)]">•</span>
                Use descriptive titles so you can search and filter expenses easily later.
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-0.5 text-[var(--accent)]">•</span>
                Assign the right category to keep your budget reports accurate.
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-0.5 text-[var(--accent)]">•</span>
                Add notes for receipts, split costs, or reimbursable items.
              </li>
            </ul>
          </div>
        </Reveal>
      </div>

      {/* Delete confirmation modal */}
      {showDeleteConfirm && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4"
          onClick={() => setShowDeleteConfirm(false)}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 16 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6 shadow-[0_8px_40px_rgba(0,0,0,0.2)]"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5 text-red-500" />
              </div>
              <h2 className="text-base font-semibold text-[hsl(var(--foreground))]">Delete Expense</h2>
            </div>
            <p className="text-sm text-[hsl(var(--muted-foreground))] leading-relaxed mb-5">
              This expense will be permanently removed. This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 rounded-xl border border-[hsl(var(--border))] px-4 py-2.5 text-sm font-medium text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted))]/40 transition-colors duration-200"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={loading}
                className="flex-1 rounded-xl bg-red-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-600 disabled:opacity-60 transition-colors duration-200"
              >
                {loading ? "Deleting..." : "Delete"}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </div>
  );
}

export default function AddEditExpensePage() {
  return (
    <Suspense fallback={null}>
      <AddEditExpensePageInner />
    </Suspense>
  );
}
