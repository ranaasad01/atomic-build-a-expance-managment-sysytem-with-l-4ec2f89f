"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowLeft, Save, Trash2, AlertCircle, Check, Calendar, FileText, DollarSign } from 'lucide-react';
import Link from "next/link";
import { Reveal } from "@/components/Reveal";
import { fadeInUp, staggerContainer } from "@/lib/motion";
import { EXPENSE_CATEGORIES } from "@/lib/data";
const formatCurrency: any = (val: number) => val;
const DEFAULT_CURRENCY: string = "USD";
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

      <div className="max-w-2xl mx-auto px-4 sm:px-6 pt-8">
        <Reveal delay={0.05}>
          <h1 className="text-2xl font-bold text-[hsl(var(--foreground))] mb-1">
            {isEditing ? "Edit Expense" : "Add Expense"}
          </h1>
          <p className="text-sm text-[hsl(var(--muted-foreground))] mb-8">
            {isEditing ? "Update the details of your expense." : "Track a new expense."}
          </p>
        </Reveal>

        {submitStatus !== "idle" && (
          <Reveal>
            <div
              className={`mb-6 flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium ${
                submitStatus === "success"
                  ? "bg-emerald-500/10 text-emerald-600 border border-emerald-200"
                  : "bg-red-500/10 text-red-600 border border-red-200"
              }`}
            >
              {submitStatus === "success" ? (
                <Check className="w-4 h-4 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0" />
              )}
              {submitMessage}
            </div>
          </Reveal>
        )}

        <form onSubmit={handleSubmit} noValidate>
          <motion.div
            variants={staggerContainer}
            initial="hidden"
            animate="visible"
            className="space-y-5"
          >
            {/* Title */}
            <motion.div variants={fadeInUp}>
              <label className="block text-sm font-medium text-[hsl(var(--foreground))] mb-1.5">
                <span className="flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5" />
                  Title
                </span>
              </label>
              <input
                type="text"
                name="title"
                value={form.title}
                onChange={handleChange}
                placeholder="e.g. Grocery run"
                className={`w-full rounded-xl border px-4 py-3 text-sm bg-[hsl(var(--card))] text-[hsl(var(--foreground))] placeholder:text-[hsl(var(--muted-foreground))] outline-none transition-colors ${
                  errors.title
                    ? "border-red-400 focus:border-red-500"
                    : "border-[hsl(var(--border))] focus:border-[var(--accent)]"
                }`}
              />
              {errors.title && (
                <p className="mt-1 text-xs text-red-500">{errors.title}</p>
              )}
            </motion.div>

            {/* Amount + Currency */}
            <motion.div variants={fadeInUp}>
              <label className="block text-sm font-medium text-[hsl(var(--foreground))] mb-1.5">
                <span className="flex items-center gap-1.5">
                  <DollarSign className="w-3.5 h-3.5" />
                  Amount
                </span>
              </label>
              <div className="flex gap-2">
                <select
                  name="currency"
                  value={form.currency}
                  onChange={handleChange}
                  className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-3 py-3 text-sm text-[hsl(var(--foreground))] outline-none focus:border-[var(--accent)] transition-colors"
                >
                  {CURRENCIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
                <input
                  type="number"
                  name="amount"
                  value={form.amount}
                  onChange={handleChange}
                  placeholder="0.00"
                  min="0"
                  step="0.01"
                  className={`flex-1 rounded-xl border px-4 py-3 text-sm bg-[hsl(var(--card))] text-[hsl(var(--foreground))] placeholder:text-[hsl(var(--muted-foreground))] outline-none transition-colors ${
                    errors.amount
                      ? "border-red-400 focus:border-red-500"
                      : "border-[hsl(var(--border))] focus:border-[var(--accent)]"
                  }`}
                />
              </div>
              {errors.amount && (
                <p className="mt-1 text-xs text-red-500">{errors.amount}</p>
              )}
            </motion.div>

            {/* Category */}
            <motion.div variants={fadeInUp}>
              <label className="block text-sm font-medium text-[hsl(var(--foreground))] mb-1.5">
                Category
              </label>
              <div className="flex items-center gap-2">
                {form.category_id && (
                  <span className="text-xl">{selectedCategory?.icon ?? fallbackIcon}</span>
                )}
                <select
                  name="category_id"
                  value={form.category_id}
                  onChange={handleChange}
                  className={`flex-1 rounded-xl border px-4 py-3 text-sm bg-[hsl(var(--card))] text-[hsl(var(--foreground))] outline-none transition-colors ${
                    errors.category_id
                      ? "border-red-400 focus:border-red-500"
                      : "border-[hsl(var(--border))] focus:border-[var(--accent)]"
                  }`}
                >
                  <option value="">Select a category</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.icon ? `${cat.icon} ` : ""}{cat.name}
                    </option>
                  ))}
                </select>
              </div>
              {errors.category_id && (
                <p className="mt-1 text-xs text-red-500">{errors.category_id}</p>
              )}
            </motion.div>

            {/* Date */}
            <motion.div variants={fadeInUp}>
              <label className="block text-sm font-medium text-[hsl(var(--foreground))] mb-1.5">
                <span className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5" />
                  Date
                </span>
              </label>
              <input
                type="date"
                name="expense_date"
                value={form.expense_date}
                onChange={handleChange}
                className={`w-full rounded-xl border px-4 py-3 text-sm bg-[hsl(var(--card))] text-[hsl(var(--foreground))] outline-none transition-colors ${
                  errors.expense_date
                    ? "border-red-400 focus:border-red-500"
                    : "border-[hsl(var(--border))] focus:border-[var(--accent)]"
                }`}
              />
              {errors.expense_date && (
                <p className="mt-1 text-xs text-red-500">{errors.expense_date}</p>
              )}
            </motion.div>

            {/* Notes */}
            <motion.div variants={fadeInUp}>
              <label className="block text-sm font-medium text-[hsl(var(--foreground))] mb-1.5">
                Notes <span className="text-[hsl(var(--muted-foreground))] font-normal">(optional)</span>
              </label>
              <textarea
                name="notes"
                value={form.notes}
                onChange={handleChange}
                placeholder="Any additional details..."
                rows={3}
                className="w-full rounded-xl border border-[hsl(var(--border))] px-4 py-3 text-sm bg-[hsl(var(--card))] text-[hsl(var(--foreground))] placeholder:text-[hsl(var(--muted-foreground))] outline-none focus:border-[var(--accent)] transition-colors resize-none"
              />
            </motion.div>

            {/* Submit */}
            <motion.div variants={fadeInUp} className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--accent)] px-6 py-3.5 text-sm font-semibold text-white shadow-sm hover:opacity-90 active:scale-[0.98] transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <Save className="w-4 h-4" />
                {loading ? "Saving..." : isEditing ? "Update Expense" : "Add Expense"}
              </button>
            </motion.div>
          </motion.div>
        </form>

        {/* Delete confirmation */}
        {showDeleteConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="w-full max-w-sm rounded-2xl bg-[hsl(var(--card))] border border-[hsl(var(--border))] p-6 shadow-xl"
            >
              <h3 className="text-lg font-semibold text-[hsl(var(--foreground))] mb-2">Delete Expense?</h3>
              <p className="text-sm text-[hsl(var(--muted-foreground))] mb-6">
                This action cannot be undone. The expense will be permanently removed.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="flex-1 rounded-xl border border-[hsl(var(--border))] px-4 py-2.5 text-sm font-medium text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted))] transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  disabled={loading}
                  className="flex-1 rounded-xl bg-red-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-red-600 transition-colors disabled:opacity-60"
                >
                  {loading ? "Deleting..." : "Delete"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function AddEditExpensePage() {
  return (
    <Suspense>
      <AddEditExpensePageInner />
    </Suspense>
  );
}
