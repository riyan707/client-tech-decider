import { FloatingQuizCTA } from "@/components/FloatingQuizCta";
import { SiteFooter } from "@/components/Footer";
import { Navbar } from "@/components/Navbar";

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar/>
      <main className="flex-1">{children}</main>
      <FloatingQuizCTA />
      <SiteFooter />
    </div>
  );
}
