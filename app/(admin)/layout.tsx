// app/(admin)/layout.tsx
import Link from "next/link";
import React from "react";

const nav = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/products", label: "Products" },
  { href: "/admin/questions", label: "Questions" },
  // add more later: users, settings, logs, etc.
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-neutral-50">
      <div className="flex min-h-screen w-full">
        {/* Sidebar */}
        <aside className="hidden w-64 flex-col border-r bg-white md:flex">
          <div className="flex h-16 items-center px-6">
            <div className="text-sm font-semibold text-neutral-900">
              Tech Decider
            </div>
          </div>

          <nav className="flex-1 px-3 py-2">
            <div className="space-y-1">
              {nav.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="block rounded-lg px-3 py-2 text-sm text-neutral-700 hover:bg-neutral-100 hover:text-neutral-900"
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </nav>

          <div className="border-t px-6 py-4 text-xs text-neutral-500">
            Admin Panel
          </div>
        </aside>

        {/* Main */}
        <div className="flex min-w-0 flex-1 flex-col">
          {/* Top bar */}
          <header className="flex h-16 items-center justify-between border-b bg-white px-4 md:px-6">
            {/* Left */}
            <div className="flex items-center gap-3">
              <div className="text-sm font-semibold text-neutral-900">
                Dashboard
              </div>
              <div className="hidden text-xs text-neutral-500 md:block">
                Overview & activity
              </div>
            </div>

            {/* Right */}
            <div className="flex items-center gap-3">
              {/* Return to homepage */}
              <Link
                href="/"
                className="inline-flex h-9 items-center rounded-lg border bg-white px-3 text-sm text-neutral-700 hover:bg-neutral-100"
              >
                ← Return to homepage
              </Link>

              {/* Search */}
              <div className="hidden md:block">
                <input
                  placeholder="Search…"
                  className="h-9 w-72 rounded-lg border bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-neutral-200"
                />
              </div>

              {/* User */}
              <div className="text-sm text-neutral-700">Admin</div>
            </div>
          </header>

          {/* Content */}
          <main className="flex-1 p-4 md:p-6">{children}</main>
        </div>
      </div>
    </div>
  );
}
