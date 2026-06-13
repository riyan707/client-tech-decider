import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="border-t">
      <div className="mx-auto max-w-6xl px-6 py-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">
          © {new Date().getFullYear()} Tech Decider
        </p>

        <div className="flex flex-wrap gap-4 text-sm">
          <Link href="/catalogue" className="hover:underline">Catalogue</Link>
          <Link href="/privacy" className="hover:underline">Privacy</Link>
          <Link href="/cookies" className="hover:underline">Cookies</Link>
          <Link
            href="/affiliate-disclosure"
            className="inline-flex items-center gap-1 font-medium text-foreground hover:underline"
          >
            Affiliate Disclosure
          </Link>
        </div>
      </div>
    </footer>
  );
}
