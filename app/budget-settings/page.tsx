"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { Plus, Trash2, Save, AlertCircle, CheckCircle, Loader } from 'lucide-react';
import { Reveal } from "@/components/Reveal";
import { EXPENSE_CATEGORIES } from "@/lib/data";
const formatCurrency: any = (val: number) => val;
const DEFAULT_CURRENCY: string = "USD";
type BudgetRow = any;
type CategoryRow = any;
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
          Promise.resolve(supabase.from("budgets").upsert(upserts, { onConflict: "id" }).then())
        );
      }

      if (deletes.length > 0) {
        ops.push(
          Promise.resolve(supabase.from("budgets").delete().in("id", deletes).then())
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
      cat?.name?.toLowerCase().includes(e.key ?? "")
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
                Categories
              </p>
              <p className="mt-2 text-2xl font-bold text-[hsl(var(--foreground))]">
                {categories.length}
              </p>
            </div>
          </div>
        </Reveal>
      </div>
    </div>
  );
}
