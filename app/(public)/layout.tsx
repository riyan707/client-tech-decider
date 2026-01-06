import { FloatingQuizCTA } from "@/components/FloatingQuizCta";
import { SiteFooter } from "@/components/Footer";

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <main className="flex-1">{children}</main>
      <FloatingQuizCTA />
      <SiteFooter />
    </div>
  );
}
