import Fuse from "fuse.js";
import type { Member } from "@/types";

type SearchRecord = Member & { _phoneDigits: string };

export function searchMembers(members: Member[], query: string): Member[] {
  if (!query.trim()) return members;

  const records: SearchRecord[] = members.map((m) => ({
    ...m,
    _phoneDigits: m.phone?.replace(/-/g, "") ?? "",
  }));

  const fuse = new Fuse(records, {
    keys: [
      { name: "name", weight: 3 },
      { name: "phone", weight: 2 },
      { name: "_phoneDigits", weight: 2 },
      { name: "position", weight: 1.5 },
      { name: "department", weight: 1 },
      { name: "familyHead", weight: 1.5 },
      { name: "address", weight: 1 },
      { name: "detailAddress", weight: 1 },
      { name: "district", weight: 1 },
      { name: "notes", weight: 0.5 },
    ],
    threshold: 0.4,
    distance: 100,
    minMatchCharLength: 1,
    includeScore: true,
    includeMatches: true,
    ignoreLocation: true,
  });

  return fuse.search(query.trim()).map((r) => {
    const { _phoneDigits: _, ...member } = r.item;
    return member;
  });
}
