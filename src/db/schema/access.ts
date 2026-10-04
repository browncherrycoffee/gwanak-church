import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  boolean,
  jsonb,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { members } from "./members";

// ─── 접근 권한 체계 (2026-10 신설) ──────────────────────────────────────────
// 기존 members 테이블은 변경하지 않는다. 전부 추가 전용.

// 권한 등급: 목사 / 장로 / 집사 / 행정지원 / 없음
// 시스템 관리자 여부(isAdmin)는 등급과 별개.
export const appUsers = pgTable(
  "app_users",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    memberId: uuid("member_id").references(() => members.id),
    displayName: varchar("display_name", { length: 50 }).notNull(),
    title: varchar("title", { length: 30 }), // 표시용 직함 (담임목사, 교수목사, 기관강도사 …)
    roleGrade: varchar("role_grade", { length: 10 }).notNull().default("없음"), // 목사|장로|집사|행정지원|없음
    isAdmin: boolean("is_admin").notNull().default(false),
    status: varchar("status", { length: 10 }).notNull().default("active"), // active|disabled
    // 심방기록 열람 범위: all(등급 규칙대로 전체) | units(담당 조·부서 성도만) | own(본인 작성만)
    pastoralScope: varchar("pastoral_scope", { length: 10 }).notNull().default("all"),
    // 기도제목 범위: default(등급·담당 규칙) | all(전체 열람+추가 — 감사 기도제목 입력 담당자용)
    prayerScope: varchar("prayer_scope", { length: 10 }).notNull().default("default"),
    // 접속 코드는 원문 저장 금지 — SHA-256(pepper 포함) 해시만
    codeHash: varchar("code_hash", { length: 64 }),
    codeIssuedAt: timestamp("code_issued_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [uniqueIndex("app_users_code_hash_idx").on(t.codeHash)],
);

// 담당 지정: 어느 나눔조의 조장인지 / 어느 부서의 부서장(회장·총무·헬퍼)인지
export const userAssignments = pgTable(
  "user_assignments",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => appUsers.id, { onDelete: "cascade" }),
    unitType: varchar("unit_type", { length: 12 }).notNull(), // nanumjo|department
    unitName: varchar("unit_name", { length: 40 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [uniqueIndex("user_assignments_uniq").on(t.userId, t.unitType, t.unitName)],
);

// 성도별 부서 소속 (여러 개 가능). 기존 members.department(단일)는 보존, 이 테이블이 새 기준.
export const memberDepartments = pgTable(
  "member_departments",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    memberId: uuid("member_id")
      .notNull()
      .references(() => members.id, { onDelete: "cascade" }),
    departmentName: varchar("department_name", { length: 40 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    uniqueIndex("member_departments_uniq").on(t.memberId, t.departmentName),
    index("member_departments_dept_idx").on(t.departmentName),
  ],
);

// 기도제목 v2 — 성도 1명에 연결된 단일 기록. 작성자/최종 수정자/시각 기록.
// 기존 members.prayer_requests(jsonb)는 삭제하지 않고 보존(이전 후 읽기 중단).
export const prayers = pgTable(
  "prayers",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    memberId: uuid("member_id")
      .notNull()
      .references(() => members.id, { onDelete: "cascade" }),
    content: text("content").notNull(),
    authorUserId: uuid("author_user_id").references(() => appUsers.id), // null = 작성자 미상(기존 데이터)
    lastEditorUserId: uuid("last_editor_user_id").references(() => appUsers.id),
    legacyId: varchar("legacy_id", { length: 40 }), // 이전된 기존 jsonb 항목 id
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("prayers_member_idx").on(t.memberId)],
);

// 공유 심방기록 — 관리자·목사·장로·집사 열람 (행정지원 제외)
export const pastoralRecords = pgTable(
  "pastoral_records",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    memberId: uuid("member_id")
      .notNull()
      .references(() => members.id, { onDelete: "cascade" }),
    visitedAt: varchar("visited_at", { length: 10 }), // YYYY-MM-DD
    sharedContent: text("shared_content"), // null 가능 (비공개 메모만 있는 기록)
    authorUserId: uuid("author_user_id").references(() => appUsers.id),
    lastEditorUserId: uuid("last_editor_user_id").references(() => appUsers.id),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("pastoral_records_member_idx").on(t.memberId)],
);

// 비공개 심방메모 — 작성자 본인·담임목사(목사 등급)·관리자만. 접근 규칙이 달라 별도 테이블로 분리.
export const pastoralNotes = pgTable(
  "pastoral_notes",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    recordId: uuid("record_id")
      .notNull()
      .references(() => pastoralRecords.id, { onDelete: "cascade" }),
    authorUserId: uuid("author_user_id")
      .notNull()
      .references(() => appUsers.id),
    content: text("content").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("pastoral_notes_record_idx").on(t.recordId)],
);

// 세션 — 토큰 원문은 쿠키에만, DB에는 해시 저장
export const sessions = pgTable(
  "sessions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tokenHash: varchar("token_hash", { length: 64 }).notNull(),
    userId: uuid("user_id")
      .notNull()
      .references(() => appUsers.id, { onDelete: "cascade" }),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    adminVerifiedUntil: timestamp("admin_verified_until", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [uniqueIndex("sessions_token_hash_idx").on(t.tokenHash)],
);

// 성도 등록자 기록 (members 테이블 불변 원칙에 따라 별도 테이블)
export const memberRegistrants = pgTable("member_registrants", {
  memberId: uuid("member_id")
    .primaryKey()
    .references(() => members.id, { onDelete: "cascade" }),
  createdByUserId: uuid("created_by_user_id").references(() => appUsers.id),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

// 변경 이력 — 권한 변경, 코드 발급·중지, 주요 기록 수정·삭제.
// 심방메모·기도제목 원문, 접속 코드는 절대 기록하지 않는다.
export const auditLog = pgTable(
  "audit_log",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    actorUserId: uuid("actor_user_id").references(() => appUsers.id),
    action: varchar("action", { length: 50 }).notNull(),
    targetType: varchar("target_type", { length: 20 }),
    targetId: varchar("target_id", { length: 40 }),
    detail: jsonb("detail"), // 민감 원문 금지 — 식별자·항목명만
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("audit_log_created_idx").on(t.createdAt)],
);
