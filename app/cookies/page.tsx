export default function CookiesPage() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      <h1 className="text-3xl font-semibold tracking-tight">Cookie Policy</h1>
      <p className="mt-4 text-sm text-muted-foreground">
        This is a placeholder cookie policy for the MVP.
      </p>

      <div className="mt-8 space-y-4 text-sm">
        <p>
          We use essential cookies to keep the site working and maintain sessions (e.g., admin login).
        </p>
        <p>
          We may use analytics cookies to understand how the site is used and improve recommendations.
        </p>
        <p>
          You can control cookies through your browser settings.
        </p>
      </div>
    </div>
  );
}
