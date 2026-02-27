"use client";

import Link from "next/link";
import Image from "next/image";
import { User, Phone, MapPin } from "@phosphor-icons/react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { Member } from "@/types";

interface MemberCardProps {
  member: Member;
}

export function MemberCard({ member }: MemberCardProps) {
  return (
    <Link href={`/members/${member.id}`}>
      <Card className="group transition-all hover:border-primary/30 hover:shadow-sm">
        <CardContent className="p-4 sm:p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-secondary text-primary overflow-hidden">
                {member.photoUrl ? (
                  <Image
                    src={member.photoUrl}
                    alt={member.name}
                    width={40}
                    height={40}
                    className="h-10 w-10 object-cover"
                    unoptimized
                  />
                ) : (
                  <User weight="light" className="h-5 w-5" />
                )}
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-semibold group-hover:text-primary transition-colors">
                    {member.name}
                  </h3>
                  {member.position && (
                    <Badge variant="secondary" className="text-xs">
                      {member.position}
                    </Badge>
                  )}
                  {member.notes && (
                    <Badge variant="outline" className="text-xs text-primary border-primary/30 max-w-[120px] truncate">
                      {member.notes}
                    </Badge>
                  )}
                  {member.memberStatus !== "활동" && (
                    <Badge variant="outline" className={`text-xs ${member.memberStatus === "제적" ? "text-destructive border-destructive/30" : "text-muted-foreground"}`}>
                      {member.memberStatus}
                    </Badge>
                  )}
                </div>
                {member.department && (
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {member.department}
                    {member.district ? ` / ${member.district}` : ""}
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
            {member.phone && (
              <span className="flex items-center gap-1">
                <Phone weight="light" className="h-3.5 w-3.5" />
                {member.phone}
              </span>
            )}
            {member.address && (
              <span className="flex items-center gap-1 truncate max-w-xs">
                <MapPin weight="light" className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">{member.address}</span>
              </span>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
