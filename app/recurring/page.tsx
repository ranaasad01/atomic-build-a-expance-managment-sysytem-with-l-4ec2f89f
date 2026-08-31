"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Reveal } from "@/components/Reveal";
import { EXPENSE_CATEGORIES } from "@/lib/data";
import { fadeInUp, staggerContainer, scaleIn } from "@/lib/motion";
import { RefreshCw, Plus, Edit, Trash2, Calendar, Clock, ToggleLeft, ToggleRight, AlertCircle, Check, X, ArrowLeft, Zap } from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

type Frequency = "Daily" | "Weekly" | "Monthly";
type Currency = "USD" | "EUR" | "GBP";

interface RecurringExpense {
  id: string;
  title: string;
  amount: number;
  currency: Currency;
  category: string;
  frequency: Frequency;
  nextDue: string; // ISO date string
  autoCreate: boolean;
  active: boolean;
  notes?: string;
}

interface FormState {
  title: string;
  amount: string;
  currency: Currency;
  category: string;
  frequency: Frequency;
  startDate: string;
  autoCreate: boolean;
  notes: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getNextMonthFirst(): string {
  const now = new Date();
  const next = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  return next.toISOString().split("T")[0];
}

function getNextMonth15(): string {
  const now = new Date();
  const next = new Date(now.getFullYear(), now.getMonth() + 1, 15);
  return next.toISOString().split("T")[0];
}

function formatDate(iso: string): string {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function formatCurrency(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(amount);
  } catch {
    return `$${amount.toFixed(2)}`;
  }
}

function getCategoryMeta(name: string) {
  return (
    EXPENSE_CATEGORIES.find(
      (c) => c.name.toLowerCase() === name.toLowerCase() ||
             c.name.toLowerCase().includes(name.toLowerCase()) ||
             name.toLowerCase().includes(c.name.toLowerCase().split(" ")[0])
    ) ?? EXPENSE_CATEGORIES[EXPENSE_CATEGORIES.length - 1]
  );
}

function frequencyColor(freq: Frequency): string {
  switch (freq) {
    case "Daily": return "#10B981";
    case "Weekly": return "#6366F1";
    case "Monthly": return "#F59E0B";
  }
}

function generateUpcoming(templates: RecurringExpense[]): Array<RecurringExpense & { dueDate: string }> {
  const active = templates.filter((t) => t.active);
  const results: Array<RecurringExpense & { dueDate: string }> = [];

  for (const t of active) {
    results.push({ ...t, dueDate: t.nextDue });
  }

  return results
    .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
    .slice(0, 5);
}

// ─── Sample data ──────────────────────────────────────────────────────────────

const SAMPLE_RECURRING: RecurringExpense[] = [
  {
    id: "r1",
    title: "Netflix",
    amount: 15.99,
    currency: "USD",
    category: "Entertainment",
    frequency: "Monthly",
    nextDue: getNextMonthFirst(),
    autoCreate: true,
    active: true,
    notes: "Standard HD plan",
  },
  {
    id: "r2",
    title: "Rent",
    amount: 1200,
    currency: "USD",
    category: "Bills",
    frequency: "Monthly",
    nextDue: getNextMonthFirst(),
    autoCreate: false,
    active: true,
    notes: "Monthly apartment rent",
  },
  {
    id: "r3",
    title: "Gym Membership",
    amount: 49.99,
    currency: "USD",
    category: "Health",
    frequency: "Monthly",
    nextDue: getNextMonth15(),
    autoCreate: true,
    active: false,
    notes: "Paused for summer",
  },
];

const EMPTY_FORM: FormState = {
  title: "",
  amount: "",
  currency: "USD",
  category: "",
  frequency: "Monthly",
  startDate: "",
  autoCreate: false,
  notes: "",
};

// ─── Modal variants ───────────────────────────────────────────────────────────

const overlayVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.2 } },
  exit: { opacity: 0, transition: { duration: 0.18 } },
};

const modalVariants = {
  hidden: { opacity: 0, scale: 0.94, y: 16 },
  visible: { opacity: 1, scale: 1, y: 0, transition: { duration: 0.25, ease: "easeOut" } },
  exit: { opacity: 0, scale: 0.94, y: 16, transition: { duration: 0.18, ease: "easeIn" } },
};

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.45, ease: "easeOut" } },
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function FrequencyBadge({ freq }: { freq: Frequency }) {
  const color = frequencyColor(freq);
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold"
      style={{ backgroundColor: color + "22", color, border: `1px solid ${color}44` }}
    >
      <Clock className="w-3 h-3" />
      {freq}
    </span>
  );
}

function CategoryBadge({ category }: { category: string }) {
  const meta = getCategoryMeta(category);
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium"
      style={{
        backgroundColor: meta.color + "22",
        color: meta.color,
        border: `1px solid ${meta.color}44`,
      }}
    >
      <span>{meta.icon}</span>
      {category}
    </span>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function RecurringPage() {
  const [templates, setTemplates] = useState<RecurringExpense[]>(SAMPLE_RECURRING);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [formErrors, setFormErrors] = useState<Partial<Record<keyof FormState, string>>>({});
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Initialize startDate after mount to avoid hydration mismatch
    setForm((prev) => ({
      ...prev,
      startDate: new Date().toISOString().split("T")[0],
    }));
  }, []);

  const upcoming = generateUpcoming(templates);

  const openAdd = useCallback(() => {
    setEditingId(null);
    setForm({
      ...EMPTY_FORM,
      startDate: mounted ? new Date().toISOString().split("T")[0] : "",
    });
    setFormErrors({});
    setShowForm(true);
  }, [mounted]);

  const openEdit = useCallback((t: RecurringExpense) => {
    setEditingId(t.id);
    setForm({
      title: t.title,
      amount: t.amount.toString(),
      currency: t.currency,
      category: t.category,
      frequency: t.frequency,
      startDate: t.nextDue,
      autoCreate: t.autoCreate,
      notes: t.notes ?? "",
    });
    setFormErrors({});
    setShowForm(true);
  }, []);

  const closeForm = useCallback(() => {
    setShowForm(false);
    setEditingId(null);
    setFormErrors({});
  }, []);

  const validate = (): boolean => {
    const errors: Partial<Record<keyof FormState, string>> = {};
    if (!form.title.trim()) errors.title = "Title is required";
    if (!form.amount || isNaN(parseFloat(form.amount)) || parseFloat(form.amount) <= 0)
      errors.amount = "Enter a valid positive amount";
    if (!form.category) errors.category = "Please select a category";
    if (!form.startDate) errors.startDate = "Start date is required";
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSave = useCallback(() => {
    if (!validate()) return;

    if (editingId) {
      setTemplates((prev) =>
        prev.map((t) =>
          t.id === editingId
            ? {
                ...t,
                title: form.title.trim(),
                amount: parseFloat(form.amount),
                currency: form.currency,
                category: form.category,
                frequency: form.frequency,
                nextDue: form.startDate,
                autoCreate: form.autoCreate,
                notes: form.notes,
              }
            : t
        )
      );
    } else {
      const newTemplate: RecurringExpense = {
        id: `r${Date.now()}`,
        title: form.title.trim(),
        amount: parseFloat(form.amount),
        currency: form.currency,
        category: form.category,
        frequency: form.frequency,
        nextDue: form.startDate,
        autoCreate: form.autoCreate,
        active: true,
        notes: form.notes,
      };
      setTemplates((prev) => [...prev, newTemplate]);
    }
    closeForm();
  }, [form, editingId, closeForm]);

  const handleDelete = useCallback((id: string) => {
    setTemplates((prev) => prev.filter((t) => t.id !== id));
    setDeleteConfirmId(null);
  }, []);

  const toggleActive = useCallback((id: string) => {
    setTemplates((prev) =>
      prev.map((t) => (t.id === id ? { ...t, active: !t.active } : t))
    );
  }, []);

  const setField = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (formErrors[key]) setFormErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  return (
    <div
      className="min-h-screen"
      style={{ background: "var(--background)", color: "var(--foreground)" }}
    >
      {/* ── HERO ── */}
      <section className="relative overflow-hidden mesh-bg pt-24 pb-16">
        {/* Glow orb */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-32 left-1/2 -translate-x-1/2 w-[700px] h-[400px] rounded-full"
          style={{
            background:
              "radial-gradient(ellipse at center, rgba(99,102,241,0.18) 0%, transparent 70%)",
          }}
        />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Back link */}
          <Reveal>
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 text-sm mb-8 transition-colors duration-200"
              style={{ color: "var(--muted-foreground)" }}
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Dashboard
            </Link>
          </Reveal>

          <motion.div
            variants={staggerContainer}
            initial="hidden"
            animate="visible"
            className="max-w-3xl"
          >
            {/* Badge */}
            <motion.div variants={fadeInUp} className="mb-5">
              <span
                className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-semibold tracking-wide uppercase"
                style={{
                  background: "rgba(99,102,241,0.15)",
                  color: "var(--primary)",
                  border: "1px solid rgba(99,102,241,0.3)",
                }}
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Recurring Expenses
              </span>
            </motion.div>

            {/* Heading */}
            <motion.h1
              variants={fadeInUp}
              className="text-4xl sm:text-5xl font-bold tracking-tight mb-4"
              style={{ color: "var(--foreground)" }}
            >
              Automate Your{" "}
              <span style={{ color: "var(--primary)" }}>Regular Expenses</span>
            </motion.h1>

            {/* Subtitle */}
            <motion.p
              variants={fadeInUp}
              className="text-lg leading-relaxed mb-8 max-w-2xl"
              style={{ color: "var(--muted-foreground)" }}
            >
              Manage subscriptions, rent, utilities, and any recurring cost in one place.
              Set frequencies, toggle auto-creation, and never miss a scheduled entry again.
            </motion.p>

            {/* CTA */}
            <motion.div variants={fadeInUp} className="flex flex-wrap items-center gap-4">
              <button
                onClick={openAdd}
                className="inline-flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-semibold text-white transition-all duration-200 hover:opacity-90 hover:shadow-lg"
                style={{
                  background: "var(--primary)",
                  boxShadow: "0 0 24px rgba(99,102,241,0.35)",
                }}
              >
                <Plus className="w-4 h-4" />
                Add Recurring
              </button>

              {/* Info note */}
              <span
                className="inline-flex items-center gap-1.5 text-xs rounded-lg px-3 py-2"
                style={{
                  background: "rgba(245,158,11,0.1)",
                  color: "var(--accent)",
                  border: "1px solid rgba(245,158,11,0.25)",
                }}
              >
                <Zap className="w-3.5 h-3.5" />
                Recurring templates are stored locally — Supabase sync coming soon
              </span>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ── UPCOMING SCHEDULE ── */}
      <section className="py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Reveal>
            <h2
              className="text-xl font-bold mb-6 flex items-center gap-2"
              style={{ color: "var(--foreground)" }}
            >
              <Calendar className="w-5 h-5" style={{ color: "var(--primary)" }} />
              Upcoming This Month
            </h2>
          </Reveal>

          <Reveal>
            <div
              className="glass rounded-2xl border p-6"
              style={{ borderColor: "var(--border)" }}
            >
              {upcoming.length === 0 ? (
                <p className="text-sm text-center py-6" style={{ color: "var(--muted-foreground)" }}>
                  No active recurring expenses scheduled.
                </p>
              ) : (
                <motion.ul
                  variants={staggerContainer}
                  initial="hidden"
                  animate="visible"
                  className="divide-y"
                  style={{ borderColor: "var(--border)" }}
                >
                  {upcoming.map((item) => {
                    const meta = getCategoryMeta(item.category);
                    return (
                      <motion.li
                        key={item.id + item.dueDate}
                        variants={fadeInUp}
                        className="flex items-center justify-between gap-4 py-4 first:pt-0 last:pb-0"
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className="w-10 h-10 rounded-xl flex items-center justify-center text-lg flex-shrink-0"
                            style={{ background: meta.color + "22" }}
                          >
                            {meta.icon}
                          </div>
                          <div>
                            <p className="text-sm font-semibold" style={{ color: "var(--foreground)" }}>
                              {item.title}
                            </p>
                            <CategoryBadge category={item.category} />
                          </div>
                        </div>
                        <div className="flex items-center gap-4 flex-shrink-0">
                          <span
                            className="text-sm font-bold"
                            style={{ color: "var(--foreground)" }}
                          >
                            {formatCurrency(item.amount, item.currency)}
                          </span>
                          <span
                            className="text-xs rounded-lg px-2.5 py-1"
                            style={{
                              background: "rgba(99,102,241,0.12)",
                              color: "var(--primary)",
                              border: "1px solid rgba(99,102,241,0.25)",
                            }}
                          >
                            {formatDate(item.dueDate)}
                          </span>
                        </div>
                      </motion.li>
                    );
                  })}
                </motion.ul>
              )}
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── TEMPLATES LIST ── */}
      <section className="py-8 pb-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Reveal>
            <div className="flex items-center justify-between mb-8">
              <h2
                className="text-xl font-bold flex items-center gap-2"
                style={{ color: "var(--foreground)" }}
              >
                <RefreshCw className="w-5 h-5" style={{ color: "var(--accent)" }} />
                Your Recurring Templates
              </h2>
              <button
                onClick={openAdd}
                className="inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-all duration-200 hover:opacity-90"
                style={{
                  background: "rgba(99,102,241,0.15)",
                  color: "var(--primary)",
                  border: "1px solid rgba(99,102,241,0.3)",
                }}
              >
                <Plus className="w-4 h-4" />
                New Template
              </button>
            </div>
          </Reveal>

          {templates.length === 0 ? (
            /* ── EMPTY STATE ── */
            <motion.div
              variants={scaleIn}
              initial="hidden"
              animate="visible"
              className="flex flex-col items-center justify-center py-24 text-center"
            >
              <div className="text-6xl mb-6">🔄</div>
              <h3 className="text-xl font-bold mb-2" style={{ color: "var(--foreground)" }}>
                No recurring expenses yet
              </h3>
              <p className="text-sm mb-8 max-w-xs" style={{ color: "var(--muted-foreground)" }}>
                Add your first recurring template to automate subscriptions, rent, and utilities.
              </p>
              <button
                onClick={openAdd}
                className="inline-flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-semibold text-white transition-all duration-200 hover:opacity-90"
                style={{ background: "var(--primary)" }}
              >
                <Plus className="w-4 h-4" />
                Add your first recurring expense
              </button>
            </motion.div>
          ) : (
            <motion.div
              variants={staggerContainer}
              initial="hidden"
              animate="visible"
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
            >
              {templates.map((t) => {
                const meta = getCategoryMeta(t.category);
                const isConfirmingDelete = deleteConfirmId === t.id;

                return (
                  <motion.div
                    key={t.id}
                    variants={cardVariants}
                    className="glass rounded-2xl border p-6 flex flex-col gap-4 transition-all duration-200 hover:shadow-[0_4px_24px_rgba(99,102,241,0.12)]"
                    style={{
                      borderColor: t.active ? "var(--border)" : "rgba(46,46,74,0.5)",
                      opacity: t.active ? 1 : 0.65,
                    }}
                  >
                    {/* Header row */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-11 h-11 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
                          style={{ background: meta.color + "22" }}
                        >
                          {meta.icon}
                        </div>
                        <div>
                          <p
                            className="font-bold text-base leading-tight"
                            style={{ color: "var(--foreground)" }}
                          >
                            {t.title}
                          </p>
                          <CategoryBadge category={t.category} />
                        </div>
                      </div>

                      {/* Auto-create toggle */}
                      <button
                        onClick={() => toggleActive(t.id)}
                        className="flex-shrink-0 transition-colors duration-200"
                        title={t.active ? "Deactivate" : "Activate"}
                        aria-label={t.active ? "Deactivate template" : "Activate template"}
                      >
                        {t.active ? (
                          <ToggleRight
                            className="w-7 h-7"
                            style={{ color: "var(--primary)" }}
                          />
                        ) : (
                          <ToggleLeft
                            className="w-7 h-7"
                            style={{ color: "var(--muted-foreground)" }}
                          />
                        )}
                      </button>
                    </div>

                    {/* Amount */}
                    <div className="flex items-center justify-between">
                      <span
                        className="text-2xl font-bold tracking-tight"
                        style={{ color: "var(--foreground)" }}
                      >
                        {formatCurrency(t.amount, t.currency)}
                      </span>
                      <FrequencyBadge freq={t.frequency} />
                    </div>

                    {/* Next due */}
                    <div
                      className="flex items-center gap-2 text-xs rounded-lg px-3 py-2"
                      style={{
                        background: "rgba(99,102,241,0.08)",
                        color: "var(--muted-foreground)",
                        border: "1px solid rgba(99,102,241,0.15)",
                      }}
                    >
                      <Calendar className="w-3.5 h-3.5" style={{ color: "var(--primary)" }} />
                      <span>Next due:</span>
                      <span className="font-semibold" style={{ color: "var(--foreground)" }}>
                        {formatDate(t.nextDue)}
                      </span>
                    </div>

                    {/* Auto-create indicator */}
                    <div className="flex items-center gap-2">
                      {t.autoCreate ? (
                        <span
                          className="inline-flex items-center gap-1.5 text-xs rounded-full px-2.5 py-0.5"
                          style={{
                            background: "rgba(16,185,129,0.12)",
                            color: "#10B981",
                            border: "1px solid rgba(16,185,129,0.25)",
                          }}
                        >
                          <Check className="w-3 h-3" />
                          Auto-create on
                        </span>
                      ) : (
                        <span
                          className="inline-flex items-center gap-1.5 text-xs rounded-full px-2.5 py-0.5"
                          style={{
                            background: "rgba(148,163,184,0.1)",
                            color: "var(--muted-foreground)",
                            border: "1px solid rgba(148,163,184,0.2)",
                          }}
                        >
                          <X className="w-3 h-3" />
                          Auto-create off
                        </span>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 pt-2 border-t" style={{ borderColor: "var(--border)" }}>
                      {isConfirmingDelete ? (
                        <div className="flex items-center gap-2 w-full">
                          <span className="text-xs flex-1" style={{ color: "var(--muted-foreground)" }}>
                            Delete this template?
                          </span>
                          <button
                            onClick={() => handleDelete(t.id)}
                            className="inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all duration-200 hover:opacity-90"
                            style={{ background: "var(--destructive)", color: "#fff" }}
                          >
                            <Check className="w-3 h-3" />
                            Yes
                          </button>
                          <button
                            onClick={() => setDeleteConfirmId(null)}
                            className="inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all duration-200"
                            style={{
                              background: "rgba(148,163,184,0.1)",
                              color: "var(--muted-foreground)",
                              border: "1px solid rgba(148,163,184,0.2)",
                            }}
                          >
                            <X className="w-3 h-3" />
                            No
                          </button>
                        </div>
                      ) : (
                        <>
                          <button
                            onClick={() => openEdit(t)}
                            className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition-all duration-200 hover:opacity-90"
                            style={{
                              background: "rgba(99,102,241,0.12)",
                              color: "var(--primary)",
                              border: "1px solid rgba(99,102,241,0.25)",
                            }}
                          >
                            <Edit className="w-3.5 h-3.5" />
                            Edit
                          </button>
                          <button
                            onClick={() => setDeleteConfirmId(t.id)}
                            className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition-all duration-200 hover:opacity-90"
                            style={{
                              background: "rgba(220,38,38,0.1)",
                              color: "var(--destructive)",
                              border: "1px solid rgba(220,38,38,0.25)",
                            }}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            Delete
                          </button>
                        </>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </motion.div>
          )}
        </div>
      </section>

      {/* ── ADD/EDIT MODAL ── */}
      <AnimatePresence>
        {showForm && (
          <>
            {/* Overlay */}
            <motion.div
              key="overlay"
              variants={overlayVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="fixed inset-0 z-40"
              style={{ background: "rgba(0,0,0,0.65)", backdropFilter: "blur(4px)" }}
              onClick={closeForm}
            />

            {/* Modal */}
            <motion.div
              key="modal"
              variants={modalVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="fixed inset-0 z-50 flex items-center justify-center p-4"
            >
              <div
                className="glass rounded-2xl border w-full max-w-lg max-h-[90vh] overflow-y-auto"
                style={{ borderColor: "var(--border)" }}
                onClick={(e) => e.stopPropagation()}
              >
                {/* Modal header */}
                <div
                  className="flex items-center justify-between p-6 border-b"
                  style={{ borderColor: "var(--border)" }}
                >
                  <h3 className="text-lg font-bold" style={{ color: "var(--foreground)" }}>
                    {editingId ? "Edit Recurring Expense" : "Add Recurring Expense"}
                  </h3>
                  <button
                    onClick={closeForm}
                    className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors duration-200 hover:bg-white/5"
                    style={{ color: "var(--muted-foreground)" }}
                    aria-label="Close form"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Form body */}
                <div className="p-6 space-y-5">
                  {/* Title */}
                  <div>
                    <label
                      className="block text-sm font-medium mb-1.5"
                      style={{ color: "var(--foreground)" }}
                    >
                      Title
                    </label>
                    <input
                      type="text"
                      value={form.title}
                      onChange={(e) => setField("title", e.target.value)}
                      placeholder="e.g. Netflix, Rent, Gym"
                      className="w-full rounded-xl px-4 py-2.5 text-sm outline-none transition-all duration-200 focus:ring-2"
                      style={{
                        background: "rgba(255,255,255,0.04)",
                        border: `1px solid ${formErrors.title ? "var(--destructive)" : "var(--border)"}`,
                        color: "var(--foreground)",
                        borderColor: "var(--primary)",
                      }}
                    />
                    {formErrors.title && (
                      <p className="mt-1 text-xs flex items-center gap-1" style={{ color: "var(--destructive)" }}>
                        <AlertCircle className="w-3 h-3" />
                        {formErrors.title}
                      </p>
                    )}
                  </div>

                  {/* Amount + Currency */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label
                        className="block text-sm font-medium mb-1.5"
                        style={{ color: "var(--foreground)" }}
                      >
                        Amount
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={form.amount}
                        onChange={(e) => setField("amount", e.target.value)}
                        placeholder="0.00"
                        className="w-full rounded-xl px-4 py-2.5 text-sm outline-none transition-all duration-200"
                        style={{
                          background: "rgba(255,255,255,0.04)",
                          border: `1px solid ${formErrors.amount ? "var(--destructive)" : "var(--border)"}`,
                          color: "var(--foreground)",
                        }}
                      />
                      {formErrors.amount && (
                        <p className="mt-1 text-xs flex items-center gap-1" style={{ color: "var(--destructive)" }}>
                          <AlertCircle className="w-3 h-3" />
                          {formErrors.amount}
                        </p>
                      )}
                    </div>
                    <div>
                      <label
                        className="block text-sm font-medium mb-1.5"
                        style={{ color: "var(--foreground)" }}
                      >
                        Currency
                      </label>
                      <select
                        value={form.currency}
                        onChange={(e) => setField("currency", e.target.value as Currency)}
                        className="w-full rounded-xl px-4 py-2.5 text-sm outline-none transition-all duration-200"
                        style={{
                          background: "rgba(26,26,46,0.95)",
                          border: "1px solid var(--border)",
                          color: "var(--foreground)",
                        }}
                      >
                        <option value="USD">USD</option>
                        <option value="EUR">EUR</option>
                        <option value="GBP">GBP</option>
                      </select>
                    </div>
                  </div>

                  {/* Category */}
                  <div>
                    <label
                      className="block text-sm font-medium mb-2"
                      style={{ color: "var(--foreground)" }}
                    >
                      Category
                    </label>
                    <div className="grid grid-cols-4 gap-2">
                      {EXPENSE_CATEGORIES.map((cat) => {
                        const selected = form.category === cat.name;
                        return (
                          <button
                            key={cat.name}
                            type="button"
                            onClick={() => setField("category", cat.name)}
                            className="flex flex-col items-center gap-1 rounded-xl p-2.5 text-xs font-medium transition-all duration-200"
                            style={{
                              background: selected ? cat.color + "22" : "rgba(255,255,255,0.03)",
                              border: `1px solid ${selected ? cat.color + "66" : "var(--border)"}`,
                              color: selected ? cat.color : "var(--muted-foreground)",
                            }}
                          >
                            <span className="text-lg">{cat.icon}</span>
                            <span className="leading-tight text-center">
                              {cat.name.split(" ")[0]}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                    {formErrors.category && (
                      <p className="mt-1.5 text-xs flex items-center gap-1" style={{ color: "var(--destructive)" }}>
                        <AlertCircle className="w-3 h-3" />
                        {formErrors.category}
                      </p>
                    )}
                  </div>

                  {/* Frequency */}
                  <div>
                    <label
                      className="block text-sm font-medium mb-2"
                      style={{ color: "var(--foreground)" }}
                    >
                      Frequency
                    </label>
                    <div className="flex gap-2">
                      {(["Daily", "Weekly", "Monthly"] as Frequency[]).map((freq) => {
                        const selected = form.frequency === freq;
                        const color = frequencyColor(freq);
                        return (
                          <label
                            key={freq}
                            className="flex-1 flex items-center justify-center gap-1.5 rounded-xl px-3 py-2.5 text-sm font-medium cursor-pointer transition-all duration-200"
                            style={{
                              background: selected ? color + "22" : "rgba(255,255,255,0.03)",
                              border: `1px solid ${selected ? color + "66" : "var(--border)"}`,
                              color: selected ? color : "var(--muted-foreground)",
                            }}
                          >
                            <input
                              type="radio"
                              name="frequency"
                              value={freq}
                              checked={selected}
                              onChange={() => setField("frequency", freq)}
                              className="sr-only"
                            />
                            {freq}
                          </label>
                        );
                      })}
                    </div>
                  </div>

                  {/* Start Date */}
                  <div>
                    <label
                      className="block text-sm font-medium mb-1.5"
                      style={{ color: "var(--foreground)" }}
                    >
                      Start Date
                    </label>
                    <input
                      type="date"
                      value={form.startDate}
                      onChange={(e) => setField("startDate", e.target.value)}
                      className="w-full rounded-xl px-4 py-2.5 text-sm outline-none transition-all duration-200"
                      style={{
                        background: "rgba(255,255,255,0.04)",
                        border: `1px solid ${formErrors.startDate ? "var(--destructive)" : "var(--border)"}`,
                        color: "var(--foreground)",
                        colorScheme: "dark",
                      }}
                    />
                    {formErrors.startDate && (
                      <p className="mt-1 text-xs flex items-center gap-1" style={{ color: "var(--destructive)" }}>
                        <AlertCircle className="w-3 h-3" />
                        {formErrors.startDate}
                      </p>
                    )}
                  </div>

                  {/* Auto-create toggle */}
                  <div
                    className="flex items-center justify-between rounded-xl px-4 py-3"
                    style={{
                      background: "rgba(255,255,255,0.03)",
                      border: "1px solid var(--border)",
                    }}
                  >
                    <div>
                      <p className="text-sm font-medium" style={{ color: "var(--foreground)" }}>
                        Auto-create expense
                      </p>
                      <p className="text-xs mt-0.5" style={{ color: "var(--muted-foreground)" }}>
                        Automatically log this expense on the due date
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setField("autoCreate", !form.autoCreate)}
                      aria-label="Toggle auto-create"
                    >
                      {form.autoCreate ? (
                        <ToggleRight
                          className="w-8 h-8 transition-colors duration-200"
                          style={{ color: "var(--primary)" }}
                        />
                      ) : (
                        <ToggleLeft
                          className="w-8 h-8 transition-colors duration-200"
                          style={{ color: "var(--muted-foreground)" }}
                        />
                      )}
                    </button>
                  </div>

                  {/* Notes */}
                  <div>
                    <label
                      className="block text-sm font-medium mb-1.5"
                      style={{ color: "var(--foreground)" }}
                    >
                      Notes
                      <span className="ml-1 text-xs font-normal" style={{ color: "var(--muted-foreground)" }}>
                        (optional)
                      </span>
                    </label>
                    <textarea
                      value={form.notes}
                      onChange={(e) => setField("notes", e.target.value)}
                      placeholder="Any additional details..."
                      rows={3}
                      className="w-full rounded-xl px-4 py-2.5 text-sm outline-none transition-all duration-200 resize-none"
                      style={{
                        background: "rgba(255,255,255,0.04)",
                        border: "1px solid var(--border)",
                        color: "var(--foreground)",
                      }}
                    />
                  </div>
                </div>

                {/* Modal footer */}
                <div
                  className="flex items-center gap-3 p-6 border-t"
                  style={{ borderColor: "var(--border)" }}
                >
                  <button
                    onClick={handleSave}
                    className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold text-white transition-all duration-200 hover:opacity-90"
                    style={{ background: "var(--primary)" }}
                  >
                    <Check className="w-4 h-4" />
                    {editingId ? "Save Changes" : "Add Template"}
                  </button>
                  <button
                    onClick={closeForm}
                    className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold transition-all duration-200 hover:opacity-90"
                    style={{
                      background: "rgba(148,163,184,0.1)",
                      color: "var(--muted-foreground)",
                      border: "1px solid rgba(148,163,184,0.2)",
                    }}
                  >
                    <X className="w-4 h-4" />
                    Cancel
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
