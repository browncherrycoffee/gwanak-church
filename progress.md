# 교적부 작업 진행 상황 (2026-07-20 저장)

## 완료된 작업 (모두 커밋·배포 완료 — https://gwanak-church.vercel.app)

### 1. 전체 상태 점검 (2026-07-15)
- 사이트/DB/실시간 동기화/자동 백업 모두 정상 확인 (교인 220명, 일일 백업 86일 연속 성공)
- 문제점 5건 발견 → 아래에서 전부 해결

### 2. 백업 보안·운영 개선 (커밋 e2c2602)
- **백업 암호화**: 모든 백업 blob AES-256-GCM 암호화 (`src/lib/backup-crypto.ts`)
  - 키: `BACKUP_ENCRYPTION_KEY` (Vercel production/preview/development + `.env.local` 등록 완료)
  - 기존 평문 blob 89개 재암호화 완료, 평문 원본은 `관악교회 교적부 백업 데이터/blob-archive-2026-07-14/`에 로컬 보관 (gitignore됨)
  - 복호화 도구: `node scripts/decrypt-backup.mjs <파일|URL> [out.json]`
- **보존 정책**: daily-backup이 30일 지난 일일 스냅샷 자동 삭제 (월말 백업은 영구 보존)
- `scripts/check-db.js`에서 하드코딩된 DB 비밀번호 제거 (.env.local의 DATABASE_URL 사용)
- 백그라운드 탭에서 2초 폴링 중단 (server-sync.tsx, `document.hidden` 체크)
- tmp-review.html 삭제, `.playwright-mcp/` gitignore 추가

### 3. 가족 매칭 + 공동의회회원 (커밋 d8b3812)
- 주소 동일(주소+상세주소) → 가족 자동 매칭: `scripts/link-families-by-address.mjs`
  - 실행 완료: 21개 그룹, 60명에게 가족 링크 128개 추가, 재검사 누락 0건
- 검색 개선: 이름 매칭된 교인의 가족을 항상 검색 후보에 포함 (`src/lib/search.ts`)
- **공동의회회원 기능**:
  - DB 컬럼 `congregation_member` (boolean, default false) — Neon에 ALTER 실행 완료
  - 타입/스키마/API(members, members/[id])/폼(예·아니오 select)/상세 페이지 표시/CSV 열 추가
  - 명부 페이지 `/members/congregation` (검색·정렬·인쇄)

### 4. 교인 목록 탭 (커밋 c212c38)
- `/members` 상단에 [전체등록교인 | 공동의회회원] 탭 추가
- 탭별 검색·필터·정렬·CSV 내보내기 연동

## 미해결 / 참고 사항
- **"류선율"**: 류영협·오종미 님의 가족 목록에 있으나 교적에 미등록 → 교인으로 등록할지 사용자 결정 필요
- **Neon DB 비밀번호 교체 권장** (선택): check-db.js에 평문으로 있었던 비밀번호. git에 커밋된 적은 없으나 교체하면 더 안전. 교체 시 Vercel 환경변수 + .env.local 갱신 필요
- 공동의회회원은 현재 전원 "아니오" 상태 — 사용자가 교인 수정 화면에서 지정해야 명부에 표시됨
- drizzle 마이그레이션 파일은 생성하지 않고 DB에 직접 ALTER함 (스키마 코드와 DB는 일치 상태)

## 다음 할 일 (내일 이어서)
1. 사용자가 새 요청을 주면 그대로 진행
2. (대기 중인 확인 사항) 류선율 교인 등록 여부, Neon 비밀번호 교체 여부

## 환경 메모
- 배포: `cd /Users/browncherry/gwanak && npx next build` 확인 후 `git add → commit → push → vercel --prod`
- DB 점검: `node scripts/check-db.js [이름]`
- 백업 blob 확인: store_7EK7x03fIGYhH34V (sports-day·relocation과 공유)
- 마지막 커밋: c212c38 (main, push됨)
