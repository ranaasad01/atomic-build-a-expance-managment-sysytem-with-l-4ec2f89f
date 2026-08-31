# AGENTS.md

Project conventions for AI agents and humans editing this codebase.

## Original request
build a expance managment sysytem with login sign up using supa base

## Goal
Build a full-featured ExpenseIQ expense management system with Supabase authentication, dashboard, expense CRUD, and budget tracking using Next.js 14 App Router and a dark glass-futuristic design.

## Project type
saas-app

## Design system — match this exactly
- Color tokens: `--background: #0F0F1A`, `--card: #1A1A2E`, `--border: #2E2E4A`, `--foreground: #F1F5F9`, `--muted-foreground: #94A3B8`, `--primary: #6366F1`, `--accent: #F59E0B`, `--destructive: #DC2626`, `--ring: #6366F1`

## Existing components — reuse these, don't create near-duplicates
- Footer (components/Footer.tsx)
- LanguageToggle (components/LanguageToggle.tsx)
- LocaleProvider (components/LocaleProvider.tsx)
- Navbar (components/Navbar.tsx)

## Existing i18n namespaces
Every translation key must be namespaced (`hero.title`, never a bare `title`) so two components never collide on the same catalog slot. Reuse one of these, or pick a new, distinct name:
`budget`, `common`, `dashboard`, `expenses`, `footer`, `login`, `nav`, `profile`, `signup`

When editing or adding pages: preserve the design system above, reuse existing components and the shared nav data file, and keep the established structure and tone.
