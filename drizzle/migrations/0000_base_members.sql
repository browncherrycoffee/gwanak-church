-- 기본 members 테이블 (현재 운영 스키마와 동일 구조)
-- 운영 DB에는 이미 존재하므로 IF NOT EXISTS로 아무 변화 없음. 테스트 DB 초기화용.

CREATE TABLE IF NOT EXISTS members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name varchar(50) NOT NULL,
  phone varchar(20),
  address varchar(300),
  detail_address varchar(200),
  birth_date date,
  gender varchar(10),
  position varchar(30) DEFAULT '성도',
  department varchar(50),
  district varchar(50),
  nanumjo varchar(20),
  family_members text[] NOT NULL DEFAULT '{}',
  family_head varchar(50),
  relationship varchar(20),
  baptism_date date,
  baptism_type varchar(20),
  baptism_church varchar(100),
  registration_date date,
  member_join_date date,
  car_number varchar(20),
  notes text,
  photo_url text,
  member_status varchar(10) NOT NULL DEFAULT '활동',
  congregation_member boolean NOT NULL DEFAULT false,
  prayer_requests jsonb NOT NULL DEFAULT '[]',
  pastoral_visits jsonb NOT NULL DEFAULT '[]',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
