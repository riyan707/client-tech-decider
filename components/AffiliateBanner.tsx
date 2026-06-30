import Link from "next/link";

export function AffiliateBanner() {
  return (
    <div className="w-full border-b bg-muted/60">
      <div className="mx-auto max-w-6xl px-4 py-2 text-center text-xs text-muted-foreground">
        Some links on this site are affiliate links. We may earn a commission at no extra cost to you.{" "}
        <Link
          href="/affiliate-disclosure"
          className="font-medium underline underline-offset-2 hover:text-foreground"
        >
          Learn more →
        </Link>
      </div>
    </div>
  );
}
