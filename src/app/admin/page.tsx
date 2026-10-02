"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Cross,
  ArrowLeft,
  ShieldCheck,
  ShieldSlash,
  UserPlus,
  PencilSimple,
  ArrowClockwise,
  CircleNotch,
  Warning,
  CheckCircle,
  Copy,
  X,
  CaretUp,
  SignOut,
} from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { loadAuthInfo } from "@/lib/member-store";
import { NANUMJO_NAMES } from "@/lib/nanumjo-config";
import { DEPARTMENTS } from "@/lib/constants";
import { getMembers } from "@/lib/member-store";

// ─── Types ──────────────────────────────────────────────────────────────────

interface Assignment {
  unitType: string;
  unitName: string;
}

interface AdminUser {
  id: string;
  memberId: string | null;
  displayName: string;
  title: string | null;
  roleGrade: string;
  isAdmin: boolean;
  status: string;
  hasCode: boolean;
  codeIssuedAt: string | null;
  assignments: Assignment[];
}

type Screen = "loading" | "not-admin" | "verify" | "main";

const GRADES = ["목사", "장로", "집사", "행정지원", "없음"] as const;

// ─── Helper components ───────────────────────────────────────────────────────

function GradeBadge({ grade }: { grade: string }) {
  const variantMap: Record<string, "default" | "secondary" | "outline"> = {
    목사: "default",
    장로: "default",
    집사: "secondary",
    행정지원: "secondary",
    없음: "outline",
  };
  return (
    <Badge variant={variantMap[grade] ?? "outline"} className="text-xs">
      {grade}
    </Badge>
  );
}

// ─── Code Modal ──────────────────────────────────────────────────────────────

function CodeModal({ code, onClose }: { code: string; onClose: () => void }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard not available — silent
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm bg-black/50">
      <div className="w-full max-w-sm rounded-xl border bg-background shadow-xl p-6">
        <div className="flex items-start justify-between mb-4">
          <h3 className="text-lg font-semibold">접속 코드 발급 완료</h3>
          <button onClick={onClose} className="rounded p-1 hover:bg-muted">
            <X weight="bold" className="h-4 w-4" />
          </button>
        </div>

        <div className="rounded-lg bg-muted px-4 py-5 text-center mb-4">
          <p className="font-mono text-2xl font-bold tracking-widest text-primary select-all">
            {code}
          </p>
        </div>

        <div className="mb-5 flex items-start gap-2 rounded-lg bg-amber-50 border border-amber-200 p-3 text-xs text-amber-800">
          <Warning weight="light" className="h-4 w-4 shrink-0 mt-0.5" />
          <span>
            이 코드는 지금 한 번만 표시됩니다. 안전한 방법으로 본인에게 전달하세요.
          </span>
        </div>

        <div className="flex gap-2">
          <Button onClick={handleCopy} variant="outline" className="flex-1 gap-2">
            <Copy weight="light" className="h-4 w-4" />
            {copied ? "복사됨" : "복사"}
          </Button>
          <Button onClick={onClose} className="flex-1">
            확인 (닫기)
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Verify screen ───────────────────────────────────────────────────────────

function VerifyScreen({ onSuccess }: { onSuccess: () => void }) {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/verify-admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: code.trim() }),
      });
      if (res.ok) {
        await loadAuthInfo(true);
        onSuccess();
      } else {
        const data = (await res.json()) as { error?: string };
        setError(data.error ?? "코드가 일치하지 않습니다.");
      }
    } catch {
      setError("네트워크 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardContent className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <ShieldCheck weight="light" className="h-6 w-6 text-primary" />
            <h2 className="text-lg font-semibold">관리자 확인</h2>
          </div>
          <p className="text-sm text-muted-foreground mb-5">
            보안을 위해 접속 코드를 다시 입력하세요. (30분 유효)
          </p>
          <form onSubmit={handleSubmit} className="space-y-4">
            <input
              type="password"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="접속 코드"
              autoComplete="off"
              className="w-full rounded-md border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              disabled={loading}
            />
            {error && (
              <div className="flex items-center gap-2 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
                <Warning weight="light" className="h-4 w-4 shrink-0" />
                {error}
              </div>
            )}
            <Button type="submit" disabled={loading || !code.trim()} className="w-full gap-2">
              {loading ? (
                <CircleNotch weight="bold" className="h-4 w-4 animate-spin" />
              ) : (
                <ShieldCheck weight="light" className="h-4 w-4" />
              )}
              {loading ? "확인 중..." : "확인"}
            </Button>
          </form>
          <div className="mt-4 text-center">
            <Button asChild variant="ghost" size="sm">
              <Link href="/members">
                <ArrowLeft weight="light" className="mr-1.5 h-4 w-4" />
                교인 목록으로
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Assignment selector ─────────────────────────────────────────────────────

interface AssignmentSelectorProps {
  selected: Assignment[];
  onChange: (assignments: Assignment[]) => void;
}

function AssignmentSelector({ selected, onChange }: AssignmentSelectorProps) {
  const isChecked = (unitType: string, unitName: string) =>
    selected.some((a) => a.unitType === unitType && a.unitName === unitName);

  const toggle = (unitType: string, unitName: string) => {
    if (isChecked(unitType, unitName)) {
      onChange(selected.filter((a) => !(a.unitType === unitType && a.unitName === unitName)));
    } else {
      onChange([...selected, { unitType, unitName }]);
    }
  };

  return (
    <div className="space-y-3">
      <div>
        <p className="text-xs font-medium text-muted-foreground mb-1.5">나눔조</p>
        <div className="flex flex-wrap gap-1.5">
          {NANUMJO_NAMES.map((name) => (
            <label key={name} className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={isChecked("nanumjo", name)}
                onChange={() => toggle("nanumjo", name)}
                className="rounded"
              />
              <span className="text-xs">{name}</span>
            </label>
          ))}
        </div>
      </div>
      <div>
        <p className="text-xs font-medium text-muted-foreground mb-1.5">부서</p>
        <div className="flex flex-wrap gap-1.5">
          {DEPARTMENTS.map((name) => (
            <label key={name} className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={isChecked("department", name)}
                onChange={() => toggle("department", name)}
                className="rounded"
              />
              <span className="text-xs">{name}</span>
            </label>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── New user form ───────────────────────────────────────────────────────────

interface NewUserFormProps {
  onCreated: (code: string) => void;
  onCancel: () => void;
  onNeedVerify: () => void;
}

function NewUserForm({ onCreated, onCancel, onNeedVerify }: NewUserFormProps) {
  const [displayName, setDisplayName] = useState("");
  const [title, setTitle] = useState("");
  const [roleGrade, setRoleGrade] = useState<string>("없음");
  const [isAdmin, setIsAdmin] = useState(false);
  const [memberId, setMemberId] = useState<string>("");
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const members = getMembers();
  const sortedMembers = [...members].sort((a, b) => a.name.localeCompare(b.name, "ko"));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!displayName.trim()) { setError("이름을 입력하세요."); return; }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          displayName: displayName.trim(),
          title: title.trim() || undefined,
          roleGrade,
          isAdmin,
          memberId: memberId || undefined,
          assignments,
        }),
      });
      const data = (await res.json()) as { ok?: boolean; code?: string; error?: string };
      if (res.status === 403) { onNeedVerify(); return; }
      if (!res.ok) { setError(data.error ?? "등록 중 오류가 발생했습니다."); return; }
      if (data.code) onCreated(data.code);
    } catch {
      setError("네트워크 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="border-primary/40">
      <CardContent className="p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold">새 사용자 등록</h3>
          <button onClick={onCancel} className="rounded p-1 hover:bg-muted">
            <X weight="bold" className="h-4 w-4" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium mb-1 block">이름 *</label>
              <input
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="이름"
                className="w-full rounded-md border bg-background px-3 py-1.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div>
              <label className="text-xs font-medium mb-1 block">직함</label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="예: 서기, 회계"
                className="w-full rounded-md border bg-background px-3 py-1.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium mb-1 block">권한 등급</label>
              <select
                value={roleGrade}
                onChange={(e) => setRoleGrade(e.target.value)}
                className="w-full rounded-md border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                {GRADES.map((g) => (
                  <option key={g} value={g}>{g}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium mb-1 block">성도 연결</label>
              <select
                value={memberId}
                onChange={(e) => setMemberId(e.target.value)}
                className="w-full rounded-md border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="">선택 안 함</option>
                {sortedMembers.map((m) => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              id="new-is-admin"
              type="checkbox"
              checked={isAdmin}
              onChange={(e) => setIsAdmin(e.target.checked)}
              className="rounded"
            />
            <label htmlFor="new-is-admin" className="text-sm cursor-pointer">
              시스템 관리자 권한 부여
            </label>
          </div>

          <div>
            <p className="text-xs font-medium mb-2">담당 지정</p>
            <AssignmentSelector selected={assignments} onChange={setAssignments} />
          </div>

          {error && (
            <div className="flex items-center gap-2 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
              <Warning weight="light" className="h-4 w-4 shrink-0" />
              {error}
            </div>
          )}

          <div className="flex gap-2 justify-end">
            <Button type="button" variant="outline" onClick={onCancel} size="sm">취소</Button>
            <Button type="submit" disabled={loading || !displayName.trim()} size="sm" className="gap-2">
              {loading ? <CircleNotch weight="bold" className="h-3.5 w-3.5 animate-spin" /> : <UserPlus weight="light" className="h-3.5 w-3.5" />}
              {loading ? "등록 중..." : "등록 및 코드 발급"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

// ─── Edit user form ──────────────────────────────────────────────────────────

interface EditUserFormProps {
  user: AdminUser;
  onSaved: () => void;
  onCancel: () => void;
  onNeedVerify: () => void;
}

function EditUserForm({ user, onSaved, onCancel, onNeedVerify }: EditUserFormProps) {
  const [displayName, setDisplayName] = useState(user.displayName);
  const [title, setTitle] = useState(user.title ?? "");
  const [roleGrade, setRoleGrade] = useState(user.roleGrade);
  const [isAdmin, setIsAdmin] = useState(user.isAdmin);
  const [memberId, setMemberId] = useState(user.memberId ?? "");
  const [assignments, setAssignments] = useState<Assignment[]>(user.assignments);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const members = getMembers();
  const sortedMembers = [...members].sort((a, b) => a.name.localeCompare(b.name, "ko"));

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.id,
          action: "update",
          displayName: displayName.trim(),
          title: title.trim() || null,
          roleGrade,
          isAdmin,
          memberId: memberId || null,
          assignments,
        }),
      });
      if (res.status === 403) { onNeedVerify(); return; }
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok) { setError(data.error ?? "저장 중 오류가 발생했습니다."); return; }
      onSaved();
    } catch {
      setError("네트워크 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mt-3 rounded-lg border bg-muted/30 p-4 space-y-3">
      <form onSubmit={handleSave} className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-medium mb-1 block">이름</label>
            <input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full rounded-md border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div>
            <label className="text-xs font-medium mb-1 block">직함</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="예: 서기, 회계"
              className="w-full rounded-md border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-medium mb-1 block">권한 등급</label>
            <select
              value={roleGrade}
              onChange={(e) => setRoleGrade(e.target.value)}
              className="w-full rounded-md border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            >
              {GRADES.map((g) => (
                <option key={g} value={g}>{g}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium mb-1 block">성도 연결</label>
            <select
              value={memberId}
              onChange={(e) => setMemberId(e.target.value)}
              className="w-full rounded-md border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="">선택 안 함</option>
              {sortedMembers.map((m) => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <input
            id={`edit-admin-${user.id}`}
            type="checkbox"
            checked={isAdmin}
            onChange={(e) => setIsAdmin(e.target.checked)}
            className="rounded"
          />
          <label htmlFor={`edit-admin-${user.id}`} className="text-sm cursor-pointer">
            시스템 관리자 권한
          </label>
        </div>

        <div>
          <p className="text-xs font-medium mb-2">담당 지정</p>
          <AssignmentSelector selected={assignments} onChange={setAssignments} />
        </div>

        {error && (
          <div className="flex items-center gap-2 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
            <Warning weight="light" className="h-4 w-4 shrink-0" />
            {error}
          </div>
        )}

        <div className="flex gap-2 justify-end">
          <Button type="button" variant="outline" size="sm" onClick={onCancel}>취소</Button>
          <Button type="submit" size="sm" disabled={loading} className="gap-2">
            {loading ? <CircleNotch weight="bold" className="h-3.5 w-3.5 animate-spin" /> : null}
            {loading ? "저장 중..." : "저장"}
          </Button>
        </div>
      </form>
    </div>
  );
}

// ─── User card ───────────────────────────────────────────────────────────────

interface UserCardProps {
  user: AdminUser;
  onReload: () => void;
  onNeedVerify: () => void;
  onCode: (code: string) => void;
}

function UserCard({ user, onReload, onNeedVerify, onCode }: UserCardProps) {
  const [editing, setEditing] = useState(false);
  const [confirmReissue, setConfirmReissue] = useState(false);
  const [confirmDisable, setConfirmDisable] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const handleAction = async (action: "reissue-code" | "disable" | "enable") => {
    setActionLoading(true);
    try {
      const res = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id, action }),
      });
      if (res.status === 403) { onNeedVerify(); return; }
      const data = (await res.json()) as { ok?: boolean; code?: string; error?: string };
      if (!res.ok) return;
      if (action === "reissue-code" && data.code) {
        onCode(data.code);
      }
      onReload();
    } catch {
      // silent
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <Card className={user.status === "disabled" ? "opacity-60" : ""}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-medium text-sm">{user.displayName}</span>
              {user.title && (
                <span className="text-xs text-muted-foreground">{user.title}</span>
              )}
              <GradeBadge grade={user.roleGrade} />
              {user.isAdmin && (
                <Badge variant="default" className="text-xs bg-primary/80">관리자</Badge>
              )}
              {user.status === "disabled" && (
                <Badge variant="destructive" className="text-xs">중지</Badge>
              )}
            </div>

            {user.assignments.length > 0 && (
              <div className="mt-1.5 flex flex-wrap gap-1">
                {user.assignments.map((a, i) => (
                  <Badge key={i} variant="outline" className="text-xs">
                    {a.unitName}
                  </Badge>
                ))}
              </div>
            )}

            <p className="mt-1 text-xs text-muted-foreground">
              코드 발급:{" "}
              {user.codeIssuedAt
                ? new Date(user.codeIssuedAt).toLocaleDateString("ko-KR")
                : "미발급"}
            </p>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0"
              onClick={() => setEditing((v) => !v)}
              title="수정"
            >
              {editing ? (
                <CaretUp weight="bold" className="h-3.5 w-3.5" />
              ) : (
                <PencilSimple weight="light" className="h-3.5 w-3.5" />
              )}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0"
              onClick={() => setConfirmReissue(true)}
              disabled={actionLoading}
              title="코드 재발급"
            >
              <ArrowClockwise weight="light" className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className={`h-7 w-7 p-0 ${user.status === "disabled" ? "text-primary" : "text-destructive"}`}
              onClick={() => {
                if (user.status === "active") setConfirmDisable(true);
                else void handleAction("enable");
              }}
              disabled={actionLoading}
              title={user.status === "disabled" ? "재개" : "중지"}
            >
              {actionLoading ? (
                <CircleNotch weight="bold" className="h-3.5 w-3.5 animate-spin" />
              ) : user.status === "disabled" ? (
                <CheckCircle weight="light" className="h-3.5 w-3.5" />
              ) : (
                <ShieldSlash weight="light" className="h-3.5 w-3.5" />
              )}
            </Button>
          </div>
        </div>

        {editing && (
          <EditUserForm
            user={user}
            onSaved={() => { setEditing(false); onReload(); }}
            onCancel={() => setEditing(false)}
            onNeedVerify={onNeedVerify}
          />
        )}
      </CardContent>

      <ConfirmDialog
        open={confirmReissue}
        title="코드 재발급"
        description="이전 코드와 현재 로그인이 즉시 무효화됩니다. 계속하시겠습니까?"
        confirmLabel="재발급"
        cancelLabel="취소"
        destructive
        onConfirm={() => { setConfirmReissue(false); void handleAction("reissue-code"); }}
        onCancel={() => setConfirmReissue(false)}
      />

      <ConfirmDialog
        open={confirmDisable}
        title="사용 중지"
        description={`${user.displayName} 사용자의 접근을 중지합니다. 현재 로그인된 세션이 즉시 차단됩니다.`}
        confirmLabel="중지"
        cancelLabel="취소"
        destructive
        onConfirm={() => { setConfirmDisable(false); void handleAction("disable"); }}
        onCancel={() => setConfirmDisable(false)}
      />
    </Card>
  );
}

// ─── Main admin screen ───────────────────────────────────────────────────────

function MainScreen({ onNeedVerify }: { onNeedVerify: () => void }) {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showNewForm, setShowNewForm] = useState(false);
  const [pendingCode, setPendingCode] = useState<string | null>(null);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/users");
      if (res.status === 403) { onNeedVerify(); return; }
      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        setError(data.error ?? "사용자 목록을 불러오지 못했습니다.");
        return;
      }
      const data = (await res.json()) as { users: AdminUser[] };
      setUsers(data.users);
    } catch {
      setError("네트워크 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  }, [onNeedVerify]);

  useEffect(() => {
    void fetchUsers();
  }, [fetchUsers]);

  const handleLogout = async () => {
    await fetch("/api/auth", { method: "DELETE" });
    window.location.href = "/login";
  };

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-50 border-b bg-background">
        <div className="mx-auto flex h-14 max-w-3xl items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <Link href="/" className="shrink-0">
              <Cross weight="fill" className="h-7 w-7 text-primary" />
            </Link>
            <Button asChild variant="ghost" size="sm">
              <Link href="/members">
                <ArrowLeft weight="light" className="mr-1.5 h-4 w-4" />
                교인 목록으로
              </Link>
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <ShieldCheck weight="light" className="h-5 w-5 text-primary" />
            <h1 className="font-semibold">사용자 관리</h1>
          </div>
          <div>
            <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground" onClick={handleLogout}>
              <SignOut weight="light" className="h-4 w-4" />
              로그아웃
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-8 space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            시스템에 등록된 사용자를 관리합니다.
          </p>
          <Button
            size="sm"
            className="gap-2"
            onClick={() => setShowNewForm((v) => !v)}
          >
            {showNewForm ? (
              <>
                <CaretUp weight="bold" className="h-3.5 w-3.5" />
                취소
              </>
            ) : (
              <>
                <UserPlus weight="light" className="h-4 w-4" />
                새 사용자 등록
              </>
            )}
          </Button>
        </div>

        {showNewForm && (
          <NewUserForm
            onCreated={(code) => {
              setShowNewForm(false);
              setPendingCode(code);
              void fetchUsers();
            }}
            onCancel={() => setShowNewForm(false)}
            onNeedVerify={onNeedVerify}
          />
        )}

        {loading ? (
          <div className="flex items-center justify-center py-12 text-muted-foreground gap-2">
            <CircleNotch weight="bold" className="h-5 w-5 animate-spin" />
            <span className="text-sm">불러오는 중...</span>
          </div>
        ) : error ? (
          <div className="flex items-center gap-2 rounded-lg bg-destructive/10 p-4 text-sm text-destructive">
            <Warning weight="light" className="h-4 w-4 shrink-0" />
            {error}
          </div>
        ) : users.length === 0 ? (
          <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
            등록된 사용자가 없습니다.
          </div>
        ) : (
          <div className="space-y-3">
            {users.map((u) => (
              <UserCard
                key={u.id}
                user={u}
                onReload={fetchUsers}
                onNeedVerify={onNeedVerify}
                onCode={setPendingCode}
              />
            ))}
          </div>
        )}
      </main>

      {pendingCode && (
        <CodeModal
          code={pendingCode}
          onClose={() => setPendingCode(null)}
        />
      )}
    </div>
  );
}

// ─── Page root ───────────────────────────────────────────────────────────────

export default function AdminPage() {
  const [screen, setScreen] = useState<Screen>("loading");

  useEffect(() => {
    async function init() {
      const info = await loadAuthInfo();
      if (!info?.isAdmin) {
        setScreen("not-admin");
        return;
      }
      if (!info.adminVerified) {
        setScreen("verify");
        return;
      }
      setScreen("main");
    }
    void init();
  }, []);

  const handleVerifySuccess = () => setScreen("main");
  const handleNeedVerify = () => setScreen("verify");

  if (screen === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <CircleNotch weight="bold" className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (screen === "not-admin") {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-sm">
          <CardContent className="p-6 text-center">
            <ShieldSlash weight="light" className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
            <p className="font-semibold mb-1">접근 권한 없음</p>
            <p className="text-sm text-muted-foreground mb-4">
              관리자만 사용할 수 있습니다.
            </p>
            <Button asChild variant="outline" size="sm">
              <Link href="/members">
                <ArrowLeft weight="light" className="mr-1.5 h-4 w-4" />
                교인 목록으로
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (screen === "verify") {
    return <VerifyScreen onSuccess={handleVerifySuccess} />;
  }

  return <MainScreen onNeedVerify={handleNeedVerify} />;
}
