"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, type Variants } from "framer-motion";
import { createClient } from "@/lib/supabase/client";
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
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
} from "recharts";
import { Plus, Edit, Trash2, Check, X, AlertCircle, Target } from 'lucide-react';

// ─── Motion variants ────────────────────────────────────────────────────────
const cardVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.45, ease: "easeOut" } },
};

const stagger: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.07, delayChildren: 0.05 } },
};

// ─── Types ───────────────────────────────────────────────────────────────────
interface BudgetWithCategory extends BudgetRow {
  category: CategoryRow | null;
  spent: number;
}

interface EditingBudget {
  category_id: string;
  monthly_limit: string;
  currency: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function pct(spent: number, limit: number): number {
  if (limit <= 0) return 0;
  return Math.min(100, Math.round((spent / limit) * 100));
}

function statusColor(p: number): string {
  if (p >= 100) return "#EF4444";
  if (p >= 80) return "#F59E0B";
  return "#10B981";
}

// ─── Page ────────────────────────────────────────────────────────────────────
export default function BudgetPage() {
  const supabase = createClient();

  const [budgets, setBudgets] = useState<BudgetWithCategory[]>([]);
  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<EditingBudget>({
    category_id: "",
    monthly_limit: "",
    currency: DEFAULT_CURRENCY,
  });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // ── Fetch data ──────────────────────────────────────────────────────────
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setError("Not authenticated."); setLoading(false); return; }

      const [{ data: cats }, { data: buds }, { data: exps }] = await Promise.all([
        supabase.from("categories").select("*").order("name"),
        supabase.from("budgets").select("*"),
        supabase.from("expenses").select("amount, category_id, expense_date"),
      ]);

      const catList: CategoryRow[] = cats ?? [];
      setCategories(catList);

      // Compute current-month spending per category
      const now = new Date();
      const monthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
      const spentMap: Record<string, number> = {};
      for (const exp of exps ?? []) {
        if ((exp.expense_date as string).startsWith(monthStr)) {
          spentMap[exp.category_id] = (spentMap[exp.category_id] ?? 0) + parseFloat(exp.amount as string);
        }
      }

      const enriched: BudgetWithCategory[] = (buds ?? []).map((b) => ({
        ...(b as BudgetRow),
        category: catList.find((c) => c.id === b.category_id) ?? null,
        spent: spentMap[b.category_id] ?? 0,
      }));

      setBudgets(enriched);
    } catch (e) {
      setError("Failed to load budget data.");
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ── Realtime subscription ───────────────────────────────────────────────
  useEffect(() => {
    const channel = supabase
      .channel("budget-expenses-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "expenses" }, () => { fetchData(); })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [supabase, fetchData]);

  // ── Form helpers ────────────────────────────────────────────────────────
  function openAdd() {
    setEditingId(null);
    setForm({ category_id: categories[0]?.id ?? "", monthly_limit: "", currency: DEFAULT_CURRENCY });
    setFormError(null);
    setShowForm(true);
  }

  function openEdit(b: BudgetWithCategory) {
    setEditingId(b.id);
    setForm({ category_id: b.category_id, monthly_limit: b.monthly_limit, currency: b.currency });
    setFormError(null);
    setShowForm(true);
  }

  function closeForm() {
    setShowForm(false);
    setEditingId(null);
    setFormError(null);
  }

  async function handleSave() {
    if (!form.category_id) { setFormError("Please select a category."); return; }
    const limit = parseFloat(form.monthly_limit);
    if (isNaN(limit) || limit <= 0) { setFormError("Enter a valid monthly limit greater than 0."); return; }

    setSaving(true);
    setFormError(null);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setFormError("Not authenticated."); setSaving(false); return; }

      if (editingId) {
        const { error: err } = await supabase
          .from("budgets")
          .update({ category_id: form.category_id, monthly_limit: String(limit), currency: form.currency, updated_at: new Date().toISOString() })
          .eq("id", editingId);
        if (err) throw err;
      } else {
        const { error: err } = await supabase
          .from("budgets")
          .insert({ user_id: user.id, category_id: form.category_id, monthly_limit: String(limit), currency: form.currency });
        if (err) throw err;
      }
      closeForm();
      await fetchData();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to save budget.";
      setFormError(msg);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this budget?")) return;
    const { error: err } = await supabase.from("budgets").delete().eq("id", id);
    if (err) { alert("Failed to delete budget."); return; }
    await fetchData();
  }

  // ── Derived chart data ──────────────────────────────────────────────────
  const totalBudget = budgets.reduce((s, b) => s + parseFloat(b.monthly_limit), 0);
  const totalSpent = budgets.reduce((s, b) => s + b.spent, 0);
  const totalRemaining = Math.max(0, totalBudget - totalSpent);

  const pieData = budgets.map((b) => ({
    name: b.category?.name ?? "Unknown",
    value: parseFloat(b.monthly_limit),
    color: b.category?.color ?? "#94A3B8",
  }));

  const barData = budgets.map((b) => ({
    name: b.category?.name ?? "Unknown",
    Budget: parseFloat(b.monthly_limit),
    Spent: b.spent,
  }));

  // ── Used category ids (to avoid duplicate budgets) ──────────────────────
  const usedCategoryIds = new Set(budgets.map((b) => b.category_id));
  const availableCategories = editingId
    ? categories
    : categories.filter((c) => !usedCategoryIds.has(c.id));

  // ── Render ──────────────────────────────────────────────────────────────
  return (
    <main className="min-h-screen bg-[hsl(var(--background))] pb-20">
      {/* ── Header ── */}
      <Reveal>
        <section className="border-b border-[hsl(var(--border))] bg-[hsl(var(--card))] px-4 py-10 md:px-8">
          <div className="mx-auto max-w-6xl">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h1 className="text-3xl font-bold tracking-tight text-[hsl(var(--foreground))]">
                  Budget Settings
                </h1>
                <p className="mt-1 text-[hsl(var(--muted-foreground))]">
                  Set monthly spending limits per category and track your progress in real time.
                </p>
              </div>
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={openAdd}
                disabled={availableCategories.length === 0}
                className="flex items-center gap-2 rounded-xl bg-[var(--accent)] px-5 py-2.5 text-sm font-semibold text-white shadow-[0_2px_12px_rgba(0,0,0,0.15)] transition-all duration-200 hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Plus className="h-4 w-4" />
                Add Budget
              </motion.button>
            </div>
          </div>
        </section>
      </Reveal>

      <div className="mx-auto max-w-6xl px-4 py-10 md:px-8 space-y-10">

        {/* ── Error ── */}
        {error && (
          <Reveal>
            <div className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-red-700">
              <AlertCircle className="h-5 w-5 shrink-0" />
              <span className="text-sm">{error}</span>
            </div>
          </Reveal>
        )}

        {/* ── Loading ── */}
        {loading && (
          <Reveal>
            <div className="flex items-center justify-center py-24">
              <div className="h-10 w-10 animate-spin rounded-full border-4 border-[var(--accent)] border-t-transparent" />
            </div>
          </Reveal>
        )}

        {!loading && !error && (
          <>
            {/* ── Summary cards ── */}
            <Reveal>
              <motion.div
                variants={stagger}
                initial="hidden"
                animate="visible"
                className="grid grid-cols-1 gap-4 sm:grid-cols-3"
              >
                {[
                  { label: "Total Budget", value: formatCurrency(totalBudget), icon: "🎯", accent: false },
                  { label: "Total Spent", value: formatCurrency(totalSpent), icon: "💸", accent: totalSpent > totalBudget },
                  { label: "Remaining", value: formatCurrency(totalRemaining), icon: "✅", accent: false },
                ].map((s) => (
                  <motion.div
                    key={s.label}
                    variants={cardVariants}
                    className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_8px_24px_-8px_rgba(0,0,0,0.08)]"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{s.icon}</span>
                      <div>
                        <p className="text-xs font-medium uppercase tracking-wide text-[hsl(var(--muted-foreground))]">{s.label}</p>
                        <p className={`mt-0.5 text-2xl font-bold ${s.accent ? "text-red-500" : "text-[hsl(var(--foreground))]"}`}>
                          {s.value}
                        </p>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </motion.div>
            </Reveal>

            {/* ── Charts ── */}
            {budgets.length > 0 && (
              <Reveal>
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                  {/* Pie */}
                  <div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_8px_24px_-8px_rgba(0,0,0,0.08)]">
                    <h2 className="mb-4 text-base font-semibold text-[hsl(var(--foreground))]">Budget Allocation</h2>
                    <ResponsiveContainer width="100%" height={220}>
                      <PieChart>
                        <Pie
                          data={pieData}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={90}
                          paddingAngle={3}
                          dataKey="value"
                        >
                          {pieData.map((entry, i) => (
                            <Cell key={`cell-${i}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip
                          formatter={(v: number) => formatCurrency(v)}
                          contentStyle={{ borderRadius: "12px", border: "1px solid hsl(var(--border))", background: "hsl(var(--card))", color: "hsl(var(--foreground))" }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {pieData.map((d) => (
                        <span key={d.name} className="flex items-center gap-1.5 rounded-full border border-[hsl(var(--border))] px-2.5 py-0.5 text-xs text-[hsl(var(--foreground))]">
                          <span className="h-2 w-2 rounded-full" style={{ background: d.color }} />
                          {d.name}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Bar */}
                  <div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_8px_24px_-8px_rgba(0,0,0,0.08)]">
                    <h2 className="mb-4 text-base font-semibold text-[hsl(var(--foreground))]">Budget vs. Spent</h2>
                    <ResponsiveContainer width="100%" height={220}>
                      <BarChart data={barData} barCategoryGap="30%">
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis dataKey="name" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                        <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} tickFormatter={(v) => `$${v}`} />
                        <Tooltip
                          formatter={(v: number) => formatCurrency(v)}
                          contentStyle={{ borderRadius: "12px", border: "1px solid hsl(var(--border))", background: "hsl(var(--card))", color: "hsl(var(--foreground))" }}
                        />
                        <Legend wrapperStyle={{ fontSize: 12 }} />
                        <Bar dataKey="Budget" fill="var(--accent)" radius={[6, 6, 0, 0]} />
                        <Bar dataKey="Spent" fill="#F59E0B" radius={[6, 6, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </Reveal>
            )}

            {/* ── Budget cards ── */}
            {budgets.length === 0 ? (
              <Reveal>
                <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[hsl(var(--border))] bg-[hsl(var(--card))] py-20 text-center">
                  <Target className="mb-4 h-12 w-12 text-[hsl(var(--muted-foreground))]" />
                  <h3 className="text-lg font-semibold text-[hsl(var(--foreground))]">No budgets yet</h3>
                  <p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">
                    Add your first monthly budget to start tracking spending limits.
                  </p>
                  <button
                    onClick={openAdd}
                    className="mt-6 flex items-center gap-2 rounded-xl bg-[var(--accent)] px-5 py-2.5 text-sm font-semibold text-white hover:opacity-90 transition-opacity"
                  >
                    <Plus className="h-4 w-4" /> Add Budget
                  </button>
                </div>
              </Reveal>
            ) : (
              <Reveal>
                <h2 className="mb-4 text-lg font-semibold text-[hsl(var(--foreground))]">Monthly Budgets</h2>
                <motion.div
                  variants={stagger}
                  initial="hidden"
                  animate="visible"
                  className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3"
                >
                  {budgets.map((b) => {
                    const limit = parseFloat(b.monthly_limit);
                    const p = pct(b.spent, limit);
                    const sc = statusColor(p);
                    return (
                      <motion.div
                        key={b.id}
                        variants={cardVariants}
                        whileHover={{ y: -3, transition: { duration: 0.2 } }}
                        className="group relative rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-5 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_8px_24px_-8px_rgba(0,0,0,0.08)] transition-shadow hover:shadow-[0_4px_24px_-4px_rgba(0,0,0,0.14)]"
                      >
                        {/* Category header */}
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-2.5">
                            <span
                              className="flex h-9 w-9 items-center justify-center rounded-xl text-lg"
                              style={{ background: (b.category?.color ?? "#94A3B8") + "22" }}
                            >
                              {b.category?.icon ?? "📦"}
                            </span>
                            <div>
                              <p className="font-semibold text-[hsl(var(--foreground))]">
                                {b.category?.name ?? "Unknown"}
                              </p>
                              <p className="text-xs text-[hsl(var(--muted-foreground))]">
                                {formatCurrency(b.spent)} of {formatCurrency(limit)}
                              </p>
                            </div>
                          </div>
                          {/* Actions */}
                          <div className="flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                            <button
                              onClick={() => openEdit(b)}
                              className="rounded-lg p-1.5 text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))] hover:text-[hsl(var(--foreground))] transition-colors"
                            >
                              <Edit className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => handleDelete(b.id)}
                              className="rounded-lg p-1.5 text-[hsl(var(--muted-foreground))] hover:bg-red-50 hover:text-red-500 transition-colors"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* Progress bar */}
                        <div className="mt-4">
                          <div className="mb-1.5 flex items-center justify-between text-xs">
                            <span className="text-[hsl(var(--muted-foreground))]">{p}% used</span>
                            <span style={{ color: sc }} className="font-medium">
                              {p >= 100 ? "Over budget" : p >= 80 ? "Near limit" : "On track"}
                            </span>
                          </div>
                          <div className="h-2 w-full overflow-hidden rounded-full bg-[hsl(var(--muted))]">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${p}%` }}
                              transition={{ duration: 0.7, ease: "easeOut" }}
                              className="h-full rounded-full"
                              style={{ background: sc }}
                            />
                          </div>
                        </div>

                        {/* Remaining */}
                        <div className="mt-3 flex items-center justify-between rounded-xl bg-[hsl(var(--muted))]/50 px-3 py-2">
                          <span className="text-xs text-[hsl(var(--muted-foreground))]">Remaining</span>
                          <span className={`text-sm font-semibold ${b.spent > limit ? "text-red-500" : "text-[hsl(var(--foreground))]"}`}>
                            {b.spent > limit ? `-${formatCurrency(b.spent - limit)}` : formatCurrency(limit - b.spent)}
                          </span>
                        </div>
                      </motion.div>
                    );
                  })}
                </motion.div>
              </Reveal>
            )}
          </>
        )}
      </div>

      {/* ── Add / Edit Modal ── */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={closeForm}
          />

          {/* Panel */}
          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 16 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="relative z-10 w-full max-w-md rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6 shadow-[0_8px_40px_-8px_rgba(0,0,0,0.25)]"
          >
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-[hsl(var(--foreground))]">
                {editingId ? "Edit Budget" : "Add Budget"}
              </h2>
              <button
                onClick={closeForm}
                className="rounded-lg p-1.5 text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))] transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Category */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-[hsl(var(--foreground))]">
                  Category
                </label>
                <select
                  value={form.category_id}
                  onChange={(e) => setForm((f) => ({ ...f, category_id: e.target.value }))}
                  className="w-full rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-3 py-2.5 text-sm text-[hsl(var(--foreground))] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/40"
                >
                  <option value="">Select a category</option>
                  {availableCategories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.icon ? `${c.icon} ` : ""}{c.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Monthly limit */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-[hsl(var(--foreground))]">
                  Monthly Limit
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-[hsl(var(--muted-foreground))]">$</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.monthly_limit}
                    onChange={(e) => setForm((f) => ({ ...f, monthly_limit: e.target.value }))}
                    placeholder="0.00"
                    className="w-full rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] py-2.5 pl-7 pr-3 text-sm text-[hsl(var(--foreground))] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/40"
                  />
                </div>
              </div>

              {/* Currency */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-[hsl(var(--foreground))]">
                  Currency
                </label>
                <select
                  value={form.currency}
                  onChange={(e) => setForm((f) => ({ ...f, currency: e.target.value }))}
                  className="w-full rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-3 py-2.5 text-sm text-[hsl(var(--foreground))] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/40"
                >
                  <option value="USD">USD — US Dollar</option>
                  <option value="EUR">EUR — Euro</option>
                  <option value="GBP">GBP — British Pound</option>
                  <option value="CAD">CAD — Canadian Dollar</option>
                  <option value="AUD">AUD — Australian Dollar</option>
                  <option value="JPY">JPY — Japanese Yen</option>
                </select>
              </div>

              {/* Form error */}
              {formError && (
                <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-600">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  {formError}
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3 pt-1">
                <button
                  onClick={closeForm}
                  className="flex-1 rounded-xl border border-[hsl(var(--border))] px-4 py-2.5 text-sm font-medium text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted))] transition-colors"
                >
                  Cancel
                </button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={handleSave}
                  disabled={saving}
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[var(--accent)] px-4 py-2.5 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60 transition-opacity"
                >
                  {saving ? (
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  ) : (
                    <Check className="h-4 w-4" />
                  )}
                  {saving ? "Saving..." : editingId ? "Save Changes" : "Add Budget"}
                </motion.button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </main>
  );
}