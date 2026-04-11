"use client";

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { Input } from "@/components/ui/input";
import { User } from "@phosphor-icons/react";
import { getMembers, subscribe } from "@/lib/member-store";
import type { Member } from "@/types";

interface FamilyNameInputProps {
  value: string;
  onChange: (value: string) => void;
  /** 현재 편집 중인 본인 — 자기 자신을 후보에서 제외 */
  excludeId?: string;
  /** 이미 같은 폼 안에서 선택된 이름 — 중복 방지 */
  excludeNames?: string[];
  placeholder?: string;
}

const MAX_SUGGESTIONS = 8;

export function FamilyNameInput({
  value,
  onChange,
  excludeId,
  excludeNames,
  placeholder,
}: FamilyNameInputProps) {
  const members = useSyncExternalStore(subscribe, getMembers, getMembers);
  const containerRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);

  const exclude = useMemo(() => new Set(excludeNames ?? []), [excludeNames]);

  const suggestions = useMemo<Member[]>(() => {
    const q = value.trim();
    if (!q) return [];
    const lower = q.toLowerCase();
    const out: Member[] = [];
    for (const m of members) {
      if (excludeId && m.id === excludeId) continue;
      if (!m.name) continue;
      if (exclude.has(m.name) && m.name !== q) continue;
      if (m.name.toLowerCase().includes(lower)) {
        out.push(m);
        if (out.length >= MAX_SUGGESTIONS) break;
      }
    }
    return out;
  }, [members, value, excludeId, exclude]);

  // 후보 목록이 바뀌면 하이라이트 리셋
  // biome-ignore lint/correctness/useExhaustiveDependencies: suggestions 목록이 갱신될 때만 리셋
  useEffect(() => {
    setHighlight(0);
  }, [suggestions]);

  // 외부 클릭 시 드롭다운 닫기
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (!containerRef.current) return;
      if (!containerRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const pick = (m: Member) => {
    onChange(m.name);
    setOpen(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open || suggestions.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlight((h) => (h + 1) % suggestions.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlight((h) => (h - 1 + suggestions.length) % suggestions.length);
    } else if (e.key === "Enter") {
      const picked = suggestions[highlight];
      if (picked) {
        e.preventDefault();
        pick(picked);
      }
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  const showDropdown = open && suggestions.length > 0;

  return (
    <div ref={containerRef} className="relative flex-1">
      <Input
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder ?? "가족 이름 (일부만 입력해도 목록에서 선택 가능)"}
        autoComplete="off"
      />
      {showDropdown && (
        <ul className="absolute z-20 mt-1 max-h-64 w-full overflow-y-auto rounded-md border border-input bg-popover py-1 text-sm shadow-md">
          {suggestions.map((m, idx) => {
            const detail = [m.position, m.department, m.district]
              .filter(Boolean)
              .join(" · ");
            return (
              <li key={m.id}>
                <button
                  type="button"
                  aria-pressed={idx === highlight}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => pick(m)}
                  onMouseEnter={() => setHighlight(idx)}
                  className={`flex w-full items-center gap-2 px-3 py-2 text-left transition-colors ${
                    idx === highlight ? "bg-secondary" : "hover:bg-secondary"
                  }`}
                >
                  <User weight="light" className="h-4 w-4 shrink-0 text-primary" />
                  <span className="font-medium">{m.name}</span>
                  {detail && (
                    <span className="ml-auto truncate text-xs text-muted-foreground">
                      {detail}
                    </span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
