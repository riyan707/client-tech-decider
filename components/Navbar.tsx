"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Search, X, ArrowRight } from "lucide-react";

const QUICK_LINKS = [
  { label: "Browse Catalogue", href: "/catalogue" },
  { label: "Best TVs for Gaming", href: "/catalogue?category=tvs&q=gaming" },
  { label: "Best TVs for Movies", href: "/catalogue?category=tvs&q=movies" },
  { label: "Best Phones for Camera", href: "/catalogue?category=smartphones&q=camera" },
  { label: "Best Value Phones", href: "/catalogue?category=smartphones&q=budget" },
];

export function Navbar() {
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);

  // Focus input when opened
  useEffect(() => {
    if (open) {
      const t = setTimeout(() => inputRef.current?.focus(), 50);
      return () => clearTimeout(t);
    }
  }, [open]);

  // ESC to close
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    if (open) window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  // Click outside to close
  useEffect(() => {
    const onMouseDown = (e: MouseEvent) => {
      if (!open) return;
      const target = e.target as Node;
      if (panelRef.current && !panelRef.current.contains(target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onMouseDown);
    return () => document.removeEventListener("mousedown", onMouseDown);
  }, [open]);

  return (
    <header className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur">
      {/* Top bar (TRUE centered middle) */}
      <div className="mx-auto grid h-12 max-w-6xl grid-cols-3 items-center px-6">
        {/* Left: Logo */}
        <div className="justify-self-start">
          <Link
            href="/"
            className={`text-sm font-semibold tracking-tight transition-opacity ${
              open ? "opacity-60" : "opacity-100"
            }`}
          >
            Tech Decider
          </Link>
        </div>

        {/* Center: Nav */}
        <nav
          className={`hidden justify-self-center items-center gap-7 text-sm text-muted-foreground md:flex transition-opacity ${
            open ? "opacity-40" : "opacity-100"
          }`}
        >
          <Link href="/catalogue" className="hover:text-foreground">
            Catalogue
          </Link>
        </nav>

        {/* Right: Icons */}
        <div className="justify-self-end flex items-center gap-1">
          {!open ? (
            <button
              onClick={() => setOpen(true)}
              aria-label="Open search"
              className="rounded-full p-2 hover:bg-muted/60 transition"
            >
              <Search className="h-4 w-4" />
            </button>
          ) : (
            <button
              onClick={() => setOpen(false)}
              aria-label="Close search"
              className="rounded-full p-2 hover:bg-muted/60 transition"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* Dropdown panel (Apple-style) */}
      <div
        className={`relative overflow-hidden transition-[max-height,opacity] duration-300 ease-out ${
          open ? "max-h-[520px] opacity-100" : "max-h-0 opacity-0"
        }`}
      >
        {/* subtle background like Apple */}
        <div className="border-t bg-muted/20">
          <div ref={panelRef} className="mx-auto max-w-6xl px-6 py-8">
            {/* Big search */}
            <form action="/catalogue" method="GET" className="flex items-center gap-3">
              <Search className="h-6 w-6 text-muted-foreground" />
              <input
                ref={inputRef}
                name="q"
                placeholder="Search Tech Decider"
                className="w-full bg-transparent text-4xl font-semibold tracking-tight text-muted-foreground placeholder:text-muted-foreground/70 outline-none"
              />
            </form>

            {/* Quick links */}
            <div className="mt-10">
              <div className="text-sm text-muted-foreground">Quick Links</div>
              <div className="mt-4 flex flex-col gap-3">
                {QUICK_LINKS.map((l) => (
                  <Link
                    key={l.href}
                    href={l.href}
                    onClick={() => setOpen(false)}
                    className="group inline-flex items-center gap-3 text-base font-medium text-foreground/90 hover:text-foreground"
                  >
                    <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition" />
                    {l.label}
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Click-outside area feel (optional, subtle) */}
        <div className="h-6 bg-background" />
      </div>
    </header>
  );
}
