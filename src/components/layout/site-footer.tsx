import Link from "next/link";
import { MapPin, Phone, Cross } from "@phosphor-icons/react/dist/ssr";
import { SITE_CONFIG, NAV_ITEMS } from "@/lib/constants";
import { Separator } from "@/components/ui/separator";

export function SiteFooter() {
  return (
    <footer className="border-t bg-muted/50">
      <div className="mx-auto max-w-6xl px-4 py-12">
        <div className="grid gap-8 md:grid-cols-3">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Cross weight="fill" className="h-5 w-5 text-primary" />
              <span className="text-lg font-bold text-primary">{SITE_CONFIG.name}</span>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {SITE_CONFIG.description}
            </p>
          </div>

          <div>
            <h3 className="font-semibold mb-4">바로가기</h3>
            <nav className="flex flex-col gap-2">
              {NAV_ITEMS.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="text-sm text-muted-foreground hover:text-primary transition-colors"
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>

          <div>
            <h3 className="font-semibold mb-4">연락처</h3>
            <div className="flex flex-col gap-3">
              <div className="flex items-start gap-2 text-sm text-muted-foreground">
                <MapPin weight="light" className="h-4 w-4 mt-0.5 shrink-0" />
                <span>{SITE_CONFIG.address}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Phone weight="light" className="h-4 w-4 shrink-0" />
                <span>{SITE_CONFIG.phone}</span>
              </div>
            </div>
          </div>
        </div>

        <Separator className="my-8" />

        <p className="text-center text-xs text-muted-foreground">
          {new Date().getFullYear()} {SITE_CONFIG.name}. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
