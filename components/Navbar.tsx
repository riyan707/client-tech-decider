"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Search, X, ArrowRight, Menu } from "lucide-react";

const QUICK_LINKS = [
  { label: "Browse Catalogue", href: "/catalogue" },
  { label: "Best TVs for Gaming", href: "/catalogue?category=tvs&q=gaming" },
  { label: "Best TVs for Movies", href: "/catalogue?category=tvs&q=movies" },
  { label: "Best Phones for Camera", href: "/catalogue?category=smartphones&q=camera" },
  { label: "Best Value Phones", href: "/catalogue?category=smartphones&q=budget" },
];

const NAV_LINKS = [
  { label: "Catalogue", href: "/catalogue" },
  { label: "Guides", href: "/blog" },
];

export function Navbar() {
  const [searchOpen, setSearchOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  // Close both on ESC
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") { setSearchOpen(false); setMenuOpen(false); }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  // Focus input when search opens
  useEffect(() => {
    if (searchOpen) {
      const t = setTimeout(() => inputRef.current?.focus(), 60);
      return () => clearTimeout(t);
    }
  }, [searchOpen]);

  // Lock body scroll when overlay open
  useEffect(() => {
    document.body.style.overflow = searchOpen || menuOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [searchOpen, menuOpen]);

  function closeAll() { setSearchOpen(false); setMenuOpen(false); }

  return (
    <>
      {/* ── Navbar bar ── */}
      <header className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur">
        <div className="mx-auto flex h-12 max-w-6xl items-center px-6">

          {/* Desktop: 3-col grid */}
          <div className="hidden md:grid w-full grid-cols-3 items-center">
            {/* Left: Logo */}
            <div>
              <Link href="/" className="text-sm font-semibold tracking-tight">
                Tech Decider
              </Link>
            </div>

            {/* Center: Nav links */}
            <nav className="flex justify-center items-center gap-7 text-sm text-muted-foreground">
              {NAV_LINKS.map((l) => (
                <Link key={l.href} href={l.href} className="hover:text-foreground">
                  {l.label}
                </Link>
              ))}
            </nav>

            {/* Right: Search */}
            <div className="flex justify-end">
              <button
                onClick={() => setSearchOpen(true)}
                aria-label="Open search"
                className="rounded-full p-2 hover:bg-muted/60 transition"
              >
                <Search className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Mobile: Logo | Search | Hamburger */}
          <div className="flex md:hidden w-full items-center justify-between">
            {/* Logo */}
            <Link href="/" className="text-sm font-semibold tracking-tight">
              Tech Decider
            </Link>

            {/* Right icons */}
            <div className="flex items-center gap-1">
              <button
                onClick={() => { setSearchOpen(true); setMenuOpen(false); }}
                aria-label="Open search"
                className="rounded-full p-2 hover:bg-muted/60 transition"
              >
                <Search className="h-4 w-4" />
              </button>
              <button
                onClick={() => { setMenuOpen(true); setSearchOpen(false); }}
                aria-label="Open menu"
                className="rounded-full p-2 hover:bg-muted/60 transition"
              >
                <Menu className="h-4 w-4" />
              </button>
            </div>
          </div>

        </div>
      </header>

      {/* ── Search overlay (full viewport) ── */}
      {searchOpen && (
        <div className="fixed inset-0 z-[60] flex flex-col bg-background/95 backdrop-blur-md">
          {/* Close button */}
          <div className="flex h-12 items-center justify-end px-6 border-b">
            <button
              onClick={() => setSearchOpen(false)}
              aria-label="Close search"
              className="rounded-full p-2 hover:bg-muted/60 transition"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Content */}
          <div className="mx-auto w-full max-w-2xl flex-1 overflow-y-auto px-6 py-10">
            {/* Big search input */}
            <form action="/catalogue" method="GET" onSubmit={closeAll} className="flex items-center gap-3 border-b pb-4">
              <Search className="h-5 w-5 shrink-0 text-muted-foreground" />
              <input
                ref={inputRef}
                name="q"
                placeholder="Search Tech Decider"
                className="w-full bg-transparent text-2xl font-semibold tracking-tight text-foreground placeholder:text-muted-foreground/60 outline-none"
              />
            </form>

            {/* Quick links */}
            <div className="mt-8">
              <div className="text-xs font-medium uppercase tracking-widest text-muted-foreground">Quick Links</div>
              <div className="mt-5 flex flex-col gap-4">
                {QUICK_LINKS.map((l) => (
                  <Link
                    key={l.href}
                    href={l.href}
                    onClick={closeAll}
                    className="group inline-flex items-center gap-3 text-base font-medium text-foreground/80 hover:text-foreground"
                  >
                    <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition" />
                    {l.label}
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Mobile hamburger menu overlay (full viewport) ── */}
      {menuOpen && (
        <div className="fixed inset-0 z-[60] flex flex-col bg-background md:hidden">
          {/* Top bar */}
          <div className="flex h-12 items-center justify-between px-6 border-b">
            <Link href="/" onClick={closeAll} className="text-sm font-semibold tracking-tight">
              Tech Decider
            </Link>
            <button
              onClick={() => setMenuOpen(false)}
              aria-label="Close menu"
              className="rounded-full p-2 hover:bg-muted/60 transition"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Nav links */}
          <nav className="flex flex-col px-6 pt-10 gap-2">
            {NAV_LINKS.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                onClick={closeAll}
                className="py-3 text-2xl font-semibold tracking-tight text-foreground border-b border-muted hover:opacity-60 transition-opacity"
              >
                {l.label}
              </Link>
            ))}
          </nav>
        </div>
      )}
    </>
  );
}
