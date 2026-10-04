-- 사용자별 기도제목 범위 확장 (2026-10-04)
-- 'default' = 등급·담당 규칙대로(기본), 'all' = 조·부서 무관 전체 열람 + 추가 가능
-- (헌금 감사 기도제목 입력 담당자용. 수정=작성자 본인, 삭제=관리자 규칙은 그대로)
ALTER TABLE app_users ADD COLUMN IF NOT EXISTS prayer_scope varchar(10) NOT NULL DEFAULT 'default';
