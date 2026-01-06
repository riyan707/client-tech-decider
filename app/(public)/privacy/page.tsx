export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      <h1 className="text-3xl font-semibold tracking-tight">Privacy Policy</h1>
      <p className="mt-4 text-sm text-muted-foreground">
        This is a placeholder privacy policy for the MVP.
      </p>

      <div className="mt-8 space-y-4 text-sm">
        <p>
          We may collect information you provide during the quiz (for example: email, first name, and answers)
          to generate recommendations and improve the experience.
        </p>
        <p>
          We may store basic analytics (e.g., page views and clicks) to understand product performance.
        </p>
        <p>
          We do not sell your personal data. If you want your data removed, contact us and we’ll delete it.
        </p>
      </div>
    </div>
  );
}
