"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Reveal } from "@/components/Reveal";
import { fadeInUp, staggerContainer } from "@/lib/motion";
import { EXPENSE_CATEGORIES, CURRENCIES } from "@/lib/data";
import { createClient } from "@/lib/supabase/client";
import { Save, Settings, AlertCircle, Check } from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface BudgetEntry {
  category_id: string;
  monthly_limit: string;
  currency: string;
}

interface Toast {
  message: string;
  type: "success" | "error";
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatCurrency(amount: number, currency = "USD"): string {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount ?? 0);
  } catch {
    return `$${(amount ?? 0).toFixed(0)}`;
  }
}

function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function BudgetSettingsPage() {
  const [budgets, setBudgets] = useState<Record<string, BudgetEntry>>(() => {
    const initial: Record<string, BudgetEntry> = {};
    EXPENSE_CATEGORIES.forEach((cat) => {
      const id = slugify(cat.name);
      initial[id] = { category_id: id, monthly_limit: "", currency: "USD" };
    });
    return initial;
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<Toast | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  // ── Show toast ──────────────────────────────────────────────────────────────
  function showToast(message: string, type: "success" | "error") {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  }

  // ── Fetch existing budgets on mount ─────────────────────────────────────────
  useEffect(() => {
    async function fetchBudgets() {
      setLoading(true);
      try {
        const supabase = createClient();

        const { data: userData, error: userError } = await supabase.auth.getUser();
        if (userError || !userData.user) {
          setLoading(false);
          return;
        }
        setUserId(userData.user.id);

        const { data, error } = await supabase
          .from("budgets")
          .select("category_id, monthly_limit, currency")
          .eq("user_id", userData.user.id);

        if (error) {
          console.error("Error fetching budgets:", error.message);
          setLoading(false);
          return;
        }

        if (data && data.length > 0) {
          setBudgets((prev) => {
            const updated = { ...prev };
            data.forEach((row) => {
              if (updated[row.category_id]) {
                updated[row.category_id] = {
                  category_id: row.category_id,
                  monthly_limit: row.monthly_limit?.toString() ?? "",
                  currency: row.currency ?? "USD",
                };
              }
            });
            return updated;
          });
        }
      } catch (err) {
        console.error("Unexpected error fetching budgets:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchBudgets();
  }, []);

  // ── Handle field change ─────────────────────────────────────────────────────
  function handleLimitChange(categoryId: string, value: string) {
    setBudgets((prev) => ({
      ...prev,
      [categoryId]: { ...prev[categoryId], monthly_limit: value },
    }));
  }

  function handleCurrencyChange(categoryId: string, value: string) {
    setBudgets((prev) => ({
      ...prev,
      [categoryId]: { ...prev[categoryId], currency: value },
    }));
  }

  // ── Save all budgets ────────────────────────────────────────────────────────
  async function handleSave() {
    if (!userId) {
      showToast("You must be signed in to save budgets.", "error");
      return;
    }

    setSaving(true);
    try {
      const supabase = createClient();

      const rows = Object.values(budgets)
        .filter((b) => b.monthly_limit !== "" && !isNaN(parseFloat(b.monthly_limit)))
        .map((b) => ({
          user_id: userId,
          category_id: b.category_id,
          monthly_limit: parseFloat(b.monthly_limit),
          currency: b.currency,
          updated_at: new Date().toISOString(),
        }));

      if (rows.length === 0) {
        showToast("Enter at least one budget limit before saving.", "error");
        setSaving(false);
        return;
      }

      const { error } = await supabase
        .from("budgets")
        .upsert(rows, { onConflict: "user_id,category_id" });

      if (error) {
        showToast(error.message || "Failed to save budgets.", "error");
      } else {
        showToast("Budget limits saved successfully!", "success");
      }
    } catch (err) {
      showToast("An unexpected error occurred. Please try again.", "error");
    } finally {
      setSaving(false);
    }
  }

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <main
      className="min-h-screen pt-24 pb-16 px-4 sm:px-6 lg:px-8 mesh-bg"
      style={{ background: "var(--background)" }}
    >
      {/* Toast */}
      {toast && (
        <motion.div
          initial={{ opacity: 0, y: -20, x: "-50%" }}
          animate={{ opacity: 1, y: 0, x: "-50%" }}
          exit={{ opacity: 0, y: -20, x: "-50%" }}
          className={`fixed top-6 left-1/2 z-50 flex items-center gap-2.5 px-5 py-3 rounded-xl text-sm font-medium shadow-lg border ${
            toast.type === "error"
              ? "bg-red-950/90 border-red-800/60 text-red-200"
              : "bg-emerald-950/90 border-emerald-800/60 text-emerald-200"
          }`}
        >
          {toast.type === "error" ? (
            <AlertCircle className="w-4 h-4 shrink-0" />
          ) : (
            <Check className="w-4 h-4 shrink-0" />
          )}
          {toast.message}
        </motion.div>
      )}

      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <Reveal>
          <div className="mb-10">
            <div className="flex items-center gap-3 mb-2">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{
                  background: "rgba(99,102,241,0.15)",
                  border: "1px solid rgba(99,102,241,0.3)",
                }}
              >
                <Settings className="w-5 h-5" style={{ color: "var(--primary)" }} />
              </div>
              <div>
                <h1
                  className="text-2xl font-bold tracking-tight"
                  style={{ color: "var(--foreground)" }}
                >
                  Budget Settings
                </h1>
                <p className="text-sm" style={{ color: "var(--muted-foreground)" }}>
                  Set monthly spending limits for each category.
                </p>
              </div>
            </div>
          </div>
        </Reveal>

        {/* Loading skeleton */}
        {loading ? (
          <div className="space-y-4">
            {EXPENSE_CATEGORIES.map((cat) => (
              <div
                key={cat.name}
                className="h-24 rounded-2xl animate-pulse"
                style={{ background: "var(--card)", border: "1px solid var(--border)" }}
              />
            ))}
          </div>
        ) : (
          <motion.div
            variants={staggerContainer}
            initial="hidden"
            animate="visible"
            className="space-y-4"
          >
            {EXPENSE_CATEGORIES.map((cat) => {
              const id = slugify(cat.name);
              const entry = budgets[id];
              const limitNum = parseFloat(entry?.monthly_limit || "0");
              const hasLimit = entry?.monthly_limit !== "" && !isNaN(limitNum) && limitNum > 0;

              return (
                <motion.div
                  key={id}
                  variants={fadeInUp}
                  className="rounded-2xl p-5 transition-all duration-200"
                  style={{
                    background: "var(--card)",
                    border: "1px solid var(--border)",
                    boxShadow:
                      "0 1px 2px rgba(0,0,0,0.08), 0 8px 24px -8px rgba(0,0,0,0.2)",
                  }}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                    {/* Category info */}
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0"
                        style={{
                          background: cat.color + "22",
                          border: `1px solid ${cat.color}44`,
                        }}
                      >
                        {cat.icon}
                      </div>
                      <div className="min-w-0">
                        <p
                          className="font-semibold text-sm"
                          style={{ color: "var(--foreground)" }}
                        >
                          {cat.name}
                        </p>
                        {hasLimit ? (
                          <p className="text-xs" style={{ color: cat.color }}>
                            Limit: {formatCurrency(limitNum, entry?.currency ?? "USD")}
                          </p>
                        ) : (
                          <p className="text-xs" style={{ color: "var(--muted-foreground)" }}>
                            No limit set
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Inputs */}
                    <div className="flex items-center gap-3 flex-shrink-0">
                      {/* Currency selector */}
                      <div className="relative">
                        <select
                          value={entry?.currency ?? "USD"}
                          onChange={(e) => handleCurrencyChange(id, e.target.value)}
                          className="appearance-none rounded-xl px-3 py-2.5 text-sm font-medium pr-8 focus:outline-none focus:ring-1 transition-colors duration-200"
                          style={{
                            background: "rgba(255,255,255,0.04)",
                            border: "1px solid var(--border)",
                            color: "var(--foreground)",
                          }}
                          aria-label={`Currency for ${cat.name}`}
                        >
                          {CURRENCIES.map((c) => (
                            <option
                              key={c.code}
                              value={c.code}
                              style={{ background: "#1A1A2E" }}
                            >
                              {c.code} {c.symbol}
                            </option>
                          ))}
                        </select>
                        <div
                          className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-xs"
                          style={{ color: "var(--muted-foreground)" }}
                        >
                          ▾
                        </div>
                      </div>

                      {/* Monthly limit input */}
                      <div className="relative">
                        <span
                          className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-medium"
                          style={{ color: "var(--muted-foreground)" }}
                        >
                          {
                            CURRENCIES.find((c) => c.code === (entry?.currency ?? "USD"))
                              ?.symbol ?? "$"
                          }
                        </span>
                        <input
                          type="number"
                          min="0"
                          step="1"
                          placeholder="0"
                          value={entry?.monthly_limit ?? ""}
                          onChange={(e) => handleLimitChange(id, e.target.value)}
                          className="w-36 rounded-xl pl-7 pr-4 py-2.5 text-sm focus:outline-none focus:ring-1 transition-colors duration-200"
                          style={{
                            background: "rgba(255,255,255,0.04)",
                            border: `1px solid ${
                              hasLimit ? "var(--primary)" : "var(--border)"
                            }`,
                            color: "var(--foreground)",
                            // @ts-expect-error -- ring color via CSS var
                            "--tw-ring-color": "var(--primary)",
                          }}
                          aria-label={`Monthly limit for ${cat.name}`}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Progress bar — shown when limit is set */}
                  {hasLimit && (
                    <div className="mt-4">
                      <div
                        className="h-1.5 rounded-full overflow-hidden"
                        style={{ background: "rgba(255,255,255,0.06)" }}
                      >
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: "0%",
                            background: cat.color,
                          }}
                        />
                      </div>
                      <p
                        className="text-xs mt-1"
                        style={{ color: "var(--muted-foreground)" }}
                      >
                        Monthly limit: {formatCurrency(limitNum, entry?.currency ?? "USD")}
                      </p>
                    </div>
                  )}
                </motion.div>
              );
            })}
          </motion.div>
        )}

        {/* Save button */}
        <Reveal delay={0.2}>
          <div className="mt-8 flex justify-end">
            <button
              onClick={handleSave}
              disabled={saving || loading}
              className="inline-flex items-center gap-2.5 rounded-xl px-6 py-3 text-sm font-semibold transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                background: saving ? "rgba(99,102,241,0.6)" : "var(--primary)",
                color: "#fff",
                boxShadow: saving
                  ? "none"
                  : "0 0 20px rgba(99,102,241,0.35), 0 4px 12px rgba(0,0,0,0.2)",
              }}
            >
              {saving ? (
                <>
                  <svg
                    className="w-4 h-4 animate-spin"
                    viewBox="0 0 24 24"
                    fill="none"
                    aria-hidden="true"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8v8H4z"
                    />
                  </svg>
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Save Budget Limits
                </>
              )}
            </button>
          </div>
        </Reveal>

        {/* Info note */}
        <Reveal delay={0.3}>
          <div
            className="mt-6 flex items-start gap-3 rounded-xl p-4"
            style={{
              background: "rgba(99,102,241,0.08)",
              border: "1px solid rgba(99,102,241,0.2)",
            }}
          >
            <AlertCircle
              className="w-4 h-4 mt-0.5 shrink-0"
              style={{ color: "var(--primary)" }}
            />
            <p className="text-xs leading-relaxed" style={{ color: "var(--muted-foreground)" }}>
              Budget limits are per calendar month. Leave a field empty to remove the limit for
              that category. Changes take effect immediately after saving.
            </p>
          </div>
        </Reveal>
      </div>
    </main>
  );
}
