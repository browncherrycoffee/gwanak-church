import "dotenv/config";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { announcements } from "../src/db/schema/announcements";
import { sermons } from "../src/db/schema/sermons";
import { worshipServices } from "../src/db/schema/worship-services";
import { churchInfo } from "../src/db/schema/church-info";

async function seed() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL이 설정되지 않았습니다.");
  }

  const client = postgres(connectionString);
  const db = drizzle(client);

  console.log("시드 데이터 삽입 중...");

  // 공지사항
  await db.insert(announcements).values([
    {
      title: "2026년 사순절 특별 새벽기도회 안내",
      content:
        "사순절 기간 동안 매일 새벽 5시 30분에 특별 새벽기도회가 진행됩니다.\n\n기간: 2026년 2월 18일 ~ 4월 4일\n시간: 매일 새벽 5시 30분\n장소: 소예배실\n\n성도 여러분의 많은 참여를 부탁드립니다.",
      summary: "사순절 기간 동안 매일 새벽 5시 30분에 특별 새벽기도회가 진행됩니다.",
      category: "예배",
      isPinned: true,
    },
    {
      title: "교회 봄맞이 대청소 봉사",
      content:
        "3월 첫째 주 토요일에 교회 봄맞이 대청소를 진행합니다.\n\n일시: 2026년 3월 7일 (토) 오전 9시\n장소: 교회 전체\n준비물: 편한 복장, 장갑\n\n봉사에 참여를 원하시는 분은 교회 사무실로 연락 바랍니다.",
      summary: "3월 첫째 주 토요일에 교회 봄맞이 대청소를 진행합니다.",
      category: "행사",
      isPinned: false,
    },
    {
      title: "주일학교 교사 모집",
      content:
        "새 학기를 맞아 주일학교 교사를 모집합니다.\n\n대상: 성인 성도\n기간: 2026년 3월 ~ 2027년 2월\n문의: 교육부\n\n아이들과 함께 신앙의 여정을 걸어가실 분들의 지원을 기다립니다.",
      summary: "새 학기를 맞아 주일학교 교사를 모집합니다.",
      category: "교육",
      isPinned: false,
    },
    {
      title: "2월 구역 모임 일정 안내",
      content: "2월 구역 모임은 각 구역별로 진행됩니다. 자세한 일정은 각 구역장에게 문의해 주세요.",
      summary: "2월 구역 모임은 각 구역별로 진행됩니다.",
      category: "일반",
      isPinned: false,
    },
    {
      title: "성가대원 모집",
      content:
        "찬양으로 하나님을 섬기고 싶은 분들을 기다립니다.\n\n연습 시간: 매주 토요일 오후 3시\n장소: 성가대실\n\n음악 경험이 없어도 환영합니다!",
      summary: "찬양으로 하나님을 섬기고 싶은 분들을 기다립니다.",
      category: "일반",
      isPinned: false,
    },
  ]);

  // 설교
  await db.insert(sermons).values([
    {
      title: "하나님의 은혜 안에서",
      preacher: "담임목사",
      scripture: "로마서 8:28-30",
      summary: "모든 것이 합력하여 선을 이루시는 하나님의 섭리와 은혜에 대한 말씀입니다.",
      sermonDate: "2026-02-16",
      category: "주일설교",
    },
    {
      title: "믿음의 사람들",
      preacher: "담임목사",
      scripture: "히브리서 11:1-6",
      summary: "믿음이란 무엇인지, 믿음의 선진들을 통해 배우는 참된 신앙의 모습입니다.",
      sermonDate: "2026-02-09",
      category: "주일설교",
    },
    {
      title: "기도의 능력",
      preacher: "부목사",
      scripture: "마태복음 6:5-13",
      summary: "주기도문을 통해 배우는 기도의 본질과 능력에 대한 말씀입니다.",
      sermonDate: "2026-02-11",
      category: "수요설교",
    },
    {
      title: "사랑의 실천",
      preacher: "담임목사",
      scripture: "고린도전서 13:1-13",
      summary: "사랑장을 통해 배우는 그리스도인의 사랑의 삶에 대한 말씀입니다.",
      sermonDate: "2026-02-02",
      category: "주일설교",
    },
    {
      title: "소망 가운데 기뻐하라",
      preacher: "담임목사",
      scripture: "로마서 12:9-21",
      summary: "환난 중에도 소망을 잃지 않고 기뻐하는 그리스도인의 삶에 대한 말씀입니다.",
      sermonDate: "2026-01-26",
      category: "주일설교",
    },
    {
      title: "영적 전투와 승리",
      preacher: "부목사",
      scripture: "에베소서 6:10-18",
      summary: "하나님의 전신갑주를 입고 영적 싸움에서 승리하는 방법에 대한 말씀입니다.",
      sermonDate: "2026-02-04",
      category: "수요설교",
    },
  ]);

  // 예배 시간
  await db.insert(worshipServices).values([
    {
      name: "주일 1부 예배",
      dayOfWeek: 0,
      startTime: "09:00",
      endTime: "10:30",
      location: "본당",
      description: "새벽같이 드리는 첫 번째 예배",
      sortOrder: 1,
    },
    {
      name: "주일 2부 예배",
      dayOfWeek: 0,
      startTime: "11:00",
      endTime: "12:30",
      location: "본당",
      description: "온 가족이 함께하는 예배",
      sortOrder: 2,
    },
    {
      name: "주일 3부 예배",
      dayOfWeek: 0,
      startTime: "14:00",
      endTime: "15:30",
      location: "본당",
      description: "오후에 드리는 예배",
      sortOrder: 3,
    },
    {
      name: "수요 예배",
      dayOfWeek: 3,
      startTime: "19:30",
      endTime: "21:00",
      location: "본당",
      description: "한 주의 중심, 말씀과 기도의 시간",
      sortOrder: 4,
    },
    {
      name: "금요 기도회",
      dayOfWeek: 5,
      startTime: "20:00",
      endTime: "21:30",
      location: "기도실",
      description: "간절한 기도로 한 주를 마무리합니다",
      sortOrder: 5,
    },
    {
      name: "새벽 기도회",
      dayOfWeek: -1,
      startTime: "05:30",
      endTime: "06:30",
      location: "소예배실",
      description: "매일 아침 말씀과 기도로 시작합니다 (월~토)",
      sortOrder: 6,
    },
  ]);

  // 교회 정보
  await db.insert(churchInfo).values([
    {
      key: "pastor_greeting",
      value:
        "관악교회 홈페이지를 방문해 주신 여러분을 진심으로 환영합니다. 저희 교회는 하나님의 말씀 위에 세워진 교회로서, 예배와 말씀, 기도와 교제를 통해 하나님 나라를 이루어가는 공동체입니다.",
    },
    {
      key: "vision",
      value: "하나님을 사랑하고, 이웃을 사랑하며, 세상을 섬기는 교회",
    },
    {
      key: "mission",
      value: "예배, 양육, 봉사, 선교를 통해 그리스도의 제자를 세우는 교회",
    },
    {
      key: "address",
      value: "서울특별시 관악구",
    },
    {
      key: "phone",
      value: "02-XXX-XXXX",
    },
  ]);

  console.log("시드 데이터 삽입 완료!");
  await client.end();
}

seed().catch((err) => {
  console.error("시드 실패:", err);
  process.exit(1);
});
