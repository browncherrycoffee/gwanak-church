import Fuse from "fuse.js";
import type { Member } from "@/types";

type SearchRecord = Member & { _phoneDigits: string; _carNumberDigits: string; _carNumberLast4: string; _familyNames: string };

const FUSE_OPTIONS: ConstructorParameters<typeof Fuse<SearchRecord>>[1] = {
  keys: [
    { name: "name", weight: 3 },
    { name: "phone", weight: 2 },
    { name: "_phoneDigits", weight: 2 },
    { name: "carNumber", weight: 2 },
    { name: "_carNumberDigits", weight: 2 },
    { name: "_carNumberLast4", weight: 2.5 },
    { name: "_familyNames", weight: 2 },
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
      _carNumberLast4: (m.carNumber?.match(/\d{4}$/) ?? [""])[0],
      _familyNames: Array.isArray(m.familyMembers) ? m.familyMembers.join(" ") : "",
    }));
    cachedFuse = new Fuse(records, FUSE_OPTIONS);
  }

  const results = cachedFuse.search(query.trim()).map((r) => {
    const { _phoneDigits: _, _carNumberDigits: __, _carNumberLast4: ___, _familyNames: ____, ...member } = r.item;
    return member;
  });

  // 이름으로 매칭된 교인의 가족은 항상 검색 후보에 포함 (퍼지 매칭 누락 방지)
  const q = query.trim();
  const resultIds = new Set(results.map((m) => m.id));
  const byName = new Map<string, Member[]>();
  for (const m of members) {
    const list = byName.get(m.name);
    if (list) list.push(m);
    else byName.set(m.name, [m]);
  }
  const familyToAppend: Member[] = [];
  for (const matched of results) {
    if (!matched.name.includes(q)) continue;
    for (const familyName of matched.familyMembers) {
      for (const relative of byName.get(familyName.trim()) ?? []) {
        if (resultIds.has(relative.id)) continue;
        resultIds.add(relative.id);
        familyToAppend.push(relative);
      }
    }
  }

  return [...results, ...familyToAppend];
}
