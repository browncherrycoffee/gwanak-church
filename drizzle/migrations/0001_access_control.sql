-- 접근 권한 체계 신설 (2026-10)
-- 전부 "추가"만 한다. 기존 members 테이블의 컬럼·데이터는 변경하지 않는다.
-- 운영 반영은 3단계 승인 후에만 실행한다.

CREATE TABLE IF NOT EXISTS app_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id uuid REFERENCES members(id),
  display_name varchar(50) NOT NULL,
  title varchar(30),
  role_grade varchar(10) NOT NULL DEFAULT '없음',
  is_admin boolean NOT NULL DEFAULT false,
  status varchar(10) NOT NULL DEFAULT 'active',
  code_hash varchar(64),
  code_issued_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS app_users_code_hash_idx ON app_users(code_hash);

CREATE TABLE IF NOT EXISTS user_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  unit_type varchar(12) NOT NULL,
  unit_name varchar(40) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS user_assignments_uniq ON user_assignments(user_id, unit_type, unit_name);

CREATE TABLE IF NOT EXISTS member_departments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id uuid NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  department_name varchar(40) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS member_departments_uniq ON member_departments(member_id, department_name);
CREATE INDEX IF NOT EXISTS member_departments_dept_idx ON member_departments(department_name);

CREATE TABLE IF NOT EXISTS prayers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id uuid NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  content text NOT NULL,
  author_user_id uuid REFERENCES app_users(id),
  last_editor_user_id uuid REFERENCES app_users(id),
  legacy_id varchar(40),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS prayers_member_idx ON prayers(member_id);

CREATE TABLE IF NOT EXISTS pastoral_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id uuid NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  visited_at varchar(10),
  shared_content text,
  author_user_id uuid REFERENCES app_users(id),
  last_editor_user_id uuid REFERENCES app_users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS pastoral_records_member_idx ON pastoral_records(member_id);

CREATE TABLE IF NOT EXISTS pastoral_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  record_id uuid NOT NULL REFERENCES pastoral_records(id) ON DELETE CASCADE,
  author_user_id uuid NOT NULL REFERENCES app_users(id),
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS pastoral_notes_record_idx ON pastoral_notes(record_id);

CREATE TABLE IF NOT EXISTS sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token_hash varchar(64) NOT NULL,
  user_id uuid NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  expires_at timestamptz NOT NULL,
  admin_verified_until timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS sessions_token_hash_idx ON sessions(token_hash);

CREATE TABLE IF NOT EXISTS audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_user_id uuid REFERENCES app_users(id),
  action varchar(50) NOT NULL,
  target_type varchar(20),
  target_id varchar(40),
  detail jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS audit_log_created_idx ON audit_log(created_at);

-- 성도 등록자 기록 (members 테이블 불변 원칙에 따라 별도 테이블)
CREATE TABLE IF NOT EXISTS member_registrants (
  member_id uuid PRIMARY KEY REFERENCES members(id) ON DELETE CASCADE,
  created_by_user_id uuid REFERENCES app_users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);
