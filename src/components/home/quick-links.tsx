import Link from "next/link";
import {
  Church,
  Clock,
  Megaphone,
  BookOpen,
  MapPin,
  UsersThree,
} from "@phosphor-icons/react/dist/ssr";
import { Card, CardContent } from "@/components/ui/card";

const links = [
  {
    title: "교회 소개",
    description: "관악교회를 소개합니다",
    href: "/about",
    icon: Church,
  },
  {
    title: "예배 안내",
    description: "예배 시간과 장소",
    href: "/worship",
    icon: Clock,
  },
  {
    title: "공지사항",
    description: "교회 소식과 안내",
    href: "/announcements",
    icon: Megaphone,
  },
  {
    title: "설교",
    description: "말씀을 다시 들으세요",
    href: "/sermons",
    icon: BookOpen,
  },
  {
    title: "오시는 길",
    description: "교회 위치와 교통편",
    href: "/directions",
    icon: MapPin,
  },
  {
    title: "새가족 안내",
    description: "처음 오신 분들을 환영합니다",
    href: "/newcomers",
    icon: UsersThree,
  },
];

export function QuickLinks() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-16">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {links.map((link) => (
          <Link key={link.href} href={link.href}>
            <Card className="group h-full transition-colors hover:border-primary/30 hover:bg-secondary/50">
              <CardContent className="flex items-start gap-4 p-6">
                <div className="rounded-lg bg-secondary p-3 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                  <link.icon weight="light" className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="font-semibold">{link.title}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {link.description}
                  </p>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </section>
  );
}
