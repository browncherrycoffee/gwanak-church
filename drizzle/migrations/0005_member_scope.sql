-- 사용자별 성도 정보 열람 범위 확장 (2026-10-13)
-- 'default' = 등급 규칙대로, 'full' = 직분 없어도 성도 정보는 집사와 동일(전체 열람·등록)
-- (예: 손효석 — 12월 안수집사 예정, 성도 정보만 선부여. 심방·기도제목 규칙은 불변)
ALTER TABLE app_users ADD COLUMN IF NOT EXISTS member_scope varchar(10) NOT NULL DEFAULT 'default';
