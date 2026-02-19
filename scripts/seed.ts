import "dotenv/config";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { members } from "../src/db/schema/members";

async function seed() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL이 설정되지 않았습니다.");
  }

  const client = postgres(connectionString);
  const db = drizzle(client);

  console.log("교적 시드 데이터 삽입 중...");

  await db.insert(members).values([
    {
      name: "김영수",
      phone: "010-1234-5678",
      address: "서울특별시 관악구 봉천동 123-45",
      detailAddress: "관악아파트 101동 501호",
      birthDate: "1965-03-15",
      gender: "남",
      position: "장로",
      department: "1부 예배",
      district: "1구역",
      familyHead: "김영수",
      relationship: "본인(세대주)",
      baptismDate: "1990-04-15",
      baptismType: "세례",
      registrationDate: "1988-01-10",
      notes: "재정위원",
    },
    {
      name: "김미숙",
      phone: "010-1234-5679",
      address: "서울특별시 관악구 봉천동 123-45",
      detailAddress: "관악아파트 101동 501호",
      birthDate: "1968-07-22",
      gender: "여",
      position: "권사",
      department: "1부 예배",
      district: "1구역",
      familyHead: "김영수",
      relationship: "배우자",
      baptismDate: "1992-04-12",
      baptismType: "세례",
      registrationDate: "1992-01-05",
    },
  ]);

  console.log("시드 데이터 삽입 완료!");
  await client.end();
}

seed().catch((err) => {
  console.error("시드 실패:", err);
  process.exit(1);
});
