"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { Plus, Trash2, Save, AlertCircle, CheckCircle, Loader } from 'lucide-react';
import { Reveal } from "@/components/Reveal";
import { EXPENSE_CATEGORIES } from "@/lib/data";
type formatCurrency = any;
const formatCurrency: any = [];
type DEFAULT_CURRENCY = any;
const DEFAULT_CURRENCY: any = [];
type BudgetRow = any;
const BudgetRow: any = [];
type CategoryRow = any;
const CategoryRow: any = [];
import { createClient } from "@/lib/supabase/client";
import { fadeInUp, staggerContainer } from "@/lib/motion";

interface BudgetWithCategory extends BudgetRow {
  category: CategoryRow | null;
}

interface LocalBudget {
  category_id: string;
  monthly_limit: string;
  currency: string;
  existing_id?: string;
}

export default function BudgetSettingsPage() {
  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [budgets, setBudgets] = useState<BudgetWithCategory[]>([]);
  const [localBudgets, setLocalBudgets] = useState<LocalBudget[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [totalMonthly, setTotalMonthly] = useState(0);

  const supabase = createClient();

  const showToast = (type: "success" | "error", message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3500);
  };

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const [{ data: cats }, { data: buds }] = await Promise.all([
        supabase.from("categories").select("*").order("name"),
        supabase.from("budgets").select("*, category:categories(*)"),
      ]);

      const catList = (cats ?? []) as CategoryRow[];
      const budList = (buds ?? []) as BudgetWithCategory[];

      setCategories(catList);
      setBudgets(budList);

      // Build local editable state: one row per category
      const mapped: LocalBudget[] = catList.map((cat) => {
        const existing = budList.find((b) => b.category_id === cat.id);
        return {
          category_id: cat.id,
          monthly_limit: existing ? existing.monthly_limit : "",
          currency: existing ? existing.currency : DEFAULT_CURRENCY,
          existing_id: existing?.id,
        };
      });
      setLocalBudgets(mapped);
    } catch {
      showToast("error", "Failed to load budget data.");
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    const total = localBudgets.reduce((sum, b) => {
      const val = parseFloat(b.monthly_limit);
      return sum + (isNaN(val) ? 0 : val);
    }, 0);
    setTotalMonthly(total);
  }, [localBudgets]);

  const updateLimit = (category_id: string, value: string) => {
    setLocalBudgets((prev) =>
      prev.map((b) => (b.category_id === category_id ? { ...b, monthly_limit: value } : b))
    );
  };

  const clearLimit = (category_id: string) => {
    setLocalBudgets((prev) =>
      prev.map((b) => (b.category_id === category_id ? { ...b, monthly_limit: "" } : b))
    );
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const upserts = localBudgets
        .filter((b) => b.monthly_limit !== "" && parseFloat(b.monthly_limit) > 0)
        .map((b) => ({
          ...(b.existing_id ? { id: b.existing_id } : {}),
          user_id: user.id,
          category_id: b.category_id,
          monthly_limit: parseFloat(b.monthly_limit),
          currency: b.currency,
          updated_at: new Date().toISOString(),
        }));

      const deletes = localBudgets
        .filter((b) => (b.monthly_limit === "" || parseFloat(b.monthly_limit) <= 0) && b.existing_id)
        .map((b) => b.existing_id as string);

      const ops: Promise<unknown>[] = [];

      if (upserts.length > 0) {
        ops.push(
          supabase.from("budgets").upsert(upserts, { onConflict: "id" }).then() as Promise<unknown>
        );
      }

      if (deletes.length > 0) {
        ops.push(
          supabase.from("budgets").delete().in("id", deletes).then() as Promise<unknown>
        );
      }

      await Promise.all(ops);
      showToast("success", "Budget limits saved successfully.");
      await fetchData();
    } catch {
      showToast("error", "Failed to save budgets. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const getCategoryMeta = (categoryId: string) => {
    const cat = categories.find((c) => c.id === categoryId);
    const fallback = EXPENSE_CATEGORIES.find((e) =>
      cat?.name?.toLowerCase().includes(e.name.toLowerCase().split(" ")[0])
    );
    return {
      icon: cat?.icon ?? fallback?.icon ?? "📦",
      color: cat?.color ?? fallback?.color ?? "#94A3B8",
      name: cat?.name ?? "Unknown",
    };
  };

  const setBudgetForCategory = budgets.reduce<Record<string, BudgetWithCategory>>((acc, b) => {
    acc[b.category_id] = b;
    return acc;
  }, {});

  const activeBudgetCount = localBudgets.filter(
    (b) => b.monthly_limit !== "" && parseFloat(b.monthly_limit) > 0
  ).length;

  return (
    <div className="min-h-screen bg-[hsl(var(--background))] pb-24">
      {/* Toast */}
      {toast && (
        <motion.div
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -16 }}
          className={`fixed top-6 right-6 z-50 flex items-center gap-3 rounded-xl px-5 py-3 shadow-lg text-sm font-medium ${
            toast.type === "success"
              ? "bg-emerald-500 text-white"
              : "bg-red-500 text-white"
          }`}
        >
          {toast.type === "success" ? (
            <CheckCircle className="h-4 w-4 shrink-0" />
          ) : (
            <AlertCircle className="h-4 w-4 shrink-0" />
          )}
          {toast.message}
        </motion.div>
      )}

      <div className="mx-auto max-w-3xl px-4 pt-10 sm:px-6 lg:px-8">
        {/* Header */}
        <Reveal>
          <div className="mb-10">
            <h1 className="text-3xl font-bold tracking-tight text-[hsl(var(--foreground))]">
              Budget Settings
            </h1>
            <p className="mt-2 text-[hsl(var(--muted-foreground))]">
              Set monthly spending limits per category. Leave a field blank to remove that budget.
            </p>
          </div>
        </Reveal>

        {/* Summary Cards */}
        <Reveal delay={0.05}>
          <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-3">
            <div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-5 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_8px_24px_-8px_rgba(0,0,0,0.08)]">
              <p className="text-xs font-medium uppercase tracking-wide text-[hsl(var(--muted-foreground))]">
                Total Monthly Budget
              </p>
              <p className="mt-2 text-2xl font-bold text-[var(--accent)]">
                {formatCurrency(totalMonthly)}
              </p>
            </div>
            <div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-5 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_8px_24px_-8px_rgba(0,0,0,0.08)]">
              <p className="text-xs font-medium uppercase tracking-wide text-[hsl(var(--muted-foreground))]">
                Active Budgets
              </p>
              <p className="mt-2 text-2xl font-bold text-[hsl(var(--foreground))]">
                {activeBudgetCount}
              </p>
            </div>
            <div className="col-span-2 sm:col-span-1 rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-5 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_8px_24px_-8px_rgba(0,0,0,0.08)]">
              <p className="text-xs font-medium uppercase tracking-wide text-[hsl(var(--muted-foreground))]">
                Categories Available
              </p>
              <p className="mt-2 text-2xl font-bold text-[hsl(var(--foreground))]">
                {categories.length}
              </p>
            </div>
          </div>
        </Reveal>

        {/* Budget Form */}
        {loading ? (
          <Reveal>
            <div className="flex flex-col items-center justify-center py-24 gap-4">
              <Loader className="h-8 w-8 animate-spin text-[var(--accent)]" />
              <p className="text-sm text-[hsl(var(--muted-foreground))]">Loading your budgets…</p>
            </div>
          </Reveal>
        ) : (
          <Reveal delay={0.1}>
            <div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] shadow-[0_1px_2px_rgba(0,0,0,0.04),0_8px_24px_-8px_rgba(0,0,0,0.10)] overflow-hidden">
              <div className="border-b border-[hsl(var(--border))] px-6 py-4">
                <h2 className="text-base font-semibold text-[hsl(var(--foreground))]">
                  Monthly Limits by Category
                </h2>
                <p className="text-xs text-[hsl(var(--muted-foreground))] mt-0.5">
                  Enter a limit in {DEFAULT_CURRENCY} for each category you want to track.
                </p>
              </div>

              <motion.ul
                variants={staggerContainer}
                initial="hidden"
                animate="visible"
                className="divide-y divide-[hsl(var(--border))]"
              >
                {localBudgets.map((budget, i) => {
                  const meta = getCategoryMeta(budget.category_id);
                  const existing = setBudgetForCategory[budget.category_id];
                  const hasValue = budget.monthly_limit !== "" && parseFloat(budget.monthly_limit) > 0;
                  const isNew = hasValue && !existing;
                  const isModified =
                    hasValue && existing && existing.monthly_limit !== budget.monthly_limit;
                  const isCleared = !hasValue && !!existing;

                  return (
                    <motion.li
                      key={budget.category_id}
                      variants={fadeInUp}
                      className="flex items-center gap-4 px-6 py-4 hover:bg-[hsl(var(--muted))]/30 transition-colors duration-150"
                    >
                      {/* Icon */}
                      <div
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-lg"
                        style={{ backgroundColor: meta.color + "22" }}
                      >
                        {meta.icon}
                      </div>

                      {/* Name + status */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-[hsl(var(--foreground))] truncate">
                          {meta.name}
                        </p>
                        <p className="text-xs text-[hsl(var(--muted-foreground))]">
                          {isNew && (
                            <span className="text-emerald-500 font-medium">New budget</span>
                          )}
                          {isModified && (
                            <span className="text-amber-500 font-medium">Modified</span>
                          )}
                          {isCleared && (
                            <span className="text-red-400 font-medium">Will be removed</span>
                          )}
                          {!isNew && !isModified && !isCleared && existing && (
                            <span>Current: {formatCurrency(existing.monthly_limit)}</span>
                          )}
                          {!isNew && !isModified && !isCleared && !existing && (
                            <span>No limit set</span>
                          )}
                        </p>
                      </div>

                      {/* Input */}
                      <div className="flex items-center gap-2 shrink-0">
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-[hsl(var(--muted-foreground))]">
                            $
                          </span>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            placeholder="0.00"
                            value={budget.monthly_limit}
                            onChange={(e) => updateLimit(budget.category_id, e.target.value)}
                            className="w-28 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--background))] pl-7 pr-3 py-2 text-sm text-[hsl(var(--foreground))] placeholder:text-[hsl(var(--muted-foreground))] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/40 focus:border-[var(--accent)] transition-all duration-200"
                          />
                        </div>
                        {hasValue && (
                          <motion.button
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => clearLimit(budget.category_id)}
                            className="flex h-8 w-8 items-center justify-center rounded-lg text-[hsl(var(--muted-foreground))] hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors duration-150"
                            title="Clear limit"
                          >
                            <Trash2 className="h-4 w-4" />
                          </motion.button>
                        )}
                      </div>
                    </motion.li>
                  );
                })}
              </motion.ul>

              {localBudgets.length === 0 && (
                <div className="flex flex-col items-center justify-center py-16 gap-3">
                  <div className="text-4xl">📊</div>
                  <p className="text-sm text-[hsl(var(--muted-foreground))]">
                    No categories found. Add categories first.
                  </p>
                </div>
              )}
            </div>
          </Reveal>
        )}

        {/* Tips */}
        <Reveal delay={0.15}>
          <div className="mt-6 rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))]/60 p-5">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--accent)]/15 text-[var(--accent)]">
                <AlertCircle className="h-3.5 w-3.5" />
              </div>
              <div>
                <p className="text-sm font-medium text-[hsl(var(--foreground))]">Budget tips</p>
                <ul className="mt-1.5 space-y-1 text-xs text-[hsl(var(--muted-foreground))]">
                  <li>Budgets reset at the start of each calendar month.</li>
                  <li>You will see a warning on the dashboard when you reach 80% of a limit.</li>
                  <li>Leave a field blank or set it to zero to remove that category budget.</li>
                </ul>
              </div>
            </div>
          </div>
        </Reveal>

        {/* Save Button */}
        <Reveal delay={0.2}>
          <div className="mt-8 flex justify-end">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleSave}
              disabled={saving || loading}
              className="flex items-center gap-2 rounded-xl bg-[var(--accent)] px-7 py-3 text-sm font-semibold text-white shadow-[0_2px_8px_rgba(0,0,0,0.15)] hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]/50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
            >
              {saving ? (
                <>
                  <Loader className="h-4 w-4 animate-spin" />
                  Saving…
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  Save Budgets
                </>
              )}
            </motion.button>
          </div>
        </Reveal>
      </div>
    </div>
  );
}