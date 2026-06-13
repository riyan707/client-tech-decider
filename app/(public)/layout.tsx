import { AffiliateBanner } from "@/components/AffiliateBanner";
import { FloatingQuizCTA } from "@/components/FloatingQuizCta";
import { SiteFooter } from "@/components/Footer";
import { Navbar } from "@/components/Navbar";
import { PageTransition } from "@/components/PageTransition";

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <AffiliateBanner />
      <main className="flex-1">
        <PageTransition>{children}</PageTransition>
      </main>
      <FloatingQuizCTA />
      <SiteFooter />
    </div>
  );
}
