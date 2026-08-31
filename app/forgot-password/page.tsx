"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { Mail, ArrowLeft, Check } from 'lucide-react';
import { Reveal } from "@/components/Reveal";
import { fadeInUp } from "@/lib/motion";
import { createClient } from "@/lib/supabase/client";
import { BRAND } from "@/lib/data";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email.trim()) {
      setError("Please enter your email address.");
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("Please enter a valid email address.");
      return;
    }

    setLoading(true);
    try {
      const supabase = createClient();
      const redirectTo =
        window.location.origin + "/auth/callback?next=/profile-account";

      const { error: resetError } = await supabase.auth.resetPasswordForEmail(
        email,
        { redirectTo }
      );

      if (resetError) {
        setError(resetError.message);
        return;
      }

      setSuccess(true);
    } catch {
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main
      className="min-h-screen flex items-center justify-center px-4 py-16 mesh-bg"
      style={{ background: "var(--background)" }}
    >
      {/* Radial glow */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 overflow-hidden"
      >
        <div
          className="absolute -top-40 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full opacity-20"
          style={{
            background:
              "radial-gradient(circle, rgba(99,102,241,0.4) 0%, transparent 70%)",
          }}
        />
      </div>

      <Reveal className="w-full max-w-md relative z-10">
        <motion.div
          variants={fadeInUp}
          initial="hidden"
          animate="visible"
          className="glass rounded-2xl border border-[var(--border)] p-8 md:p-10 shadow-[0_2px_4px_rgba(0,0,0,0.12),0_24px_64px_-12px_rgba(0,0,0,0.5)]"
        >
          {/* Brand */}
          <div className="mb-8 text-center">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-[var(--primary)] shadow-[0_0_24px_rgba(99,102,241,0.4)] mb-4">
              <Mail className="w-6 h-6 text-white" aria-hidden="true" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-[var(--foreground)]">
              Reset Password
            </h1>
            <p className="mt-2 text-sm text-[var(--muted-foreground)]">
              Enter your email and we&apos;ll send you a reset link.
            </p>
          </div>

          {success ? (
            /* ── Success state ── */
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              className="flex flex-col items-center gap-4 py-4 text-center"
            >
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/15 border border-emerald-500/30">
                <Check className="h-7 w-7 text-emerald-400" aria-hidden="true" />
              </div>
              <div>
                <p className="font-semibold text-[var(--foreground)]">
                  Check your email
                </p>
                <p className="mt-1 text-sm text-[var(--muted-foreground)]">
                  We sent a password reset link to{" "}
                  <span className="font-medium text-[var(--foreground)]">
                    {email}
                  </span>
                  . Follow the link to set a new password.
                </p>
              </div>
              <Link
                href="/login"
                className="mt-2 inline-flex items-center gap-2 text-sm font-medium text-[var(--primary)] hover:underline transition-colors duration-200"
              >
                <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                Back to sign in
              </Link>
            </motion.div>
          ) : (
            /* ── Form state ── */
            <form onSubmit={handleSubmit} noValidate className="space-y-5">
              {/* Error banner */}
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-start gap-3 rounded-xl border border-red-800/50 bg-red-950/40 px-4 py-3 text-sm text-red-300"
                  role="alert"
                >
                  <span className="mt-0.5 shrink-0 text-red-400">⚠</span>
                  <span>{error}</span>
                </motion.div>
              )}

              {/* Email field */}
              <div>
                <label
                  htmlFor="email"
                  className="block text-sm font-medium text-[var(--foreground)] mb-1.5"
                >
                  Email address
                </label>
                <div className="relative">
                  <Mail
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--muted-foreground)] pointer-events-none"
                    aria-hidden="true"
                  />
                  <input
                    id="email"
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (error) setError(null);
                    }}
                    placeholder="you@example.com"
                    className="w-full bg-[var(--card)] border border-[var(--border)] rounded-xl pl-10 pr-4 py-3 text-[var(--foreground)] placeholder-[var(--muted-foreground)] focus:border-[var(--primary)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)] transition-colors duration-200 text-sm"
                    disabled={loading}
                  />
                </div>
              </div>

              {/* Submit button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-[var(--primary)] px-5 py-3 text-sm font-semibold text-white shadow-[0_0_20px_rgba(99,102,241,0.3)] hover:opacity-90 hover:shadow-[0_0_28px_rgba(99,102,241,0.45)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)] transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <svg
                      className="h-4 w-4 animate-spin"
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
                    Sending link...
                  </>
                ) : (
                  "Send reset link"
                )}
              </button>

              {/* Back to login */}
              <div className="text-center pt-1">
                <Link
                  href="/login"
                  className="inline-flex items-center gap-1.5 text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors duration-200"
                >
                  <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
                  Back to sign in
                </Link>
              </div>
            </form>
          )}
        </motion.div>

        {/* Brand footer */}
        <p className="mt-6 text-center text-xs text-[var(--muted-foreground)]">
          {BRAND.name} &mdash; Your finances, finally under control.
        </p>
      </Reveal>
    </main>
  );
}
