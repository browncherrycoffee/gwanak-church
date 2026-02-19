import Fuse, { type IFuseOptions } from "fuse.js";
import type { Member } from "@/types";

const fuseOptions: IFuseOptions<Member> = {
  keys: [
    { name: "name", weight: 3 },
    { name: "phone", weight: 2 },
    { name: "address", weight: 1 },
    { name: "detailAddress", weight: 1 },
    { name: "position", weight: 1.5 },
    { name: "department", weight: 1 },
    { name: "district", weight: 1 },
    { name: "familyHead", weight: 1.5 },
    { name: "notes", weight: 0.5 },
  ],
  threshold: 0.4,
  distance: 100,
  minMatchCharLength: 1,
  includeScore: true,
  includeMatches: true,
  ignoreLocation: true,
};

export function searchMembers(members: Member[], query: string): Member[] {
  if (!query.trim()) return members;

  const fuse = new Fuse(members, fuseOptions);
  const results = fuse.search(query);
  return results.map((r) => r.item);
}
