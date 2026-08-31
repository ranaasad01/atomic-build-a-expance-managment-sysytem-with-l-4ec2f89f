"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { Reveal } from "@/components/Reveal";
import { fadeInUp, staggerContainer } from "@/lib/motion";
import { createClient } from "@/lib/supabase/client";
import { User, Mail, Calendar, LogOut, Settings, Shield } from 'lucide-react';
import Link from "next/link";
import type { User as SupabaseUser } from "@supabase/supabase-js";

function formatMemberSince(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
}

function getInitials(email: string): string {
  const parts = email.split("@")[0].split(/[._-]/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return email.slice(0, 2).toUpperCase();
}

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) {
        router.replace("/login");
      } else {
        setUser(data.user);
      }
      setLoading(false);
    });
  }, [router]);

  const handleSignOut = async () => {
    setSigningOut(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    router.replace("/login");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--background)" }}>
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 rounded-full border-2 border-[var(--primary)] border-t-transparent animate-spin" />
          <p className="text-sm text-[var(--muted-foreground)]">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  const initials = getInitials(user.email ?? "U");
  const memberSince = user.created_at ? formatMemberSince(user.created_at) : "Unknown";
  const fullName = (user.user_metadata?.full_name as string | undefined) ?? "";

  return (
    <main
      className="min-h-screen mesh-bg py-24 px-4"
      style={{ background: "var(--background)" }}
    >
      <div className="max-w-2xl mx-auto">
        {/* Page header */}
        <Reveal>
          <motion.div
            variants={staggerContainer}
            initial="hidden"
            animate="visible"
            className="mb-10"
          >
            <motion.h1
              variants={fadeInUp}
              className="text-3xl font-bold tracking-tight text-[var(--foreground)]"
            >
              Profile
            </motion.h1>
            <motion.p
              variants={fadeInUp}
              className="mt-1 text-sm text-[var(--muted-foreground)]"
            >
              Manage your account and preferences.
            </motion.p>
          </motion.div>
        </Reveal>

        {/* Avatar + identity card */}
        <Reveal delay={0.05}>
          <div
            className="glass rounded-2xl border border-[var(--border)] p-8 mb-6 flex flex-col sm:flex-row items-center sm:items-start gap-6"
          >
            {/* Avatar circle */}
            <div
              className="flex-shrink-0 w-20 h-20 rounded-full flex items-center justify-center text-2xl font-bold text-white shadow-[0_0_24px_rgba(99,102,241,0.35)]"
              style={{ background: "linear-gradient(135deg, var(--primary) 0%, #8B5CF6 100%)" }}
              aria-label={`Avatar for ${user.email}`}
            >
              {initials}
            </div>

            {/* Identity */}
            <div className="flex-1 text-center sm:text-left">
              {fullName && (
                <h2 className="text-xl font-semibold text-[var(--foreground)] mb-1">
                  {fullName}
                </h2>
              )}
              <p className="text-[var(--muted-foreground)] text-sm flex items-center justify-center sm:justify-start gap-1.5">
                <Mail className="w-3.5 h-3.5 flex-shrink-0" aria-hidden="true" />
                {user.email}
              </p>
              <p className="mt-1.5 text-[var(--muted-foreground)] text-sm flex items-center justify-center sm:justify-start gap-1.5">
                <Calendar className="w-3.5 h-3.5 flex-shrink-0" aria-hidden="true" />
                Member since {memberSince}
              </p>
            </div>
          </div>
        </Reveal>

        {/* Account info card */}
        <Reveal delay={0.1}>
          <div className="glass rounded-2xl border border-[var(--border)] p-6 mb-6">
            <h3 className="text-sm font-semibold text-[var(--foreground)] mb-4 flex items-center gap-2">
              <User className="w-4 h-4 text-[var(--primary)]" aria-hidden="true" />
              Account Information
            </h3>
            <dl className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4">
                <dt className="text-xs font-medium text-[var(--muted-foreground)] uppercase tracking-wide w-28 flex-shrink-0">
                  Email
                </dt>
                <dd className="text-sm text-[var(--foreground)] font-mono bg-[var(--background)]/60 rounded-lg px-3 py-1.5 border border-[var(--border)] break-all">
                  {user.email}
                </dd>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4">
                <dt className="text-xs font-medium text-[var(--muted-foreground)] uppercase tracking-wide w-28 flex-shrink-0">
                  User ID
                </dt>
                <dd className="text-xs text-[var(--muted-foreground)] font-mono bg-[var(--background)]/60 rounded-lg px-3 py-1.5 border border-[var(--border)] break-all">
                  {user.id}
                </dd>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4">
                <dt className="text-xs font-medium text-[var(--muted-foreground)] uppercase tracking-wide w-28 flex-shrink-0">
                  Status
                </dt>
                <dd>
                  <span className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    Active
                  </span>
                </dd>
              </div>
            </dl>
          </div>
        </Reveal>

        {/* Quick links */}
        <Reveal delay={0.15}>
          <div className="glass rounded-2xl border border-[var(--border)] p-6 mb-6">
            <h3 className="text-sm font-semibold text-[var(--foreground)] mb-4 flex items-center gap-2">
              <Settings className="w-4 h-4 text-[var(--primary)]" aria-hidden="true" />
              Quick Links
            </h3>
            <div className="space-y-2">
              <Link
                href="/profile-account"
                className="flex items-center justify-between w-full rounded-xl px-4 py-3 border border-[var(--border)] bg-[var(--background)]/40 hover:border-[var(--primary)]/50 hover:bg-[var(--primary)]/5 transition-all duration-200 group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-[var(--primary)]/10 flex items-center justify-center">
                    <Settings className="w-4 h-4 text-[var(--primary)]" aria-hidden="true" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-[var(--foreground)]">Account Settings</p>
                    <p className="text-xs text-[var(--muted-foreground)]">Update name, email, and password</p>
                  </div>
                </div>
                <svg
                  className="w-4 h-4 text-[var(--muted-foreground)] group-hover:text-[var(--primary)] transition-colors duration-200"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                  aria-hidden="true"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </Link>

              <Link
                href="/budget-settings"
                className="flex items-center justify-between w-full rounded-xl px-4 py-3 border border-[var(--border)] bg-[var(--background)]/40 hover:border-[var(--accent)]/50 hover:bg-[var(--accent)]/5 transition-all duration-200 group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-[var(--accent)]/10 flex items-center justify-center">
                    <Shield className="w-4 h-4 text-[var(--accent)]" aria-hidden="true" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-[var(--foreground)]">Budget Settings</p>
                    <p className="text-xs text-[var(--muted-foreground)]">Set monthly limits per category</p>
                  </div>
                </div>
                <svg
                  className="w-4 h-4 text-[var(--muted-foreground)] group-hover:text-[var(--accent)] transition-colors duration-200"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                  aria-hidden="true"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            </div>
          </div>
        </Reveal>

        {/* Sign out */}
        <Reveal delay={0.2}>
          <div className="glass rounded-2xl border border-[var(--border)] p-6">
            <h3 className="text-sm font-semibold text-[var(--foreground)] mb-4 flex items-center gap-2">
              <LogOut className="w-4 h-4 text-[var(--destructive)]" aria-hidden="true" />
              Session
            </h3>
            <p className="text-sm text-[var(--muted-foreground)] mb-4">
              You are currently signed in as <span className="text-[var(--foreground)] font-medium">{user.email}</span>. Signing out will end your session on this device.
            </p>
            <motion.button
              onClick={handleSignOut}
              disabled={signingOut}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold border border-[var(--destructive)]/40 text-[var(--destructive)] bg-[var(--destructive)]/5 hover:bg-[var(--destructive)]/15 hover:border-[var(--destructive)]/60 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {signingOut ? (
                <>
                  <div className="w-4 h-4 rounded-full border-2 border-[var(--destructive)] border-t-transparent animate-spin" />
                  Signing out...
                </>
              ) : (
                <>
                  <LogOut className="w-4 h-4" aria-hidden="true" />
                  Sign Out
                </>
              )}
            </motion.button>
          </div>
        </Reveal>
      </div>
    </main>
  );
}
