import Fuse from "fuse.js";
import type { Member } from "@/types";

type SearchRecord = Member & { _phoneDigits: string; _carNumberDigits: string };

const FUSE_OPTIONS: ConstructorParameters<typeof Fuse<SearchRecord>>[1] = {
  keys: [
    { name: "name", weight: 3 },
    { name: "phone", weight: 2 },
    { name: "_phoneDigits", weight: 2 },
    { name: "carNumber", weight: 2 },
    { name: "_carNumberDigits", weight: 2 },
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
  includeScore: false,
  ignoreLocation: true,
};

let cachedMembers: Member[] | null = null;
let cachedFuse: Fuse<SearchRecord> | null = null;

export function searchMembers(members: Member[], query: string): Member[] {
  if (!query.trim()) return members;

  if (cachedMembers !== members || !cachedFuse) {
    cachedMembers = members;
    const records: SearchRecord[] = members.map((m) => ({
      ...m,
      _phoneDigits: m.phone?.replace(/-/g, "") ?? "",
      _carNumberDigits: m.carNumber?.replace(/\s/g, "") ?? "",
    }));
    cachedFuse = new Fuse(records, FUSE_OPTIONS);
  }

  return cachedFuse.search(query.trim()).map((r) => {
    const { _phoneDigits: _, _carNumberDigits: __, ...member } = r.item;
    return member;
  });
}
