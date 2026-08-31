"use client";

import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { User, Mail, DollarSign, Camera, Save, AlertCircle, CheckCircle, Loader2, Edit2 } from 'lucide-react';
import { Reveal } from "@/components/Reveal";
import { fadeInUp, staggerContainer } from "@/lib/motion";
import { BRAND } from "@/lib/data";
type DEFAULT_CURRENCY = any;
const DEFAULT_CURRENCY: any = [];
type CURRENCY_SYMBOL = any;
const CURRENCY_SYMBOL: any = [];
type formatCurrency = any;
const formatCurrency: any = [];
type formatDate = any;
const formatDate: any = [];
type ProfileRow = any;
const ProfileRow: any = [];
import { createClient } from "@/lib/supabase/client";

const SUPPORTED_CURRENCIES = [
  { code: "USD", symbol: "$", label: "US Dollar" },
  { code: "EUR", symbol: "€", label: "Euro" },
  { code: "GBP", symbol: "£", label: "British Pound" },
  { code: "JPY", symbol: "¥", label: "Japanese Yen" },
  { code: "CAD", symbol: "CA$", label: "Canadian Dollar" },
  { code: "AUD", symbol: "A$", label: "Australian Dollar" },
  { code: "INR", symbol: "₹", label: "Indian Rupee" },
  { code: "CHF", symbol: "Fr", label: "Swiss Franc" },
];

interface ProfileForm {
  full_name: string;
  preferred_currency: string;
}

interface Stats {
  totalExpenses: number;
  totalSpent: number;
  avgMonthly: number;
  categoriesUsed: number;
}

export default function ProfilePage() {
  const supabase = createClient();

  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [userEmail, setUserEmail] = useState<string>("");
  const [form, setForm] = useState<ProfileForm>({ full_name: "", preferred_currency: DEFAULT_CURRENCY });
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [stats, setStats] = useState<Stats>({ totalExpenses: 0, totalSpent: 0, avgMonthly: 0, categoriesUsed: 0 });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "success" | "error">("idle");
  const [saveMessage, setSaveMessage] = useState("");
  const [editingName, setEditingName] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    async function loadProfile() {
      setLoading(true);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        setUserEmail(user.email ?? "");

        const { data: profileData } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .single();

        if (profileData) {
          setProfile(profileData as ProfileRow);
          setForm({
            full_name: profileData.full_name ?? "",
            preferred_currency: profileData.preferred_currency ?? DEFAULT_CURRENCY,
          });
          if (profileData.avatar_url) {
            const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(profileData.avatar_url);
            setAvatarUrl(urlData.publicUrl);
          }
        }

        const { data: expenses } = await supabase
          .from("expenses")
          .select("amount, currency, expense_date, category_id")
          .eq("user_id", user.id);

        if (expenses && expenses.length > 0) {
          const total = expenses.reduce((sum, e) => sum + parseFloat(e.amount), 0);
          const uniqueCategories = new Set(expenses.map((e) => e.category_id)).size;
          const dates = expenses.map((e) => e.expense_date).sort();
          const firstDate = new Date(dates[0]);
          const lastDate = new Date(dates[dates.length - 1]);
          const monthsDiff = Math.max(
            1,
            (lastDate.getFullYear() - firstDate.getFullYear()) * 12 +
              (lastDate.getMonth() - firstDate.getMonth()) + 1
          );
          setStats({
            totalExpenses: expenses.length,
            totalSpent: total,
            avgMonthly: total / monthsDiff,
            categoriesUsed: uniqueCategories,
          });
        }
      } finally {
        setLoading(false);
      }
    }
    loadProfile();
  }, []);

  function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setAvatarPreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  }

  async function uploadAvatar(userId: string): Promise<string | null> {
    if (!avatarFile) return profile?.avatar_url ?? null;
    setUploadingAvatar(true);
    try {
      const ext = avatarFile.name.split(".").pop();
      const path = `${userId}/avatar.${ext}`;
      const { error } = await supabase.storage.from("avatars").upload(path, avatarFile, { upsert: true });
      if (error) throw error;
      return path;
    } finally {
      setUploadingAvatar(false);
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSaveStatus("idle");
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const avatarPath = await uploadAvatar(user.id);

      const updates = {
        id: user.id,
        full_name: form.full_name.trim() || null,
        preferred_currency: form.preferred_currency,
        avatar_url: avatarPath,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase.from("profiles").upsert(updates);
      if (error) throw error;

      if (avatarPath) {
        const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(avatarPath);
        setAvatarUrl(urlData.publicUrl);
      }
      setAvatarFile(null);
      setAvatarPreview(null);
      setSaveStatus("success");
      setSaveMessage("Profile updated successfully.");
      setEditingName(false);
    } catch (err: unknown) {
      setSaveStatus("error");
      setSaveMessage(err instanceof Error ? err.message : "Failed to save profile.");
    } finally {
      setSaving(false);
      setTimeout(() => setSaveStatus("idle"), 4000);
    }
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
    window.location.href = "/login";
  }

  const displayAvatar = avatarPreview ?? avatarUrl;
  const initials = (form.full_name || userEmail || "U")
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[var(--accent)]" />
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-[hsl(var(--background))] pb-24">
      {/* Header */}
      <Reveal>
        <section className="border-b border-[hsl(var(--border))] bg-[hsl(var(--card))] px-4 py-10 md:py-14">
          <div className="mx-auto max-w-3xl">
            <h1 className="text-3xl font-bold tracking-tight text-[hsl(var(--foreground))] md:text-4xl">
              Your Profile
            </h1>
            <p className="mt-2 text-[hsl(var(--muted-foreground))]">
              Manage your account details, avatar, and preferences.
            </p>
          </div>
        </section>
      </Reveal>

      <div className="mx-auto max-w-3xl px-4 pt-10 space-y-8">
        {/* Avatar + Identity Card */}
        <Reveal>
          <div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_8px_24px_-8px_rgba(0,0,0,0.10)]">
            <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-start">
              {/* Avatar */}
              <div className="relative flex-shrink-0">
                <div className="h-24 w-24 rounded-full overflow-hidden border-2 border-[var(--accent)]/30 shadow-md">
                  {displayAvatar ? (
                    <img
                      src={displayAvatar}
                      alt={form.full_name || "Avatar"}
                      className="h-full w-full object-cover"
                      onError={() => setAvatarUrl(null)}
                    />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center bg-[var(--accent)]/10 text-[var(--accent)] text-2xl font-bold">
                      {initials}
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute -bottom-1 -right-1 rounded-full bg-[var(--accent)] p-1.5 text-white shadow-md hover:opacity-90 transition-opacity"
                  aria-label="Change avatar"
                >
                  <Camera className="h-3.5 w-3.5" />
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleAvatarChange}
                />
              </div>

              {/* Name + email */}
              <div className="flex-1 text-center sm:text-left">
                <div className="flex items-center justify-center sm:justify-start gap-2">
                  {editingName ? (
                    <input
                      type="text"
                      value={form.full_name}
                      onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))}
                      className="text-xl font-semibold bg-transparent border-b border-[var(--accent)] text-[hsl(var(--foreground))] outline-none pb-0.5 w-48"
                      autoFocus
                      onBlur={() => setEditingName(false)}
                      onKeyDown={(e) => e.key === "Enter" && setEditingName(false)}
                    />
                  ) : (
                    <span className="text-xl font-semibold text-[hsl(var(--foreground))]">
                      {form.full_name || "Unnamed User"}
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => setEditingName(true)}
                    className="text-[hsl(var(--muted-foreground))] hover:text-[var(--accent)] transition-colors"
                    aria-label="Edit name"
                  >
                    <Edit2 className="h-4 w-4" />
                  </button>
                </div>
                <div className="mt-1 flex items-center justify-center sm:justify-start gap-1.5 text-sm text-[hsl(var(--muted-foreground))]">
                  <Mail className="h-3.5 w-3.5" />
                  <span>{userEmail}</span>
                </div>
                {avatarFile && (
                  <p className="mt-2 text-xs text-[var(--accent)]">
                    New avatar selected. Save to apply.
                  </p>
                )}
              </div>
            </div>
          </div>
        </Reveal>

        {/* Stats Row */}
        <Reveal>
          <motion.div
            variants={staggerContainer}
            initial="hidden"
            animate="visible"
            className="grid grid-cols-2 gap-4 sm:grid-cols-4"
          >
            {[
              { label: "Total Expenses", value: stats.totalExpenses.toString(), icon: "📋" },
              { label: "Total Spent", value: formatCurrency(stats.totalSpent, form.preferred_currency), icon: "💸" },
              { label: "Avg. Monthly", value: formatCurrency(stats.avgMonthly, form.preferred_currency), icon: "📅" },
              { label: "Categories Used", value: stats.categoriesUsed.toString(), icon: "🏷️" },
            ].map((stat, i) => (
              <motion.div
                key={stat.label}
                variants={fadeInUp}
                className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-4 text-center shadow-[0_1px_2px_rgba(0,0,0,0.04),0_4px_12px_-4px_rgba(0,0,0,0.08)]"
              >
                <div className="text-2xl mb-1">{stat.icon}</div>
                <div className="text-lg font-bold text-[hsl(var(--foreground))] leading-tight">{stat.value}</div>
                <div className="text-xs text-[hsl(var(--muted-foreground))] mt-0.5">{stat.label}</div>
              </motion.div>
            ))}
          </motion.div>
        </Reveal>

        {/* Profile Settings Form */}
        <Reveal>
          <form
            onSubmit={handleSave}
            className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_8px_24px_-8px_rgba(0,0,0,0.10)] space-y-6"
          >
            <div>
              <h2 className="text-lg font-semibold text-[hsl(var(--foreground))]">Account Settings</h2>
              <p className="text-sm text-[hsl(var(--muted-foreground))] mt-0.5">Update your display name and currency preference.</p>
            </div>

            {/* Full Name */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-[hsl(var(--foreground))]" htmlFor="full_name">
                Display Name
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[hsl(var(--muted-foreground))]" />
                <input
                  id="full_name"
                  type="text"
                  value={form.full_name}
                  onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))}
                  placeholder="Your full name"
                  className="w-full rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] pl-10 pr-4 py-2.5 text-sm text-[hsl(var(--foreground))] placeholder:text-[hsl(var(--muted-foreground))] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/40 transition"
                />
              </div>
            </div>

            {/* Email (read-only) */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-[hsl(var(--foreground))]" htmlFor="email">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[hsl(var(--muted-foreground))]" />
                <input
                  id="email"
                  type="email"
                  value={userEmail}
                  readOnly
                  className="w-full rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--muted))]/30 pl-10 pr-4 py-2.5 text-sm text-[hsl(var(--muted-foreground))] cursor-not-allowed"
                />
              </div>
              <p className="text-xs text-[hsl(var(--muted-foreground))]">Email cannot be changed here.</p>
            </div>

            {/* Preferred Currency */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-[hsl(var(--foreground))]" htmlFor="currency">
                Preferred Currency
              </label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[hsl(var(--muted-foreground))]" />
                <select
                  id="currency"
                  value={form.preferred_currency}
                  onChange={(e) => setForm((f) => ({ ...f, preferred_currency: e.target.value }))}
                  className="w-full rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] pl-10 pr-4 py-2.5 text-sm text-[hsl(var(--foreground))] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/40 transition appearance-none"
                >
                  {SUPPORTED_CURRENCIES.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.symbol} — {c.label} ({c.code})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Save Status */}
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
                  <CheckCircle className="h-4 w-4 flex-shrink-0" />
                ) : (
                  <AlertCircle className="h-4 w-4 flex-shrink-0" />
                )}
                {saveMessage}
              </motion.div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={saving || uploadingAvatar}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--accent)] px-6 py-2.5 text-sm font-semibold text-white shadow-sm hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--accent)] transition-all disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {saving || uploadingAvatar ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              {saving ? "Saving..." : uploadingAvatar ? "Uploading avatar..." : "Save Changes"}
            </button>
          </form>
        </Reveal>

        {/* Danger Zone */}
        <Reveal>
          <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-6 space-y-4">
            <div>
              <h2 className="text-lg font-semibold text-red-600">Danger Zone</h2>
              <p className="text-sm text-[hsl(var(--muted-foreground))] mt-0.5">
                Actions here are permanent or require re-authentication.
              </p>
            </div>
            <button
              type="button"
              onClick={handleSignOut}
              className="rounded-xl border border-red-500/30 bg-white/5 px-5 py-2.5 text-sm font-semibold text-red-600 hover:bg-red-500/10 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-red-500"
            >
              Sign Out
            </button>
          </div>
        </Reveal>
      </div>
    </main>
  );
}