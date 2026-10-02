-- 사용자별 심방기록 열람 범위 한정 (2026-10-02)
-- 'all' = 등급 규칙대로 전체(기본), 'units' = 자신이 담당한 조·부서 성도의 심방기록만
ALTER TABLE app_users ADD COLUMN IF NOT EXISTS pastoral_scope varchar(10) NOT NULL DEFAULT 'all';
