import { sql } from "drizzle-orm";
import { db } from "@/db";

// DB 기반 로그인 시도 제한 — 6자리 코드의 짧은 길이를 보완하는 핵심 방어.
// 서버(서버리스 인스턴스) 재시작에도 유지된다. 확인 실패 시 차단이 기본.
//
// 정책:
//  - 같은 IP: 10분 내 실패 5회 → 차단 (10분)
//  - 전체(모든 IP 합산): 10분 내 실패 30회 → 전면 차단 (10분, IP 분산 공격 대응)
const WINDOW_MINUTES = 10;
const PER_IP_LIMIT = 5;
const GLOBAL_LIMIT = 30;

export async function checkLoginAllowed(ip: string): Promise<{ allowed: boolean; reason?: string }> {
  try {
    const result = await db.execute(sql`
      SELECT
        COUNT(*) FILTER (WHERE ip = ${ip})::int AS ip_fails,
        COUNT(*)::int AS global_fails
      FROM login_attempts
      WHERE success = false AND created_at > now() - interval '${sql.raw(String(WINDOW_MINUTES))} minutes'
    `);
    const row = (result as unknown as { ip_fails: number; global_fails: number }[])[0];
    if (!row) return { allowed: false, reason: "확인 실패" };
    if (row.ip_fails >= PER_IP_LIMIT) {
      return { allowed: false, reason: "시도가 너무 많습니다. 10분 후 다시 시도하세요." };
    }
    if (row.global_fails >= GLOBAL_LIMIT) {
      return { allowed: false, reason: "잠시 후 다시 시도하세요." };
    }
    return { allowed: true };
  } catch (err) {
    console.error("[login-throttle] 확인 실패:", err);
    return { allowed: false, reason: "잠시 후 다시 시도하세요." }; // 확인 불가 → 차단
  }
}

export async function recordLoginAttempt(ip: string, success: boolean): Promise<void> {
  try {
    await db.execute(sql`INSERT INTO login_attempts (ip, success) VALUES (${ip}, ${success})`);
    // 오래된 기록 정리 (1% 확률로 — 비용 절약)
    if (Math.random() < 0.01) {
      await db.execute(sql`DELETE FROM login_attempts WHERE created_at < now() - interval '1 day'`);
    }
  } catch (err) {
    console.error("[login-throttle] 기록 실패:", err);
  }
}
