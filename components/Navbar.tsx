"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X, Sparkles, LogOut, User } from 'lucide-react';
import { useTranslations } from "next-intl";
import { navLinks, BRAND } from "@/lib/data";
import { createClient } from "@/lib/supabase/client";

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const t = useTranslations();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [user, setUser] = useState<{ email?: string } | null>(null);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const navT = (Array.isArray(t.raw("nav")) ? {} : t.raw("nav")) as Record<string, string>;

  const isAuthPage =
    pathname === "/login" || pathname === "/signup";

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 16);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user ?? null);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  };

  const handleNavClick = (
    e: React.MouseEvent<HTMLAnchorElement>,
    href: string
  ) => {
    if (href.startsWith("#")) {
      if (pathname === "/") {
        e.preventDefault();
        document.querySelector(href)?.scrollIntoView({ behavior: "smooth" });
      }
    }
    setMobileOpen(false);
  };

  const getLinkHref = (href: string) => {
    if (href.startsWith("#")) {
      return pathname === "/" ? href : "/" + href;
    }
    return href;
  };

  return (
    <motion.header
      initial={{ opacity: 0, y: -16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? "glass shadow-[0_4px_24px_rgba(0,0,0,0.45),0_1px_4px_rgba(99,102,241,0.08)]"
          : "bg-transparent"
      }`}
    >
      <nav
        className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16"
        aria-label="Main navigation"
      >
        {/* Logo */}
        <Link
          href={user ? "/dashboard" : "/"}
          className="flex items-center gap-2 group"
          aria-label={`${BRAND.name} home`}
        >
          <div className="w-8 h-8 rounded-lg bg-[var(--primary)] flex items-center justify-center shadow-[0_0_16px_rgba(99,102,241,0.4)] group-hover:shadow-[0_0_24px_rgba(99,102,241,0.6)] transition-shadow duration-300">
            <Sparkles className="w-4 h-4 text-white" aria-hidden="true" />
          </div>
          <span className="text-[var(--foreground)] font-bold text-lg tracking-tight">
            {BRAND.name}
          </span>
        </Link>

        {/* Desktop nav */}
        {!isAuthPage && user && (
          <div className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => {
              const isActive = pathname === link.href || pathname.startsWith(link.href + "/");
              return (
                <Link
                  key={link.key}
                  href={getLinkHref(link.href)}
                  onClick={(e) => handleNavClick(e, link.href)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                    isActive
                      ? "bg-[var(--primary)]/20 text-[var(--primary)]"
                      : "text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-white/5"
                  }`}
                  aria-current={isActive ? "page" : undefined}
                >
                  {navT[link.key] ?? link.label}
                </Link>
              );
            })}
          </div>
        )}

        {/* Desktop right actions */}
        <div className="hidden md:flex items-center gap-3">
          {user ? (
            <div className="relative">
              <button
                onClick={() => setUserMenuOpen((v) => !v)}
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-white/5 transition-all duration-200"
                aria-label="User menu"
                aria-expanded={userMenuOpen}
              >
                <div className="w-7 h-7 rounded-full bg-[var(--primary)]/20 border border-[var(--primary)]/30 flex items-center justify-center">
                  <User className="w-3.5 h-3.5 text-[var(--primary)]" aria-hidden="true" />
                </div>
                <span className="max-w-[120px] truncate">{user.email}</span>
              </button>
              <AnimatePresence>
                {userMenuOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 8, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 8, scale: 0.95 }}
                    transition={{ duration: 0.15 }}
                    className="absolute right-0 top-full mt-2 w-48 glass rounded-xl shadow-[0_4px_24px_rgba(0,0,0,0.45)] overflow-hidden"
                  >
                    <Link
                      href="/profile"
                      onClick={() => setUserMenuOpen(false)}
                      className="flex items-center gap-2 px-4 py-3 text-sm text-[var(--foreground)] hover:bg-white/5 transition-colors"
                    >
                      <User className="w-4 h-4 text-[var(--muted-foreground)]" aria-hidden="true" />
                      Profile
                    </Link>
                    <button
                      onClick={() => { setUserMenuOpen(false); handleLogout(); }}
                      className="w-full flex items-center gap-2 px-4 py-3 text-sm text-[var(--destructive)] hover:bg-white/5 transition-colors"
                    >
                      <LogOut className="w-4 h-4" aria-hidden="true" />
                      Sign out
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ) : (
            !isAuthPage && (
              <>
                <Link
                  href="/login"
                  className="px-4 py-2 rounded-lg text-sm font-medium text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-white/5 transition-all duration-200"
                >
                  Sign in
                </Link>
                <Link
                  href="/signup"
                  className="px-4 py-2 rounded-lg text-sm font-medium bg-[var(--primary)] text-white hover:bg-[var(--primary)]/90 shadow-[0_0_16px_rgba(99,102,241,0.3)] hover:shadow-[0_0_24px_rgba(99,102,241,0.5)] transition-all duration-200"
                >
                  Get started
                </Link>
              </>
            )
          )}
        </div>

        {/* Mobile menu button */}
        <button
          className="md:hidden p-2 rounded-lg text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-white/5 transition-all duration-200"
          onClick={() => setMobileOpen((v) => !v)}
          aria-label={mobileOpen ? "Close menu" : "Open menu"}
          aria-expanded={mobileOpen}
        >
          {mobileOpen ? (
            <X className="w-5 h-5" aria-hidden="true" />
          ) : (
            <Menu className="w-5 h-5" aria-hidden="true" />
          )}
        </button>
      </nav>

      {/* Mobile menu */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="md:hidden glass border-t border-[var(--border)] overflow-hidden"
          >
            <div className="px-4 py-4 flex flex-col gap-1">
              {user &&
                navLinks.map((link) => {
                  const isActive = pathname === link.href;
                  return (
                    <Link
                      key={link.key}
                      href={getLinkHref(link.href)}
                      onClick={(e) => handleNavClick(e, link.href)}
                      className={`px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 ${
                        isActive
                          ? "bg-[var(--primary)]/20 text-[var(--primary)]"
                          : "text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-white/5"
                      }`}
                    >
                      {navT[link.key] ?? link.label}
                    </Link>
                  );
                })}
              {user ? (
                <button
                  onClick={handleLogout}
                  className="mt-2 flex items-center gap-2 px-4 py-3 rounded-lg text-sm font-medium text-[var(--destructive)] hover:bg-white/5 transition-all duration-200"
                >
                  <LogOut className="w-4 h-4" aria-hidden="true" />
                  Sign out
                </button>
              ) : (
                !isAuthPage && (
                  <div className="flex flex-col gap-2 mt-2">
                    <Link
                      href="/login"
                      onClick={() => setMobileOpen(false)}
                      className="px-4 py-3 rounded-lg text-sm font-medium text-center text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-white/5 transition-all duration-200"
                    >
                      Sign in
                    </Link>
                    <Link
                      href="/signup"
                      onClick={() => setMobileOpen(false)}
                      className="px-4 py-3 rounded-lg text-sm font-medium text-center bg-[var(--primary)] text-white hover:bg-[var(--primary)]/90 transition-all duration-200"
                    >
                      Get started
                    </Link>
                  </div>
                )
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.header>
  );
}