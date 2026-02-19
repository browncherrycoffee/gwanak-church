import Link from "next/link";
import { Cross, ArrowRight } from "@phosphor-icons/react/dist/ssr";
import { Button } from "@/components/ui/button";

export function HeroSection() {
  return (
    <section className="relative overflow-hidden bg-primary py-24 md:py-32">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,rgba(45,106,79,0.4),transparent_60%)]" />
      <div className="relative mx-auto max-w-6xl px-4 text-center">
        <Cross weight="thin" className="mx-auto mb-6 h-16 w-16 text-primary-foreground/80" />
        <h1 className="text-4xl font-bold tracking-tight text-primary-foreground md:text-5xl lg:text-6xl">
          관악교회
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-lg text-primary-foreground/80 md:text-xl">
          하나님의 사랑과 은혜가 함께하는 교회
        </p>
        <p className="mx-auto mt-2 max-w-xl text-primary-foreground/60">
          모든 분들을 따뜻하게 환영합니다
        </p>
        <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <Button
            asChild
            size="lg"
            className="bg-primary-foreground text-primary hover:bg-primary-foreground/90"
          >
            <Link href="/worship">
              예배 안내
              <ArrowRight weight="light" className="ml-2 h-4 w-4" />
            </Link>
          </Button>
          <Button
            asChild
            variant="outline"
            size="lg"
            className="border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10"
          >
            <Link href="/newcomers">새가족 안내</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
