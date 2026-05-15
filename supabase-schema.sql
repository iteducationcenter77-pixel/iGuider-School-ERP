create table if not exists platform_schools (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  code text unique not null,
  city text,
  contact_name text,
  email text,
  mobile text,
  status text not null default 'Pending' check (status in ('Active', 'Inactive', 'Pending')),
  plan text not null default 'Trial',
  joined date not null default current_date,
  created_at timestamptz not null default now()
);

create table if not exists school_profiles (
  id uuid primary key default gen_random_uuid(),
  platform_school_id uuid references platform_schools(id) on delete cascade,
  name text not null,
  code text unique not null,
  session text,
  board text,
  city text,
  created_at timestamptz not null default now()
);

create table if not exists app_users (
  id uuid primary key default gen_random_uuid(),
  school_id uuid references school_profiles(id) on delete cascade,
  role text not null check (role in ('platform', 'admin', 'teacher', 'parent')),
  name text not null,
  username text unique not null,
  password_hash text,
  teacher_id uuid,
  parent_id uuid,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists classes (
  id uuid primary key default gen_random_uuid(),
  school_id uuid references school_profiles(id) on delete cascade,
  name text not null,
  grade text not null,
  section text not null,
  room text,
  class_teacher_id uuid,
  created_at timestamptz not null default now()
);

create table if not exists subjects (
  id uuid primary key default gen_random_uuid(),
  school_id uuid references school_profiles(id) on delete cascade,
  name text not null,
  code text not null,
  created_at timestamptz not null default now()
);

create table if not exists teachers (
  id uuid primary key default gen_random_uuid(),
  school_id uuid references school_profiles(id) on delete cascade,
  name text not null,
  username text unique not null,
  email text,
  phone text,
  subjects jsonb not null default '[]',
  classes jsonb not null default '[]',
  class_teacher_of text,
  status text not null default 'Active',
  created_at timestamptz not null default now()
);

create table if not exists parents (
  id uuid primary key default gen_random_uuid(),
  school_id uuid references school_profiles(id) on delete cascade,
  name text not null,
  username text unique not null,
  email text,
  phone text,
  created_at timestamptz not null default now()
);

create table if not exists students (
  id uuid primary key default gen_random_uuid(),
  school_id uuid references school_profiles(id) on delete cascade,
  parent_id uuid references parents(id),
  admission_no text,
  name text not null,
  class_name text not null,
  roll_no text,
  dob date,
  status text not null default 'Active',
  created_at timestamptz not null default now()
);

create table if not exists notices (
  id uuid primary key default gen_random_uuid(),
  school_id uuid references school_profiles(id) on delete cascade,
  title text not null,
  audience text not null,
  priority text not null default 'Normal',
  message text not null,
  notice_date date not null default current_date,
  created_at timestamptz not null default now()
);

create table if not exists exams (
  id uuid primary key default gen_random_uuid(),
  school_id uuid references school_profiles(id) on delete cascade,
  name text not null,
  type text not null,
  class_name text not null,
  max_marks numeric not null,
  exam_date date,
  status text not null default 'Scheduled',
  created_at timestamptz not null default now()
);

create table if not exists marks (
  id uuid primary key default gen_random_uuid(),
  school_id uuid references school_profiles(id) on delete cascade,
  exam_id uuid references exams(id),
  student_id uuid references students(id) on delete cascade,
  class_name text not null,
  subject text not null,
  type text not null,
  title text not null,
  score numeric not null,
  max_marks numeric not null,
  published boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists attendance (
  id uuid primary key default gen_random_uuid(),
  school_id uuid references school_profiles(id) on delete cascade,
  student_id uuid references students(id) on delete cascade,
  class_name text not null,
  attendance_date date not null,
  status text not null,
  note text,
  created_at timestamptz not null default now()
);

create table if not exists homework (
  id uuid primary key default gen_random_uuid(),
  school_id uuid references school_profiles(id) on delete cascade,
  teacher_id uuid,
  class_name text not null,
  subject text not null,
  title text not null,
  due_date date,
  details text,
  created_at timestamptz not null default now()
);

create table if not exists fees (
  id uuid primary key default gen_random_uuid(),
  school_id uuid references school_profiles(id) on delete cascade,
  student_id uuid references students(id) on delete cascade,
  term text not null,
  amount numeric not null,
  paid numeric not null default 0,
  due_date date,
  status text not null default 'Due',
  created_at timestamptz not null default now()
);

create table if not exists timetable (
  id uuid primary key default gen_random_uuid(),
  school_id uuid references school_profiles(id) on delete cascade,
  class_name text not null,
  day text not null,
  period text not null,
  subject text not null,
  teacher_id uuid,
  time text,
  created_at timestamptz not null default now()
);

create table if not exists question_papers (
  id uuid primary key default gen_random_uuid(),
  school_id uuid references school_profiles(id) on delete cascade,
  teacher_id uuid,
  class_name text not null,
  subject text not null,
  title text not null,
  duration text,
  max_marks text,
  questions text,
  created_at timestamptz not null default now()
);

create table if not exists audit_logs (
  id uuid primary key default gen_random_uuid(),
  school_id uuid references school_profiles(id) on delete cascade,
  actor text not null,
  action text not null,
  log_date date not null default current_date,
  created_at timestamptz not null default now()
);

