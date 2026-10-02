import { db } from "@/db";
import { auditLog } from "@/db/schema";

// 변경 이력 기록. 심방메모·기도제목 원문, 접속 코드는 절대 넣지 않는다.
export async function logAudit(
  actorUserId: string | null,
  action: string,
  targetType?: string,
  targetId?: string,
  detail?: Record<string, string | number | boolean | null>,
): Promise<void> {
  try {
    await db.insert(auditLog).values({
      actorUserId,
      action,
      targetType: targetType ?? null,
      targetId: targetId ?? null,
      detail: detail ?? null,
    });
  } catch (err) {
    // 이력 기록 실패가 본 작업을 막지는 않되, 서버 로그에는 남긴다
    console.error("[audit] 기록 실패:", action, err);
  }
}
