import Link from "next/link";
import { Cross } from "@phosphor-icons/react/dist/ssr";
import { SITE_CONFIG } from "@/lib/constants";
import { NavLinks } from "./nav-links";
import { MobileNav } from "./mobile-nav";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <MobileNav />
          <Link href="/" className="flex items-center gap-2">
            <Cross weight="fill" className="h-6 w-6 text-primary" />
            <span className="text-lg font-bold text-primary">{SITE_CONFIG.name}</span>
          </Link>
        </div>
        <NavLinks className="hidden lg:flex" />
      </div>
    </header>
  );
}
