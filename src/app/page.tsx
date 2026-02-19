import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";
import { HeroSection } from "@/components/home/hero-section";
import { QuickLinks } from "@/components/home/quick-links";
import { LatestSermon } from "@/components/home/latest-sermon";
import { UpcomingEvents } from "@/components/home/upcoming-events";

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="flex-1">
        <HeroSection />
        <QuickLinks />
        <LatestSermon />
        <UpcomingEvents />
      </main>
      <SiteFooter />
    </div>
  );
}
