"use client";

import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { User, Mail, DollarSign, Camera, Save, AlertCircle, CheckCircle, Loader2, Shield, Bell, Palette } from 'lucide-react';
import { Reveal } from "@/components/Reveal";
import { fadeInUp, staggerContainer } from "@/lib/motion";
import { BRAND, EXPENSE_CATEGORIES } from "@/lib/data";
type formatCurrency = any;
const formatCurrency: any = [];
type DEFAULT_CURRENCY = any;
const DEFAULT_CURRENCY: any = [];
type ProfileRow = any;
const ProfileRow: any = [];
import { createClient } from "@/lib/supabase/client";

const CURRENCY_OPTIONS = [
  { code: "USD", label: "US Dollar", symbol: "$" },
  { code: "EUR", label: "Euro", symbol: "€" },
  { code: "GBP", label: "British Pound", symbol: "£" },
  { code: "JPY", label: "Japanese Yen", symbol: "¥" },
  { code: "CAD", label: "Canadian Dollar", symbol: "CA$" },
  { code: "AUD", label: "Australian Dollar", symbol: "A$" },
  { code: "INR", label: "Indian Rupee", symbol: "₹" },
  { code: "CHF", label: "Swiss Franc", symbol: "CHF" },
];

interface StatCard {
  label: string;
  value: string;
  icon: string;
  color: string;
}

export default function ProfileAccountPage() {
  const supabase = createClient();

  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [preferredCurrency, setPreferredCurrency] = useState(DEFAULT_CURRENCY);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "success" | "error">("idle");
  const [saveMessage, setSaveMessage] = useState("");
  const [loading, setLoading] = useState(true);

  const [totalExpenses, setTotalExpenses] = useState(0);
  const [expenseCount, setExpenseCount] = useState(0);
  const [budgetCount, setBudgetCount] = useState(0);
  const [topCategory, setTopCategory] = useState("N/A");

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    async function loadProfile() {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }

      setEmail(user.email ?? "");

      const { data: profileData } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (profileData) {
        setProfile(profileData as ProfileRow);
        setFullName(profileData.full_name ?? "");
        setPreferredCurrency(profileData.preferred_currency ?? DEFAULT_CURRENCY);
        setAvatarUrl(profileData.avatar_url ?? null);
      }

      const { data: expenses } = await supabase
        .from("expenses")
        .select("amount, category_id")
        .eq("user_id", user.id);

      if (expenses && expenses.length > 0) {
        const total = expenses.reduce((sum, e) => sum + parseFloat(e.amount ?? "0"), 0);
        setTotalExpenses(total);
        setExpenseCount(expenses.length);

        const catMap: Record<string, number> = {};
        for (const e of expenses) {
          catMap[e.category_id] = (catMap[e.category_id] ?? 0) + parseFloat(e.amount ?? "0");
        }
        const topCatId = Object.entries(catMap).sort((a, b) => b[1] - a[1])[0]?.[0];
        if (topCatId) {
          const { data: catRow } = await supabase
            .from("categories")
            .select("name")
            .eq("id", topCatId)
            .single();
          if (catRow) setTopCategory(catRow.name);
        }
      }

      const { data: budgets } = await supabase
        .from("budgets")
        .select("id")
        .eq("user_id", user.id);

      setBudgetCount(budgets?.length ?? 0);
      setLoading(false);
    }

    loadProfile();
  }, []);

  async function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      const ext = file.name.split(".").pop();
      const path = `${user.id}/avatar.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(path, file, { upsert: true });
      if (uploadError) throw uploadError;
      const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(path);
      const publicUrl = urlData.publicUrl;
      await supabase.from("profiles").update({ avatar_url: publicUrl, updated_at: new Date().toISOString() }).eq("id", user.id);
      setAvatarUrl(publicUrl);
    } catch {
      setSaveStatus("error");
      setSaveMessage("Avatar upload failed. Please try again.");
      setTimeout(() => setSaveStatus("idle"), 3000);
    } finally {
      setUploading(false);
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSaveStatus("idle");
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      const { error } = await supabase.from("profiles").upsert({
        id: user.id,
        full_name: fullName.trim() || null,
        preferred_currency: preferredCurrency,
        updated_at: new Date().toISOString(),
      });
      if (error) throw error;
      setSaveStatus("success");
      setSaveMessage("Profile updated successfully.");
    } catch {
      setSaveStatus("error");
      setSaveMessage("Failed to save profile. Please try again.");
    } finally {
      setSaving(false);
      setTimeout(() => setSaveStatus("idle"), 3000);
    }
  }

  const statCards: StatCard[] = [
    { label: "Total Spent", value: formatCurrency(totalExpenses, preferredCurrency), icon: "💸", color: "var(--accent)" },
    { label: "Expenses Logged", value: String(expenseCount), icon: "📋", color: "#6366F1" },
    { label: "Active Budgets", value: String(budgetCount), icon: "🎯", color: "#10B981" },
    { label: "Top Category", value: topCategory, icon: "🏆", color: "#F59E0B" },
  ];

  const initials = fullName
    ? fullName.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
    : email.slice(0, 2).toUpperCase();

  return (
    <main className="min-h-screen bg-[hsl(var(--background))] pb-24">
      {/* Hero / Header */}
      <Reveal>
        <section className="relative overflow-hidden border-b border-[hsl(var(--border))] bg-[hsl(var(--card))]">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_-20%,var(--accent)/8%,transparent)]" />
          <div className="mx-auto max-w-4xl px-6 py-14">
            <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-end sm:gap-8">
              {/* Avatar */}
              <div className="relative shrink-0">
                <div className="h-24 w-24 rounded-full border-4 border-[var(--accent)]/30 bg-[hsl(var(--muted))] overflow-hidden shadow-[0_4px_24px_rgba(0,0,0,0.12)]">
                  {avatarUrl ? (
                    <img
                      src={avatarUrl}
                      alt={fullName || "Avatar"}
                      className="h-full w-full object-cover"
                      onError={() => setAvatarUrl(null)}
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-2xl font-bold text-[var(--accent)]">
                      {loading ? "…" : initials}
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-full bg-[var(--accent)] text-white shadow-md transition-all duration-200 hover:scale-110 hover:brightness-110 disabled:opacity-60"
                  aria-label="Upload avatar"
                >
                  {uploading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Camera className="h-4 w-4" />
                  )}
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleAvatarUpload}
                />
              </div>

              {/* Name + email */}
              <div className="text-center sm:text-left">
                <h1 className="text-2xl font-bold tracking-tight text-[hsl(var(--foreground))]">
                  {loading ? "Loading…" : fullName || "Your Profile"}
                </h1>
                <p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">{email}</p>
                <span className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-[var(--accent)]/30 bg-[var(--accent)]/10 px-3 py-0.5 text-xs font-medium text-[var(--accent)]">
                  <Shield className="h-3 w-3" /> Verified Account
                </span>
              </div>
            </div>
          </div>
        </section>
      </Reveal>

      <div className="mx-auto max-w-4xl px-6 pt-10 space-y-10">
        {/* Stat Cards */}
        <Reveal>
          <motion.div
            variants={staggerContainer}
            initial="hidden"
            animate="visible"
            className="grid grid-cols-2 gap-4 sm:grid-cols-4"
          >
            {statCards.map((card, i) => (
              <motion.div
                key={card.label}
                variants={fadeInUp}
                whileHover={{ y: -3, transition: { duration: 0.2 } }}
                className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-5 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_4px_16px_-4px_rgba(0,0,0,0.08)]"
              >
                <div className="text-2xl">{card.icon}</div>
                <div
                  className="mt-2 text-xl font-bold truncate"
                  style={{ color: card.color }}
                >
                  {loading ? "—" : card.value}
                </div>
                <div className="mt-0.5 text-xs text-[hsl(var(--muted-foreground))]">{card.label}</div>
              </motion.div>
            ))}
          </motion.div>
        </Reveal>

        {/* Profile Form */}
        <Reveal>
          <section className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] shadow-[0_1px_2px_rgba(0,0,0,0.04),0_8px_24px_-8px_rgba(0,0,0,0.10)] overflow-hidden">
            <div className="border-b border-[hsl(var(--border))] px-6 py-4 flex items-center gap-3">
              <User className="h-5 w-5 text-[var(--accent)]" />
              <h2 className="text-base font-semibold text-[hsl(var(--foreground))]">Personal Information</h2>
            </div>
            <form onSubmit={handleSave} className="px-6 py-6 space-y-5">
              {/* Full Name */}
              <div>
                <label className="block text-sm font-medium text-[hsl(var(--foreground))] mb-1.5">
                  Full Name
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[hsl(var(--muted-foreground))]" />
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Your full name"
                    className="w-full rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] py-2.5 pl-10 pr-4 text-sm text-[hsl(var(--foreground))] placeholder:text-[hsl(var(--muted-foreground))] focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20 transition-all duration-200"
                  />
                </div>
              </div>

              {/* Email (read-only) */}
              <div>
                <label className="block text-sm font-medium text-[hsl(var(--foreground))] mb-1.5">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[hsl(var(--muted-foreground))]" />
                  <input
                    type="email"
                    value={email}
                    readOnly
                    className="w-full rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--muted))]/50 py-2.5 pl-10 pr-4 text-sm text-[hsl(var(--muted-foreground))] cursor-not-allowed"
                  />
                </div>
                <p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">Email cannot be changed here. Contact support if needed.</p>
              </div>

              {/* Preferred Currency */}
              <div>
                <label className="block text-sm font-medium text-[hsl(var(--foreground))] mb-1.5">
                  Preferred Currency
                </label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[hsl(var(--muted-foreground))]" />
                  <select
                    value={preferredCurrency}
                    onChange={(e) => setPreferredCurrency(e.target.value)}
                    className="w-full appearance-none rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] py-2.5 pl-10 pr-4 text-sm text-[hsl(var(--foreground))] focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20 transition-all duration-200"
                  >
                    {CURRENCY_OPTIONS.map((c) => (
                      <option key={c.code} value={c.code}>
                        {c.symbol} {c.label} ({c.code})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Save status */}
              {saveStatus !== "idle" && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-medium ${
                    saveStatus === "success"
                      ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20"
                      : "bg-red-500/10 text-red-600 border border-red-500/20"
                  }`}
                >
                  {saveStatus === "success" ? (
                    <CheckCircle className="h-4 w-4 shrink-0" />
                  ) : (
                    <AlertCircle className="h-4 w-4 shrink-0" />
                  )}
                  {saveMessage}
                </motion.div>
              )}

              <div className="pt-1">
                <motion.button
                  type="submit"
                  disabled={saving || loading}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="flex items-center gap-2 rounded-xl bg-[var(--accent)] px-6 py-2.5 text-sm font-semibold text-white shadow-[0_2px_8px_var(--accent)/30] transition-all duration-200 hover:brightness-110 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {saving ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  {saving ? "Saving…" : "Save Changes"}
                </motion.button>
              </div>
            </form>
          </section>
        </Reveal>

        {/* Expense Categories Overview */}
        <Reveal>
          <section className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] shadow-[0_1px_2px_rgba(0,0,0,0.04),0_8px_24px_-8px_rgba(0,0,0,0.10)] overflow-hidden">
            <div className="border-b border-[hsl(var(--border))] px-6 py-4 flex items-center gap-3">
              <Palette className="h-5 w-5 text-[var(--accent)]" />
              <h2 className="text-base font-semibold text-[hsl(var(--foreground))]">Expense Categories</h2>
            </div>
            <div className="px-6 py-5">
              <p className="text-sm text-[hsl(var(--muted-foreground))] mb-4">
                These are the categories available for tracking your expenses across {BRAND.name}.
              </p>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                {EXPENSE_CATEGORIES.map((cat) => (
                  <div
                    key={cat.key}
                    className="flex items-center gap-2.5 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-3 py-2.5"
                  >
                    <span className="text-lg">{cat.icon}</span>
                    <span className="text-xs font-medium text-[hsl(var(--foreground))] truncate">{cat.name}</span>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </Reveal>

        {/* Notifications Preferences (UI only) */}
        <Reveal>
          <section className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] shadow-[0_1px_2px_rgba(0,0,0,0.04),0_8px_24px_-8px_rgba(0,0,0,0.10)] overflow-hidden">
            <div className="border-b border-[hsl(var(--border))] px-6 py-4 flex items-center gap-3">
              <Bell className="h-5 w-5 text-[var(--accent)]" />
              <h2 className="text-base font-semibold text-[hsl(var(--foreground))]">Notification Preferences</h2>
            </div>
            <div className="px-6 py-5 space-y-4">
              {[
                { label: "Budget limit alerts", desc: "Get notified when you approach a category budget limit.", defaultOn: true },
                { label: "Weekly spending summary", desc: "Receive a weekly digest of your spending habits.", defaultOn: true },
                { label: "New expense reminders", desc: "Daily reminder to log your expenses.", defaultOn: false },
              ].map((pref) => (
                <NotificationToggle key={pref.label} label={pref.label} desc={pref.desc} defaultOn={pref.defaultOn} />
              ))}
            </div>
          </section>
        </Reveal>

        {/* Danger Zone */}
        <Reveal>
          <section className="rounded-2xl border border-red-500/20 bg-red-500/5 overflow-hidden">
            <div className="border-b border-red-500/20 px-6 py-4 flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-red-500" />
              <h2 className="text-base font-semibold text-red-600">Danger Zone</h2>
            </div>
            <div className="px-6 py-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-[hsl(var(--foreground))]">Delete Account</p>
                <p className="text-xs text-[hsl(var(--muted-foreground))] mt-0.5">
                  Permanently remove your account and all associated data. This action cannot be undone.
                </p>
              </div>
              <button
                type="button"
                className="shrink-0 rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-2 text-sm font-semibold text-red-600 transition-all duration-200 hover:bg-red-500 hover:text-white"
                onClick={() => alert("Please contact support to delete your account.")}
              >
                Delete Account
              </button>
            </div>
          </section>
        </Reveal>
      </div>
    </main>
  );
}

function NotificationToggle({ label, desc, defaultOn }: { label: string; desc: string; defaultOn: boolean }) {
  const [enabled, setEnabled] = useState(defaultOn);
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <p className="text-sm font-medium text-[hsl(var(--foreground))]">{label}</p>
        <p className="text-xs text-[hsl(var(--muted-foreground))] mt-0.5">{desc}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={enabled}
        onClick={() => setEnabled((v) => !v)}
        className={`relative mt-0.5 h-6 w-11 shrink-0 rounded-full border transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] ${
          enabled
            ? "border-[var(--accent)] bg-[var(--accent)]"
            : "border-[hsl(var(--border))] bg-[hsl(var(--muted))]"
        }`}
      >
        <span
          className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform duration-300 ${
            enabled ? "translate-x-5" : "translate-x-0"
          }`}
        />
      </button>
    </div>
  );
}