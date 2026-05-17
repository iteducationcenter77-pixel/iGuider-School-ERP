-- Optional one-time import of the old browser demo data.
-- Run this in the Supabase SQL editor only if you want the old demo records
-- available in the live database for review/deletion from /admin.

insert into platform_schools (id, name, code, city, contact_name, email, mobile, status, plan, joined)
values
  ('00000000-0000-4000-8000-000000000001', 'iGuider International School', 'IGS-2026', 'New Delhi', 'School Admin', 'admin@iguider.edu', '9876540000', 'Active', 'Premium', '2026-05-15'),
  ('00000000-0000-4000-8000-000000000002', 'North Valley Public School', 'NVP-2026', 'Jaipur', 'Kavita Rao', 'kavita@nvp.edu', '9876508899', 'Pending', 'Trial', '2026-05-14')
on conflict (code) do nothing;

insert into school_profiles (id, platform_school_id, name, code, session, board, city)
values
  ('00000000-0000-4000-8000-000000000101', '00000000-0000-4000-8000-000000000001', 'iGuider International School', 'IGS-2026', '2026-2027', 'CBSE', 'New Delhi')
on conflict (code) do nothing;

insert into teachers (id, school_id, name, username, email, phone, subjects, classes, class_teacher_of, status)
values
  ('00000000-0000-4000-8000-000000000201', '00000000-0000-4000-8000-000000000101', 'Anita Sharma', 'anita', 'anita@iguider.edu', '9876541111', '["Mathematics"]', '["8A", "9A"]', '8A', 'Active'),
  ('00000000-0000-4000-8000-000000000202', '00000000-0000-4000-8000-000000000101', 'Rohan Mehta', 'rohan', 'rohan@iguider.edu', '9876542222', '["Science"]', '["8A", "10A"]', '10A', 'Active')
on conflict (id) do nothing;

insert into parents (id, school_id, name, username, email, phone)
values
  ('00000000-0000-4000-8000-000000000301', '00000000-0000-4000-8000-000000000101', 'Rahul Verma', 'parent1', 'rahul@example.com', '9876543210'),
  ('00000000-0000-4000-8000-000000000302', '00000000-0000-4000-8000-000000000101', 'Priya Singh', 'parent2', 'priya@example.com', '9876500012'),
  ('00000000-0000-4000-8000-000000000303', '00000000-0000-4000-8000-000000000101', 'Sameer Khan', 'parent3', 'sameer@example.com', '9876505512')
on conflict (username) do nothing;

insert into students (id, school_id, parent_id, admission_no, name, class_name, roll_no, dob, status)
values
  ('00000000-0000-4000-8000-000000000401', '00000000-0000-4000-8000-000000000101', '00000000-0000-4000-8000-000000000301', 'IG-1001', 'Aarav Verma', '8A', '08', '2013-03-11', 'Active'),
  ('00000000-0000-4000-8000-000000000402', '00000000-0000-4000-8000-000000000101', '00000000-0000-4000-8000-000000000302', 'IG-1002', 'Meera Singh', '8A', '12', '2013-08-24', 'Active'),
  ('00000000-0000-4000-8000-000000000403', '00000000-0000-4000-8000-000000000101', '00000000-0000-4000-8000-000000000303', 'IG-1003', 'Kabir Khan', '10A', '03', '2011-01-19', 'Active')
on conflict (id) do nothing;

insert into app_users (id, school_id, role, name, username, password_hash, teacher_id, parent_id)
values
  ('00000000-0000-4000-8000-000000000501', null, 'platform', 'iGuider Platform Admin', 'platform', 'admin123', null, null),
  ('00000000-0000-4000-8000-000000000502', '00000000-0000-4000-8000-000000000101', 'admin', 'School Admin', 'admin', 'admin123', null, null),
  ('00000000-0000-4000-8000-000000000503', '00000000-0000-4000-8000-000000000101', 'teacher', 'Anita Sharma', 'anita', 'teach123', '00000000-0000-4000-8000-000000000201', null),
  ('00000000-0000-4000-8000-000000000504', '00000000-0000-4000-8000-000000000101', 'teacher', 'Rohan Mehta', 'rohan', 'teach123', '00000000-0000-4000-8000-000000000202', null),
  ('00000000-0000-4000-8000-000000000505', '00000000-0000-4000-8000-000000000101', 'parent', 'Rahul Verma', 'parent1', 'parent123', null, '00000000-0000-4000-8000-000000000301')
on conflict (username) do nothing;

insert into classes (id, school_id, name, grade, section, room, class_teacher_id)
values
  ('00000000-0000-4000-8000-000000000601', '00000000-0000-4000-8000-000000000101', '8A', '8', 'A', '204', '00000000-0000-4000-8000-000000000201'),
  ('00000000-0000-4000-8000-000000000602', '00000000-0000-4000-8000-000000000101', '9A', '9', 'A', '301', '00000000-0000-4000-8000-000000000201'),
  ('00000000-0000-4000-8000-000000000603', '00000000-0000-4000-8000-000000000101', '10A', '10', 'A', '402', '00000000-0000-4000-8000-000000000202')
on conflict (id) do nothing;

insert into subjects (id, school_id, name, code)
values
  ('00000000-0000-4000-8000-000000000701', '00000000-0000-4000-8000-000000000101', 'Mathematics', 'MATH'),
  ('00000000-0000-4000-8000-000000000702', '00000000-0000-4000-8000-000000000101', 'Science', 'SCI'),
  ('00000000-0000-4000-8000-000000000703', '00000000-0000-4000-8000-000000000101', 'English', 'ENG'),
  ('00000000-0000-4000-8000-000000000704', '00000000-0000-4000-8000-000000000101', 'Social Science', 'SST')
on conflict (id) do nothing;

insert into notices (id, school_id, title, audience, priority, message, notice_date)
values
  ('00000000-0000-4000-8000-000000000801', '00000000-0000-4000-8000-000000000101', 'Unit Test Schedule', 'Class 8A', 'High', 'Class tests begin from Monday. Please check the portal for marks updates.', '2026-05-15'),
  ('00000000-0000-4000-8000-000000000802', '00000000-0000-4000-8000-000000000101', 'Fee Reminder', 'All Parents', 'Normal', 'Quarterly fee payment window closes this Friday.', '2026-05-12')
on conflict (id) do nothing;

insert into exams (id, school_id, name, type, class_name, max_marks, exam_date, status)
values
  ('00000000-0000-4000-8000-000000000901', '00000000-0000-4000-8000-000000000101', 'Unit Test 1', 'Class Test', '8A', 50, '2026-05-20', 'Scheduled'),
  ('00000000-0000-4000-8000-000000000902', '00000000-0000-4000-8000-000000000101', 'Mid Term', 'Exam', '8A', 100, '2026-07-10', 'Scheduled')
on conflict (id) do nothing;

insert into marks (id, school_id, exam_id, student_id, class_name, subject, type, title, score, max_marks, published)
values
  ('00000000-0000-4000-8000-000000001001', '00000000-0000-4000-8000-000000000101', '00000000-0000-4000-8000-000000000901', '00000000-0000-4000-8000-000000000401', '8A', 'Mathematics', 'Class Test', 'Algebra Test', 42, 50, true),
  ('00000000-0000-4000-8000-000000001002', '00000000-0000-4000-8000-000000000101', '00000000-0000-4000-8000-000000000902', '00000000-0000-4000-8000-000000000401', '8A', 'Science', 'Exam', 'Mid Term', 78, 100, true),
  ('00000000-0000-4000-8000-000000001003', '00000000-0000-4000-8000-000000000101', '00000000-0000-4000-8000-000000000901', '00000000-0000-4000-8000-000000000402', '8A', 'Mathematics', 'Class Test', 'Algebra Test', 39, 50, true)
on conflict (id) do nothing;

insert into attendance (id, school_id, student_id, class_name, attendance_date, status, note)
values
  ('00000000-0000-4000-8000-000000001101', '00000000-0000-4000-8000-000000000101', '00000000-0000-4000-8000-000000000401', '8A', '2026-05-15', 'Present', ''),
  ('00000000-0000-4000-8000-000000001102', '00000000-0000-4000-8000-000000000101', '00000000-0000-4000-8000-000000000402', '8A', '2026-05-15', 'Absent', 'Medical leave'),
  ('00000000-0000-4000-8000-000000001103', '00000000-0000-4000-8000-000000000101', '00000000-0000-4000-8000-000000000403', '10A', '2026-05-15', 'Present', '')
on conflict (id) do nothing;

insert into homework (id, school_id, teacher_id, class_name, subject, title, due_date, details)
values
  ('00000000-0000-4000-8000-000000001201', '00000000-0000-4000-8000-000000000101', '00000000-0000-4000-8000-000000000201', '8A', 'Mathematics', 'Linear Equations Practice', '2026-05-18', 'Complete questions 1 to 20 from exercise 2.3.')
on conflict (id) do nothing;

insert into fees (id, school_id, student_id, term, amount, paid, due_date, status)
values
  ('00000000-0000-4000-8000-000000001301', '00000000-0000-4000-8000-000000000101', '00000000-0000-4000-8000-000000000401', 'Quarter 1', 18000, 12000, '2026-05-30', 'Partially Paid'),
  ('00000000-0000-4000-8000-000000001302', '00000000-0000-4000-8000-000000000101', '00000000-0000-4000-8000-000000000402', 'Quarter 1', 18000, 18000, '2026-05-30', 'Paid'),
  ('00000000-0000-4000-8000-000000001303', '00000000-0000-4000-8000-000000000101', '00000000-0000-4000-8000-000000000403', 'Quarter 1', 22000, 0, '2026-05-30', 'Due')
on conflict (id) do nothing;

insert into timetable (id, school_id, class_name, day, period, subject, teacher_id, time)
values
  ('00000000-0000-4000-8000-000000001401', '00000000-0000-4000-8000-000000000101', '8A', 'Monday', '1', 'Mathematics', '00000000-0000-4000-8000-000000000201', '08:30 - 09:15'),
  ('00000000-0000-4000-8000-000000001402', '00000000-0000-4000-8000-000000000101', '8A', 'Monday', '2', 'Science', '00000000-0000-4000-8000-000000000202', '09:15 - 10:00'),
  ('00000000-0000-4000-8000-000000001403', '00000000-0000-4000-8000-000000000101', '10A', 'Tuesday', '1', 'Science', '00000000-0000-4000-8000-000000000202', '08:30 - 09:15')
on conflict (id) do nothing;

insert into question_papers (id, school_id, teacher_id, class_name, subject, title, duration, max_marks, questions)
values
  ('00000000-0000-4000-8000-000000001501', '00000000-0000-4000-8000-000000000101', '00000000-0000-4000-8000-000000000201', '8A', 'Mathematics', 'Algebra Practice Paper', '60 minutes', '50', 'Section A
1. Solve five linear equations.
2. Factorise the given expressions.

Section B
3. Attempt the word problems.')
on conflict (id) do nothing;

insert into audit_logs (id, school_id, actor, action, log_date)
values
  ('00000000-0000-4000-8000-000000001601', '00000000-0000-4000-8000-000000000101', 'School Admin', 'Initialized academic session 2026-2027', '2026-05-15')
on conflict (id) do nothing;
