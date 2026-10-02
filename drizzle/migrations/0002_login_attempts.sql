-- 로그인 시도 기록 (6자리 코드 전환에 따른 무차별 대입 방어 강화)
-- 서버 재시작과 무관하게 유지되는 DB 기반 시도 제한.

CREATE TABLE IF NOT EXISTS login_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ip varchar(60) NOT NULL,
  success boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS login_attempts_ip_time_idx ON login_attempts(ip, created_at);
CREATE INDEX IF NOT EXISTS login_attempts_time_idx ON login_attempts(created_at);
