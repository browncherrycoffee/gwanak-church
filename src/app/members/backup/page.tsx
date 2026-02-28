"use client";

import { useRef, useState, useEffect, useSyncExternalStore } from "react";
import Link from "next/link";
import {
  Cross,
  ArrowLeft,
  DownloadSimple,
  UploadSimple,
  Warning,
  CheckCircle,
  Database,
  CloudArrowUp,
  CloudArrowDown,
  CircleNotch,
} from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { getMembers, subscribe, replaceMembers } from "@/lib/member-store";
import { exportMembersJson } from "@/lib/export";
import type { Member } from "@/types";

interface BackupPayload {
  version: number;
  exportedAt: string;
  count: number;
  members: Member[];
}

interface ServerBackupInfo {
  exportedAt: string;
  count: number;
  uploadedAt: string;
}

function isValidMember(obj: unknown): obj is Member {
  if (!obj || typeof obj !== "object") return false;
  const m = obj as Record<string, unknown>;
  return typeof m.id === "string" && typeof m.name === "string";
}

function parseBackupFile(text: string): { members: Member[]; exportedAt: string; count: number } | null {
  try {
    const parsed = JSON.parse(text) as unknown;
    // Support both bare array and wrapped payload
    if (Array.isArray(parsed)) {
      if (parsed.every(isValidMember)) {
        return { members: parsed, exportedAt: "", count: parsed.length };
      }
      return null;
    }
    const payload = parsed as BackupPayload;
    if (
      typeof payload === "object" &&
      payload !== null &&
      Array.isArray(payload.members) &&
      payload.members.every(isValidMember)
    ) {
      return {
        members: payload.members,
        exportedAt: payload.exportedAt ?? "",
        count: payload.count ?? payload.members.length,
      };
    }
    return null;
  } catch {
    return null;
  }
}

export default function BackupPage() {
  const members = useSyncExternalStore(subscribe, getMembers, getMembers);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 로컬 파일 복원 상태
  const [importPreview, setImportPreview] = useState<{
    members: Member[];
    exportedAt: string;
    count: number;
    source: "file" | "server";
  } | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [restored, setRestored] = useState(false);

  // 서버 백업 상태
  const [serverInfo, setServerInfo] = useState<ServerBackupInfo | null>(null);
  const [serverInfoLoading, setServerInfoLoading] = useState(true);
  const [serverSaving, setServerSaving] = useState(false);
  const [serverLoading, setServerLoading] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [serverSaved, setServerSaved] = useState(false);

  // 서버 백업 정보 조회
  useEffect(() => {
    async function loadServerInfo() {
      setServerInfoLoading(true);
      try {
        const res = await fetch("/api/backup");
        if (res.ok) {
          const data = (await res.json()) as ServerBackupInfo;
          setServerInfo(data);
        } else if (res.status !== 404) {
          // 404는 "저장된 백업 없음" — 정상
        }
      } catch {
        // network error — silent
      } finally {
        setServerInfoLoading(false);
      }
    }
    loadServerInfo();
  }, []);

  // 서버에 저장
  const handleServerSave = async () => {
    setServerSaving(true);
    setServerError(null);
    setServerSaved(false);
    try {
      const res = await fetch("/api/backup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ members }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string; exportedAt?: string; count?: number };
      if (!res.ok) {
        setServerError(data.error ?? "서버 저장 중 오류가 발생했습니다.");
        return;
      }
      setServerSaved(true);
      setServerInfo({
        exportedAt: data.exportedAt ?? new Date().toISOString(),
        count: data.count ?? members.length,
        uploadedAt: new Date().toISOString(),
      });
    } catch {
      setServerError("네트워크 오류가 발생했습니다.");
    } finally {
      setServerSaving(false);
    }
  };

  // 서버에서 불러오기
  const handleServerLoad = async () => {
    setServerLoading(true);
    setServerError(null);
    try {
      const res = await fetch("/api/backup");
      const data = (await res.json()) as { members?: unknown[]; exportedAt?: string; count?: number; error?: string };
      if (!res.ok) {
        setServerError(data.error ?? "서버 백업을 불러오는 중 오류가 발생했습니다.");
        return;
      }
      if (!Array.isArray(data.members) || !data.members.every(isValidMember)) {
        setServerError("서버 백업 데이터가 올바르지 않습니다.");
        return;
      }
      setImportPreview({
        members: data.members as Member[],
        exportedAt: data.exportedAt ?? "",
        count: data.count ?? data.members.length,
        source: "server",
      });
      setImportError(null);
      setRestored(false);
    } catch {
      setServerError("네트워크 오류가 발생했습니다.");
    } finally {
      setServerLoading(false);
    }
  };

  // 로컬 파일 변경
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportError(null);
    setImportPreview(null);
    setRestored(false);

    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result;
      if (typeof text !== "string") return;
      const result = parseBackupFile(text);
      if (!result) {
        setImportError("올바른 교적부 백업 파일이 아닙니다.");
        return;
      }
      setImportPreview({ ...result, source: "file" });
    };
    reader.readAsText(file, "utf-8");
    e.target.value = "";
  };

  const handleRestore = () => {
    if (!importPreview) return;
    replaceMembers(importPreview.members);
    setImportPreview(null);
    setShowConfirm(false);
    setRestored(true);
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
                목록
              </Link>
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <Database weight="light" className="h-5 w-5 text-primary" />
            <h1 className="font-semibold">데이터 백업 / 복원</h1>
          </div>
          <div className="w-16" />
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-8 space-y-6">
        {/* 현재 상태 */}
        <Card>
          <CardContent className="p-5">
            <h2 className="text-sm font-semibold text-muted-foreground mb-3">현재 데이터</h2>
            <div className="flex items-center gap-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-primary">{members.length}</p>
                <p className="text-xs text-muted-foreground">전체 교인</p>
              </div>
              <div className="h-10 w-px bg-border" />
              <div className="text-center">
                <p className="text-2xl font-bold text-primary">
                  {members.filter((m) => m.memberStatus === "활동").length}
                </p>
                <p className="text-xs text-muted-foreground">활동 교인</p>
              </div>
              <div className="ml-auto">
                <Button onClick={() => exportMembersJson(members)} className="gap-2">
                  <DownloadSimple weight="light" className="h-4 w-4" />
                  JSON 백업
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 서버 백업 */}
        <Card>
          <CardContent className="p-5">
            <h2 className="text-sm font-semibold mb-1">서버 백업</h2>
            <p className="text-xs text-muted-foreground mb-4">
              Vercel 서버에 저장하면 기기나 브라우저가 바뀌어도 데이터를 복원할 수 있습니다.
            </p>

            {/* 마지막 백업 정보 */}
            {serverInfoLoading ? (
              <p className="text-xs text-muted-foreground mb-3">서버 백업 정보 확인 중...</p>
            ) : serverInfo ? (
              <div className="mb-4 rounded-lg bg-muted px-3 py-2 text-xs text-muted-foreground">
                마지막 서버 백업:{" "}
                <span className="font-medium text-foreground">
                  {new Date(serverInfo.uploadedAt).toLocaleString("ko-KR")}
                </span>
                {" · "}{serverInfo.count}명
              </div>
            ) : (
              <p className="mb-4 text-xs text-muted-foreground">저장된 서버 백업이 없습니다.</p>
            )}

            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                onClick={handleServerSave}
                disabled={serverSaving}
                className="gap-2"
              >
                {serverSaving ? (
                  <CircleNotch weight="bold" className="h-4 w-4 animate-spin" />
                ) : (
                  <CloudArrowUp weight="light" className="h-4 w-4" />
                )}
                서버에 저장
              </Button>
              <Button
                variant="outline"
                onClick={handleServerLoad}
                disabled={serverLoading || !serverInfo}
                className="gap-2"
              >
                {serverLoading ? (
                  <CircleNotch weight="bold" className="h-4 w-4 animate-spin" />
                ) : (
                  <CloudArrowDown weight="light" className="h-4 w-4" />
                )}
                서버에서 불러오기
              </Button>
            </div>

            {serverError && (
              <div className="mt-4 flex items-center gap-2 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
                <Warning weight="light" className="h-4 w-4 shrink-0" />
                {serverError}
              </div>
            )}

            {serverSaved && (
              <div className="mt-4 flex items-center gap-2 rounded-lg bg-primary/10 p-3 text-sm text-primary">
                <CheckCircle weight="light" className="h-4 w-4 shrink-0" />
                {members.length}명의 교적 데이터가 서버에 저장되었습니다.
              </div>
            )}
          </CardContent>
        </Card>

        {/* 백업 안내 */}
        <Card>
          <CardContent className="p-5">
            <h2 className="text-sm font-semibold mb-3">백업 안내</h2>
            <ul className="space-y-1.5 text-sm text-muted-foreground">
              <li className="flex items-start gap-2">
                <span className="text-primary font-medium shrink-0">•</span>
                데이터는 이 기기의 브라우저(localStorage)에 저장됩니다.
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary font-medium shrink-0">•</span>
                브라우저 데이터 초기화 시 교적 데이터가 삭제될 수 있습니다.
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary font-medium shrink-0">•</span>
                서버 백업은 기기/브라우저에 관계없이 복원 가능합니다.
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary font-medium shrink-0">•</span>
                정기적으로 JSON 백업도 함께 다운로드하여 보관하세요.
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary font-medium shrink-0">•</span>
                CSV 내보내기는 교인 목록 화면에서 이용할 수 있습니다.
              </li>
            </ul>
          </CardContent>
        </Card>

        {/* 파일 복원 */}
        <Card>
          <CardContent className="p-5">
            <h2 className="text-sm font-semibold mb-1">파일에서 복원</h2>
            <p className="text-xs text-muted-foreground mb-4">
              이전에 내보낸 JSON 파일을 선택하면 현재 데이터를 대체합니다.
            </p>

            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                className="gap-2"
              >
                <UploadSimple weight="light" className="h-4 w-4" />
                백업 파일 선택
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json,application/json"
                className="hidden"
                onChange={handleFileChange}
              />
            </div>

            {/* 오류 */}
            {importError && (
              <div className="mt-4 flex items-center gap-2 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
                <Warning weight="light" className="h-4 w-4 shrink-0" />
                {importError}
              </div>
            )}

            {/* 완료 */}
            {restored && (
              <div className="mt-4 flex items-center gap-2 rounded-lg bg-primary/10 p-3 text-sm text-primary">
                <CheckCircle weight="light" className="h-4 w-4 shrink-0" />
                교적 데이터가 성공적으로 복원되었습니다.
              </div>
            )}
          </CardContent>
        </Card>

        {/* 복원 미리보기 (파일 or 서버) */}
        {importPreview && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 dark:bg-amber-950/20">
            <div className="flex items-start gap-2 mb-3">
              <Warning weight="light" className="h-4 w-4 shrink-0 text-amber-600 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-amber-800 dark:text-amber-200">복원 확인</p>
                <p className="text-amber-700 dark:text-amber-300">
                  {importPreview.source === "server" ? "서버 백업에서 " : ""}
                  {importPreview.count}명의 교적 데이터를 복원합니다.
                  {importPreview.exportedAt && (
                    <span className="block text-xs mt-0.5">
                      백업 날짜: {new Date(importPreview.exportedAt).toLocaleDateString("ko-KR")}
                    </span>
                  )}
                </p>
                <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">
                  현재 데이터 ({members.length}명)가 모두 교체됩니다. 이 작업은 되돌릴 수 없습니다.
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setImportPreview(null)}
              >
                취소
              </Button>
              <Button
                size="sm"
                className="bg-amber-600 hover:bg-amber-700 text-white"
                onClick={() => setShowConfirm(true)}
              >
                복원 진행
              </Button>
            </div>
          </div>
        )}
      </main>

      <ConfirmDialog
        open={showConfirm}
        title="데이터 복원"
        description={`백업에서 ${importPreview?.count ?? 0}명의 교적을 복원합니다. 현재 데이터(${members.length}명)는 모두 교체됩니다.`}
        confirmLabel="복원"
        cancelLabel="취소"
        destructive
        onConfirm={handleRestore}
        onCancel={() => setShowConfirm(false)}
      />
    </div>
  );
}
