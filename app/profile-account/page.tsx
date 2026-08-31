"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { User, Mail, Lock, Save, AlertCircle, Check, ArrowLeft } from 'lucide-react';
import { Reveal } from "@/components/Reveal";
import { fadeInUp, staggerContainer } from "@/lib/motion";
import { createClient } from "@/lib/supabase/client";
import type { User as SupabaseUser } from "@supabase/supabase-js";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const inputCls =
  "w-full bg-[var(--background)] border border-[var(--border)] rounded-xl px-4 py-3 text-[var(--foreground)] placeholder-[var(--muted-foreground)] focus:border-[var(--primary)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)] transition-colors duration-200 text-sm";

const labelCls = "block text-sm font-medium text-[var(--foreground)] mb-1.5";

type FeedbackState = { type: "success" | "error"; message: string } | null;

// ─── Section Card ─────────────────────────────────────────────────────────────

function SectionCard({
  icon: Icon,
  title,
  description,
  children,
}: {
  icon: React.ElementType;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] shadow-[0_1px_2px_rgba(0,0,0,0.08),0_8px_24px_-8px_rgba(0,0,0,0.24)] overflow-hidden">
      <div className="px-6 py-5 border-b border-[var(--border)] flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-[var(--primary)]/15 flex items-center justify-center flex-shrink-0">
          <Icon className="w-4 h-4 text-[var(--primary)]" aria-hidden="true" />
        </div>
        <div>
          <h2 className="text-base font-semibold text-[var(--foreground)] tracking-tight">{title}</h2>
          <p className="text-xs text-[var(--muted-foreground)] mt-0.5">{description}</p>
        </div>
      </div>
      <div className="px-6 py-6">{children}</div>
    </div>
  );
}

// ─── Feedback Banner ──────────────────────────────────────────────────────────

function FeedbackBanner({ feedback }: { feedback: FeedbackState }) {
  if (!feedback) return null;
  const isSuccess = feedback.type === "success";
  return (
    <motion.div
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      className={`flex items-center gap-2.5 rounded-xl px-4 py-3 text-sm font-medium border mt-4 ${
        isSuccess
          ? "bg-emerald-950/60 border-emerald-700/40 text-emerald-300"
          : "bg-red-950/60 border-red-700/40 text-red-300"
      }`}
    >
      {isSuccess ? (
        <Check className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
      ) : (
        <AlertCircle className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
      )}
      {feedback.message}
    </motion.div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ProfileAccountPage() {
  const router = useRouter();
  const supabase = createClient();

  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [loading, setLoading] = useState(true);

  // Display name form
  const [displayName, setDisplayName] = useState("");
  const [nameSaving, setNameSaving] = useState(false);
  const [nameFeedback, setNameFeedback] = useState<FeedbackState>(null);

  // Email form
  const [newEmail, setNewEmail] = useState("");
  const [emailSaving, setEmailSaving] = useState(false);
  const [emailFeedback, setEmailFeedback] = useState<FeedbackState>(null);

  // Password form
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordFeedback, setPasswordFeedback] = useState<FeedbackState>(null);

  // ── Fetch user on mount ──────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;

    async function fetchUser() {
      const { data, error } = await supabase.auth.getUser();
      if (cancelled) return;

      if (error || !data.user) {
        router.replace("/login");
        return;
      }

      setUser(data.user);
      setDisplayName(data.user.user_metadata?.full_name ?? "");
      setNewEmail(data.user.email ?? "");
      setLoading(false);
    }

    fetchUser();
    return () => { cancelled = true; };
  }, [router, supabase.auth]);

  // ── Update display name ──────────────────────────────────────────────────────
  async function handleSaveName(e: React.FormEvent) {
    e.preventDefault();
    if (!displayName.trim()) {
      setNameFeedback({ type: "error", message: "Display name cannot be empty." });
      return;
    }
    setNameSaving(true);
    setNameFeedback(null);

    const { error } = await supabase.auth.updateUser({
      data: { full_name: displayName.trim() },
    });

    if (error) {
      setNameFeedback({ type: "error", message: error.message });
    } else {
      // Also update profiles table if it exists
      if (user?.id) {
        await supabase
          .from("profiles")
          .update({ full_name: displayName.trim(), updated_at: new Date().toISOString() })
          .eq("id", user.id);
      }
      setNameFeedback({ type: "success", message: "Display name updated successfully." });
    }

    setNameSaving(false);
    setTimeout(() => setNameFeedback(null), 5000);
  }

  // ── Update email ─────────────────────────────────────────────────────────────
  async function handleSaveEmail(e: React.FormEvent) {
    e.preventDefault();
    if (!newEmail.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail)) {
      setEmailFeedback({ type: "error", message: "Please enter a valid email address." });
      return;
    }
    if (newEmail === user?.email) {
      setEmailFeedback({ type: "error", message: "This is already your current email address." });
      return;
    }
    setEmailSaving(true);
    setEmailFeedback(null);

    const { error } = await supabase.auth.updateUser({ email: newEmail.trim() });

    if (error) {
      setEmailFeedback({ type: "error", message: error.message });
    } else {
      setEmailFeedback({
        type: "success",
        message: "Confirmation email sent. Check your inbox to verify the new address.",
      });
    }

    setEmailSaving(false);
    setTimeout(() => setEmailFeedback(null), 8000);
  }

  // ── Update password ──────────────────────────────────────────────────────────
  async function handleSavePassword(e: React.FormEvent) {
    e.preventDefault();
    if (!newPassword) {
      setPasswordFeedback({ type: "error", message: "Please enter a new password." });
      return;
    }
    if (newPassword.length < 8) {
      setPasswordFeedback({ type: "error", message: "Password must be at least 8 characters." });
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordFeedback({ type: "error", message: "Passwords do not match." });
      return;
    }
    setPasswordSaving(true);
    setPasswordFeedback(null);

    const { error } = await supabase.auth.updateUser({ password: newPassword });

    if (error) {
      setPasswordFeedback({ type: "error", message: error.message });
    } else {
      setPasswordFeedback({ type: "success", message: "Password updated successfully." });
      setNewPassword("");
      setConfirmPassword("");
    }

    setPasswordSaving(false);
    setTimeout(() => setPasswordFeedback(null), 5000);
  }

  // ── Loading skeleton ─────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen mesh-bg flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 rounded-full border-2 border-[var(--primary)] border-t-transparent animate-spin" />
          <p className="text-sm text-[var(--muted-foreground)]">Loading account settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen mesh-bg pt-24 pb-16 px-4">
      <div className="max-w-2xl mx-auto">
        {/* ── Page Header ── */}
        <Reveal>
          <motion.div
            variants={staggerContainer}
            initial="hidden"
            animate="visible"
            className="mb-8"
          >
            <motion.div variants={fadeInUp}>
              <Link
                href="/profile"
                className="inline-flex items-center gap-2 text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors duration-200 mb-6 group"
              >
                <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform duration-200" aria-hidden="true" />
                Back to Profile
              </Link>
            </motion.div>

            <motion.div variants={fadeInUp}>
              <h1 className="text-3xl font-bold tracking-tight text-[var(--foreground)]">
                Account Settings
              </h1>
              <p className="mt-2 text-[var(--muted-foreground)] text-sm">
                Manage your display name, email address, and password.
              </p>
            </motion.div>

            {/* Current account info pill */}
            <motion.div
              variants={fadeInUp}
              className="mt-4 inline-flex items-center gap-2 rounded-full px-4 py-1.5 bg-[var(--primary)]/10 border border-[var(--primary)]/20 text-xs text-[var(--primary)] font-medium"
            >
              <div className="w-1.5 h-1.5 rounded-full bg-[var(--primary)] animate-pulse" />
              Signed in as {user?.email}
            </motion.div>
          </motion.div>
        </Reveal>

        {/* ── Forms ── */}
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
          className="space-y-6"
        >
          {/* Display Name */}
          <Reveal>
            <motion.div variants={fadeInUp}>
              <SectionCard
                icon={User}
                title="Display Name"
                description="This name appears across your ExpenseIQ account."
              >
                <form onSubmit={handleSaveName} noValidate>
                  <div>
                    <label htmlFor="display-name" className={labelCls}>
                      Full Name
                    </label>
                    <div className="relative">
                      <User
                        className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--muted-foreground)] pointer-events-none"
                        aria-hidden="true"
                      />
                      <input
                        id="display-name"
                        type="text"
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        placeholder="Your full name"
                        className={`${inputCls} pl-10`}
                        autoComplete="name"
                        disabled={nameSaving}
                      />
                    </div>
                  </div>

                  <FeedbackBanner feedback={nameFeedback} />

                  <div className="mt-4 flex justify-end">
                    <button
                      type="submit"
                      disabled={nameSaving}
                      className="inline-flex items-center gap-2 rounded-xl bg-[var(--primary)] px-5 py-2.5 text-sm font-semibold text-white transition-all duration-200 hover:opacity-90 hover:shadow-[0_0_20px_rgba(99,102,241,0.35)] disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--card)]"
                    >
                      {nameSaving ? (
                        <>
                          <div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <Save className="w-4 h-4" aria-hidden="true" />
                          Save Name
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </SectionCard>
            </motion.div>
          </Reveal>

          {/* Email */}
          <Reveal>
            <motion.div variants={fadeInUp}>
              <SectionCard
                icon={Mail}
                title="Email Address"
                description="Update the email address associated with your account. A confirmation link will be sent."
              >
                <form onSubmit={handleSaveEmail} noValidate>
                  <div>
                    <label htmlFor="new-email" className={labelCls}>
                      New Email Address
                    </label>
                    <div className="relative">
                      <Mail
                        className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--muted-foreground)] pointer-events-none"
                        aria-hidden="true"
                      />
                      <input
                        id="new-email"
                        type="email"
                        value={newEmail}
                        onChange={(e) => setNewEmail(e.target.value)}
                        placeholder="you@example.com"
                        className={`${inputCls} pl-10`}
                        autoComplete="email"
                        disabled={emailSaving}
                      />
                    </div>
                  </div>

                  <FeedbackBanner feedback={emailFeedback} />

                  <div className="mt-4 flex justify-end">
                    <button
                      type="submit"
                      disabled={emailSaving}
                      className="inline-flex items-center gap-2 rounded-xl bg-[var(--primary)] px-5 py-2.5 text-sm font-semibold text-white transition-all duration-200 hover:opacity-90 hover:shadow-[0_0_20px_rgba(99,102,241,0.35)] disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--card)]"
                    >
                      {emailSaving ? (
                        <>
                          <div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <Save className="w-4 h-4" aria-hidden="true" />
                          Update Email
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </SectionCard>
            </motion.div>
          </Reveal>

          {/* Password */}
          <Reveal>
            <motion.div variants={fadeInUp}>
              <SectionCard
                icon={Lock}
                title="Change Password"
                description="Choose a strong password with at least 8 characters."
              >
                <form onSubmit={handleSavePassword} noValidate>
                  <div className="space-y-4">
                    <div>
                      <label htmlFor="new-password" className={labelCls}>
                        New Password
                      </label>
                      <div className="relative">
                        <Lock
                          className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--muted-foreground)] pointer-events-none"
                          aria-hidden="true"
                        />
                        <input
                          id="new-password"
                          type="password"
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          placeholder="Min. 8 characters"
                          className={`${inputCls} pl-10`}
                          autoComplete="new-password"
                          disabled={passwordSaving}
                        />
                      </div>
                    </div>

                    <div>
                      <label htmlFor="confirm-password" className={labelCls}>
                        Confirm New Password
                      </label>
                      <div className="relative">
                        <Lock
                          className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--muted-foreground)] pointer-events-none"
                          aria-hidden="true"
                        />
                        <input
                          id="confirm-password"
                          type="password"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          placeholder="Repeat new password"
                          className={`${inputCls} pl-10`}
                          autoComplete="new-password"
                          disabled={passwordSaving}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Password strength indicator */}
                  {newPassword.length > 0 && (
                    <div className="mt-3">
                      <div className="flex gap-1 mb-1">
                        {[1, 2, 3, 4].map((level) => {
                          const score = Math.min(
                            4,
                            [newPassword.length >= 8, /[A-Z]/.test(newPassword), /[0-9]/.test(newPassword), /[^A-Za-z0-9]/.test(newPassword)].filter(Boolean).length
                          );
                          const filled = level <= score;
                          const color =
                            score <= 1 ? "#EF4444" : score === 2 ? "#F59E0B" : score === 3 ? "#6366F1" : "#10B981";
                          return (
                            <div
                              key={level}
                              className="h-1 flex-1 rounded-full transition-all duration-300"
                              style={{
                                backgroundColor: filled ? color : "var(--border)",
                              }}
                            />
                          );
                        })}
                      </div>
                      <p className="text-xs text-[var(--muted-foreground)]">
                        {[newPassword.length >= 8, /[A-Z]/.test(newPassword), /[0-9]/.test(newPassword), /[^A-Za-z0-9]/.test(newPassword)].filter(Boolean).length <= 1
                          ? "Weak"
                          : [newPassword.length >= 8, /[A-Z]/.test(newPassword), /[0-9]/.test(newPassword), /[^A-Za-z0-9]/.test(newPassword)].filter(Boolean).length === 2
                          ? "Fair"
                          : [newPassword.length >= 8, /[A-Z]/.test(newPassword), /[0-9]/.test(newPassword), /[^A-Za-z0-9]/.test(newPassword)].filter(Boolean).length === 3
                          ? "Good"
                          : "Strong"}{" "}
                        password
                      </p>
                    </div>
                  )}

                  <FeedbackBanner feedback={passwordFeedback} />

                  <div className="mt-4 flex justify-end">
                    <button
                      type="submit"
                      disabled={passwordSaving}
                      className="inline-flex items-center gap-2 rounded-xl bg-[var(--primary)] px-5 py-2.5 text-sm font-semibold text-white transition-all duration-200 hover:opacity-90 hover:shadow-[0_0_20px_rgba(99,102,241,0.35)] disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--card)]"
                    >
                      {passwordSaving ? (
                        <>
                          <div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <Save className="w-4 h-4" aria-hidden="true" />
                          Update Password
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </SectionCard>
            </motion.div>
          </Reveal>

          {/* Danger zone */}
          <Reveal>
            <motion.div variants={fadeInUp}>
              <div className="rounded-2xl border border-red-800/40 bg-red-950/20 p-6">
                <h2 className="text-base font-semibold text-red-400 mb-1">Danger Zone</h2>
                <p className="text-xs text-red-400/70 mb-4">
                  Deleting your account is permanent and cannot be undone. All your data will be removed.
                </p>
                <button
                  type="button"
                  className="inline-flex items-center gap-2 rounded-xl border border-red-700/50 bg-red-950/40 px-4 py-2 text-sm font-medium text-red-400 transition-all duration-200 hover:bg-red-900/40 hover:border-red-600/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
                  onClick={() => {
                    // Placeholder — real deletion requires a server-side function
                    window.alert("To delete your account, please contact support@expenseiq.app");
                  }}
                >
                  <AlertCircle className="w-4 h-4" aria-hidden="true" />
                  Delete Account
                </button>
              </div>
            </motion.div>
          </Reveal>
        </motion.div>
      </div>
    </div>
  );
}
