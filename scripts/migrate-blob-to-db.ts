/**
 * Blob → PostgreSQL 마이그레이션 스크립트
 *
 * 실행:
 *   DATABASE_URL=... BLOB_READ_WRITE_TOKEN=... tsx scripts/migrate-blob-to-db.ts
 *
 * 또는 .env.local 이 있는 경우:
 *   tsx --env-file=.env.local scripts/migrate-blob-to-db.ts
 */

import { list } from "@vercel/blob";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { pgTable, uuid, varchar, text, timestamp, date, jsonb } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

// ─── 환경변수 검증 ──────────────────────────────────────────────────────────
const DATABASE_URL = process.env.DATABASE_URL;
const BLOB_TOKEN = process.env.BLOB_READ_WRITE_TOKEN;

if (!DATABASE_URL) {
  console.error("오류: DATABASE_URL 환경변수가 설정되지 않았습니다.");
  process.exit(1);
}
if (!BLOB_TOKEN) {
  console.error("오류: BLOB_READ_WRITE_TOKEN 환경변수가 설정되지 않았습니다.");
  process.exit(1);
}

// ─── 타입 정의 ──────────────────────────────────────────────────────────────
interface PrayerRequest {
  id: string;
  content: string;
  createdAt: string;
}

interface PastoralVisit {
  id: string;
  visitedAt: string;
  content: string;
  createdAt: string;
}

interface Member {
  id: string;
  name: string;
  phone: string | null;
  address: string | null;
  detailAddress: string | null;
  birthDate: string | null;
  gender: string | null;
  position: string | null;
  department: string | null;
  district: string | null;
  familyMembers: string[];
  familyHead?: string | null;
  relationship?: string | null;
  baptismDate: string | null;
  baptismType: string | null;
  baptismChurch: string | null;
  registrationDate: string | null;
  memberJoinDate: string | null;
  carNumber: string | null;
  notes: string | null;
  photoUrl: string | null;
  memberStatus: string;
  prayerRequests: PrayerRequest[];
  pastoralVisits: PastoralVisit[];
  createdAt: string;
  updatedAt: string;
}

// ─── Drizzle 스키마 (schema 파일과 동일하게 정의) ─────────────────────────
const membersTable = pgTable("members", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 50 }).notNull(),
  phone: varchar("phone", { length: 20 }),
  address: varchar("address", { length: 300 }),
  detailAddress: varchar("detail_address", { length: 200 }),
  birthDate: date("birth_date"),
  gender: varchar("gender", { length: 10 }),
  position: varchar("position", { length: 30 }).default("성도"),
  department: varchar("department", { length: 50 }),
  district: varchar("district", { length: 50 }),
  familyMembers: text("family_members").array().default([]).notNull(),
  familyHead: varchar("family_head", { length: 50 }),
  relationship: varchar("relationship", { length: 20 }),
  baptismDate: date("baptism_date"),
  baptismType: varchar("baptism_type", { length: 20 }),
  baptismChurch: varchar("baptism_church", { length: 100 }),
  registrationDate: date("registration_date"),
  memberJoinDate: date("member_join_date"),
  carNumber: varchar("car_number", { length: 20 }),
  notes: text("notes"),
  photoUrl: text("photo_url"),
  memberStatus: varchar("member_status", { length: 10 }).default("활동").notNull(),
  prayerRequests: jsonb("prayer_requests").default([]).notNull(),
  pastoralVisits: jsonb("pastoral_visits").default([]).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

// ─── Blob에서 데이터 읽기 ─────────────────────────────────────────────────
async function fetchFromBlob(): Promise<Member[]> {
  const BLOB_PREFIX = "gwanak-members-backup";
  console.log("Blob에서 최신 백업 조회 중...");

  const { blobs } = await list({ token: BLOB_TOKEN!, prefix: BLOB_PREFIX });
  if (blobs.length === 0) {
    console.log("Blob에 저장된 데이터가 없습니다.");
    return [];
  }

  const sorted = blobs.sort(
    (a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime(),
  );
  const latest = sorted[0]!;
  console.log(`최신 Blob: ${latest.url} (업로드: ${latest.uploadedAt.toISOString()})`);

  const res = await fetch(latest.url, { cache: "no-store" });
  if (!res.ok) throw new Error(`Blob fetch 실패: ${res.status}`);

  const data = await res.json() as { members?: Member[]; count?: number };
  if (!Array.isArray(data?.members)) {
    throw new Error("Blob 데이터 형식이 올바르지 않습니다.");
  }

  console.log(`Blob에서 ${data.members.length}명 로드 완료`);
  return data.members;
}

// ─── DB에 upsert ──────────────────────────────────────────────────────────
async function upsertToDb(members: Member[]): Promise<void> {
  const client = postgres(DATABASE_URL!);
  const db = drizzle(client, { schema: { members: membersTable } });

  console.log(`DB에 ${members.length}명 upsert 시작...`);

  const CHUNK = 50;
  let inserted = 0;

  for (let i = 0; i < members.length; i += CHUNK) {
    const chunk = members.slice(i, i + CHUNK);
    const values = chunk.map((m) => ({
      id: m.id,
      name: m.name,
      phone: m.phone ?? null,
      address: m.address ?? null,
      detailAddress: m.detailAddress ?? null,
      birthDate: m.birthDate ?? null,
      gender: m.gender ?? null,
      position: m.position ?? null,
      department: m.department ?? null,
      district: m.district ?? null,
      familyMembers: Array.isArray(m.familyMembers) ? m.familyMembers : [],
      familyHead: m.familyHead ?? null,
      relationship: m.relationship ?? null,
      baptismDate: m.baptismDate ?? null,
      baptismType: m.baptismType ?? null,
      baptismChurch: m.baptismChurch ?? null,
      registrationDate: m.registrationDate ?? null,
      memberJoinDate: m.memberJoinDate ?? null,
      carNumber: m.carNumber ?? null,
      notes: m.notes ?? null,
      photoUrl: m.photoUrl ?? null,
      memberStatus: m.memberStatus || "활동",
      prayerRequests: Array.isArray(m.prayerRequests) ? m.prayerRequests : [],
      pastoralVisits: Array.isArray(m.pastoralVisits) ? m.pastoralVisits : [],
      createdAt: m.createdAt ? new Date(m.createdAt) : new Date(),
      updatedAt: m.updatedAt ? new Date(m.updatedAt) : new Date(),
    }));

    await db
      .insert(membersTable)
      .values(values)
      .onConflictDoUpdate({
        target: membersTable.id,
        set: {
          name: sql`excluded.name`,
          phone: sql`excluded.phone`,
          address: sql`excluded.address`,
          detailAddress: sql`excluded.detail_address`,
          birthDate: sql`excluded.birth_date`,
          gender: sql`excluded.gender`,
          position: sql`excluded.position`,
          department: sql`excluded.department`,
          district: sql`excluded.district`,
          familyMembers: sql`excluded.family_members`,
          familyHead: sql`excluded.family_head`,
          relationship: sql`excluded.relationship`,
          baptismDate: sql`excluded.baptism_date`,
          baptismType: sql`excluded.baptism_type`,
          baptismChurch: sql`excluded.baptism_church`,
          registrationDate: sql`excluded.registration_date`,
          memberJoinDate: sql`excluded.member_join_date`,
          carNumber: sql`excluded.car_number`,
          notes: sql`excluded.notes`,
          photoUrl: sql`excluded.photo_url`,
          memberStatus: sql`excluded.member_status`,
          prayerRequests: sql`excluded.prayer_requests`,
          pastoralVisits: sql`excluded.pastoral_visits`,
          updatedAt: sql`excluded.updated_at`,
        },
      });

    inserted += chunk.length;
    console.log(`  진행: ${inserted}/${members.length}`);
  }

  // 결과 확인
  const countResult = await db
    .select({ count: sql<string>`COUNT(*)` })
    .from(membersTable);
  const total = parseInt(countResult[0]?.count ?? "0");

  await client.end();
  console.log(`DB upsert 완료. DB 총 교인 수: ${total}명`);
}

// ─── 메인 ─────────────────────────────────────────────────────────────────
async function main() {
  console.log("=== Blob → PostgreSQL 마이그레이션 시작 ===");

  const members = await fetchFromBlob();
  if (members.length === 0) {
    console.log("마이그레이션할 데이터가 없습니다. 종료합니다.");
    return;
  }

  await upsertToDb(members);
  console.log("=== 마이그레이션 완료 ===");
}

main().catch((err) => {
  console.error("마이그레이션 실패:", err);
  process.exit(1);
});
