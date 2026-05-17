const DEFAULT_STATE = {
  school: {
    name: "iGuider School",
    code: "",
    session: "",
    board: "",
    city: "",
    website: {
      heroEyebrow: "Premium school operations platform",
      heroTitle: "iGuider School Management System",
      heroCopy: "Run admissions, teachers, classes, subjects, attendance, exams, fees, notices, question papers, homework, and parent progress tracking from one elegant school portal.",
      heroButton: "School Login",
      heroImage: "https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?auto=format&fit=crop&w=1800&q=88"
    }
  },
  users: [],
  classes: [],
  subjects: [],
  teachers: [],
  students: [],
  parents: [],
  notices: [],
  exams: [],
  marks: [],
  attendance: [],
  homework: [],
  fees: [],
  timetable: [],
  papers: [],
  auditLogs: [],
  schools: []
};

/* ═══════════════════════════════════════════════════════
   Supabase Data Layer
   ═══════════════════════════════════════════════════════ */
const sbConfig = window.IGUIDER_SUPABASE || {};
const sb = sbConfig.url && sbConfig.anonKey && window.supabase
  ? window.supabase.createClient(sbConfig.url, sbConfig.anonKey)
  : null;

if (sb) console.log("Supabase connected:", sbConfig.url);
else console.warn("Supabase is not configured. Deployed data operations require SUPABASE_URL and SUPABASE_ANON_KEY.");

// Snake ↔ Camel case converters
const toSnake = (s) => s.replace(/([A-Z])/g, "_$1").toLowerCase();
const toCamel = (s) => s.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
const objToSnake = (o) => Object.fromEntries(Object.entries(o).map(([k, v]) => [toSnake(k), v]));
const objToCamel = (o) => Object.fromEntries(Object.entries(o).map(([k, v]) => [toCamel(k), v]));
const rowsToCamel = (rows) => (rows || []).map(objToCamel);

// Column overrides for specific table fields that don't follow simple conversion
const COL_MAP = {
  max: "max_marks", maxMarks: "max_marks",
  date: "notice_date", dueDate: "due_date",
  examDate: "exam_date", logDate: "log_date",
  attendanceDate: "attendance_date",
  passwordHash: "password_hash"
};

// Table name mapping (JS state key → Supabase table)
const TABLE_MAP = {
  schools: "platform_schools",
  school: "school_profiles",
  users: "app_users",
  teachers: "teachers",
  students: "students",
  parents: "parents",
  classes: "classes",
  subjects: "subjects",
  notices: "notices",
  exams: "exams",
  marks: "marks",
  attendance: "attendance",
  homework: "homework",
  fees: "fees",
  timetable: "timetable",
  papers: "question_papers",
  auditLogs: "audit_logs"
};

function requireSupabase() {
  if (sb) return true;
  alert("Supabase is not configured. Please set SUPABASE_URL and SUPABASE_ANON_KEY in Vercel.");
  return false;
}

// CRUD helpers. Supabase is the deployed source of truth.
async function dbSelect(table) {
  if (!sb) return null;
  try {
    const { data, error } = await sb.from(table).select("*");
    if (error) { console.error(`dbSelect ${table}:`, error.message); return null; }
    return rowsToCamel(data);
  } catch (e) { console.error(`dbSelect ${table}:`, e); return null; }
}

async function dbInsert(table, row) {
  if (!sb) return null;
  try {
    // Map JS keys to snake_case, but handle special column names
    const mapped = {};
    for (const [k, v] of Object.entries(row)) {
      if (k === "id" && typeof v === "string" && !v.includes("-")) continue; // skip non-uuid IDs
      const col = COL_MAP[k] || toSnake(k);
      mapped[col] = v;
    }
    const { data, error } = await sb.from(table).insert(mapped).select();
    if (error) { console.error(`dbInsert ${table}:`, error.message); return null; }
    return data?.[0] ? objToCamel(data[0]) : null;
  } catch (e) { console.error(`dbInsert ${table}:`, e); return null; }
}

async function dbUpdate(table, id, updates) {
  if (!sb || !id) return null;
  try {
    const mapped = {};
    for (const [k, v] of Object.entries(updates)) {
      const col = COL_MAP[k] || toSnake(k);
      mapped[col] = v;
    }
    const { error } = await sb.from(table).update(mapped).eq("id", id);
    if (error) console.error(`dbUpdate ${table}:`, error.message);
  } catch (e) { console.error(`dbUpdate ${table}:`, e); }
}

async function dbDelete(table, id) {
  if (!sb || !id) return;
  try {
    const { error } = await sb.from(table).delete().eq("id", id);
    if (error) console.error(`dbDelete ${table}:`, error.message);
  } catch (e) { console.error(`dbDelete ${table}:`, e); }
}

// Fetch all data from Supabase and merge into state
async function syncFromSupabase() {
  if (!sb) return;
  console.log("Syncing from Supabase...");
  try {
    const [schools, profiles, users, teachers, students, parents,
           classes, subjects, notices, exams, marks, attendance,
           homework, fees, timetable, papers, logs] = await Promise.all([
      dbSelect("platform_schools"),
      dbSelect("school_profiles"),
      dbSelect("app_users"),
      dbSelect("teachers"),
      dbSelect("students"),
      dbSelect("parents"),
      dbSelect("classes"),
      dbSelect("subjects"),
      dbSelect("notices"),
      dbSelect("exams"),
      dbSelect("marks"),
      dbSelect("attendance"),
      dbSelect("homework"),
      dbSelect("fees"),
      dbSelect("timetable"),
      dbSelect("question_papers"),
      dbSelect("audit_logs")
    ]);

    const activeSchoolId = session?.role === "platform" ? null : session?.schoolId || null;
    const bySchool = (rows) => activeSchoolId ? (rows || []).filter((row) => row.schoolId === activeSchoolId) : (rows || []);

    state.schools = schools || [];
    if (profiles?.length) {
      const p = activeSchoolId
        ? profiles.find((profile) => profile.id === activeSchoolId) || profiles[0]
        : profiles[0];
      state.school = { ...state.school, name: p.name, code: p.code, session: p.session, board: p.board, city: p.city, dbId: p.id, platformSchoolId: p.platformSchoolId };
    }
    state.users = (users || [])
      .filter((u) => session?.role === "platform" || !activeSchoolId || u.schoolId === activeSchoolId || u.role === "platform")
      .map((u) => ({
        role: u.role, username: u.username, password: u.passwordHash || u.password || "",
        name: u.name, teacherId: u.teacherId, parentId: u.parentId, dbId: u.id, schoolId: u.schoolId
      }));
    state.teachers = bySchool(teachers).map((t) => ({
      id: t.id, name: t.name, username: t.username, email: t.email, phone: t.phone,
      subjects: t.subjects || [], classes: t.classes || [], classTeacherOf: t.classTeacherOf,
      status: t.status || "Active", password: ""
    }));
    state.students = bySchool(students).map((s) => ({
      id: s.id, admissionNo: s.admissionNo, name: s.name, className: s.className,
      rollNo: s.rollNo, parentId: s.parentId, dob: s.dob, status: s.status || "Active"
    }));
    state.parents = bySchool(parents).map((p) => ({
      id: p.id, name: p.name, username: p.username, phone: p.phone, email: p.email, password: ""
    }));
    state.classes = bySchool(classes).map((c) => ({
      id: c.id, name: c.name, grade: c.grade, section: c.section, room: c.room, classTeacherId: c.classTeacherId
    }));
    state.subjects = bySchool(subjects).map((s) => ({ id: s.id, name: s.name, code: s.code }));
    state.notices = bySchool(notices).map((n) => ({
      id: n.id, title: n.title, audience: n.audience, priority: n.priority, message: n.message, date: n.noticeDate
    }));
    state.exams = bySchool(exams).map((e) => ({
      id: e.id, name: e.name, type: e.type, className: e.className, max: e.maxMarks, date: e.examDate, status: e.status
    }));
    state.marks = bySchool(marks).map((m) => ({
      id: m.id, examId: m.examId, studentId: m.studentId, className: m.className,
      subject: m.subject, type: m.type, title: m.title, score: m.score, max: m.maxMarks, published: m.published
    }));
    state.attendance = bySchool(attendance).map((a) => ({
      id: a.id, studentId: a.studentId, className: a.className, date: a.attendanceDate, status: a.status, note: a.note
    }));
    state.homework = bySchool(homework).map((h) => ({
      id: h.id, teacherId: h.teacherId, className: h.className, subject: h.subject,
      title: h.title, dueDate: h.dueDate, details: h.details
    }));
    state.fees = bySchool(fees).map((f) => ({
      id: f.id, studentId: f.studentId, term: f.term, amount: f.amount, paid: f.paid, dueDate: f.dueDate, status: f.status
    }));
    state.timetable = bySchool(timetable).map((t) => ({
      id: t.id, className: t.className, day: t.day, period: t.period, subject: t.subject, teacherId: t.teacherId, time: t.time
    }));
    state.papers = bySchool(papers).map((p) => ({
      id: p.id, teacherId: p.teacherId, className: p.className, subject: p.subject,
      title: p.title, duration: p.duration, max: p.maxMarks, questions: p.questions
    }));
    state.auditLogs = bySchool(logs).map((l) => ({ id: l.id, actor: l.actor, action: l.action, date: l.logDate }));

    console.log("Supabase sync complete");
    if (session) renderDashboard();
    refreshHeroMetrics();
    updatePublicWebsite();
  } catch (e) {
    console.error("Supabase sync failed:", e);
  }
}

// Get the school's DB ID for foreign key inserts
function getSchoolDbId() {
  return state.school?.dbId || null;
}

let state = loadState();
let session = null;
let activeTab = "overview";
let activeTheme = "default";

const el = (selector) => document.querySelector(selector);
const id = (prefix = "id") => `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
const isPlatformAdminRoute = () => window.location.pathname.replace(/\/+$/, "").endsWith("/admin") || window.location.hash === "#admin";

function showPublicPage() {
  el("#publicPage").hidden = false;
  el("#authPage").hidden = true;
  el("#getStartedPage").hidden = true;
  el("#appPage").hidden = true;
  document.querySelector("[data-public]").hidden = false;
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function showAuthPage() {
  el("#publicPage").hidden = true;
  el("#authPage").hidden = false;
  el("#getStartedPage").hidden = true;
  el("#appPage").hidden = true;
  document.querySelector("[data-public]").hidden = true;

  const isAdmin = isPlatformAdminRoute();
  const roleSelect = el("#roleSelect");
  const title = el("#authTitle");
  const copy = el("#authCopy");
  const back = el("#authBackBtn");
  const signup = el("#authSignupLink");

  if (isAdmin) {
    roleSelect.innerHTML = '<option value="platform">Platform Administration</option>';
    roleSelect.value = "platform";
    title.textContent = "Platform Administration";
    copy.textContent = "Sign in to manage school activation, deactivation, and platform records.";
    back.hidden = true;
    signup.hidden = true;
  } else {
    roleSelect.innerHTML = [
      '<option value="admin">School Admin</option>',
      '<option value="teacher">Teacher</option>',
      '<option value="parent">Parent</option>'
    ].join("");
    title.textContent = "Login to iGuider";
    copy.textContent = "Choose a role and enter the credentials issued by the school.";
    back.hidden = false;
    signup.hidden = false;
  }
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function showGetStartedPage() {
  el("#publicPage").hidden = true;
  el("#authPage").hidden = true;
  el("#getStartedPage").hidden = false;
  el("#appPage").hidden = true;
  document.querySelector("[data-public]").hidden = true;
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function showAppPage() {
  el("#publicPage").hidden = true;
  el("#authPage").hidden = true;
  el("#getStartedPage").hidden = true;
  el("#appPage").hidden = false;
  document.querySelector("[data-public]").hidden = true;
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function applyTheme(theme) {
  activeTheme = theme || "default";
  document.body.dataset.theme = activeTheme;
  document.documentElement.dataset.theme = activeTheme;
  const selector = el("#themeSelect");
  if (selector) selector.value = activeTheme;
}

function loadState() {
  return structuredClone(DEFAULT_STATE);
}

function normalizeState(data) {
  const school = {
    ...DEFAULT_STATE.school,
    ...(data.school || {}),
    website: {
      ...DEFAULT_STATE.school.website,
      ...((data.school || {}).website || {})
    }
  };
  return {
    ...structuredClone(DEFAULT_STATE),
    ...data,
    school,
    users: data.users || DEFAULT_STATE.users,
    teachers: data.teachers || DEFAULT_STATE.teachers,
    students: data.students || DEFAULT_STATE.students,
    parents: data.parents || DEFAULT_STATE.parents,
    classes: data.classes || DEFAULT_STATE.classes,
    subjects: data.subjects || DEFAULT_STATE.subjects,
    notices: data.notices || DEFAULT_STATE.notices,
    exams: data.exams || DEFAULT_STATE.exams,
    marks: data.marks || DEFAULT_STATE.marks,
    attendance: data.attendance || DEFAULT_STATE.attendance,
    homework: data.homework || DEFAULT_STATE.homework,
    fees: data.fees || DEFAULT_STATE.fees,
    timetable: data.timetable || DEFAULT_STATE.timetable,
    papers: data.papers || DEFAULT_STATE.papers,
    auditLogs: data.auditLogs || DEFAULT_STATE.auditLogs,
    schools: data.schools || DEFAULT_STATE.schools
  };
}

function saveState(action = "") {
  if (action) {
    const logEntry = { id: id("log"), actor: session?.name || "System", action, date: today() };
    state.auditLogs.unshift(logEntry);
    dbInsert("audit_logs", { school_id: getSchoolDbId(), actor: logEntry.actor, action, log_date: today() });
  }
  refreshHeroMetrics();
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function refreshHeroMetrics() {
  el("#heroTeacherCount").textContent = state.teachers.length;
  el("#heroStudentCount").textContent = state.students.length;
  el("#heroExamCount").textContent = state.marks.length + state.attendance.length + state.fees.length;
}

function updatePublicWebsite() {
  const website = state.school.website || DEFAULT_STATE.school.website;
  el("#publicHeroEyebrow").textContent = website.heroEyebrow;
  el("#publicHeroTitle").textContent = website.heroTitle;
  el("#publicHeroCopy").textContent = website.heroCopy;
  el("#publicHeroButton").textContent = website.heroButton;
  document.documentElement.style.setProperty("--hero-image", `url("${website.heroImage}")`);
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  })[char]);
}

function money(value) {
  return `₹${Number(value || 0).toLocaleString("en-IN")}`;
}

function currentTeacher() {
  return state.teachers.find((teacher) => teacher.id === session?.teacherId);
}

function getTeacherName(teacherId) {
  return state.teachers.find((teacher) => teacher.id === teacherId)?.name || "Unassigned";
}

function sessionProfile() {
  if (!session) return { title: "iGuider", meta: "School Management System", initials: "iG" };
  if (session.role === "platform") {
    const activeSchools = state.schools.filter((school) => school.status === "Active").length;
    return {
      title: "iGuider Administration",
      meta: `${state.schools.length} schools registered | ${activeSchools} active | Platform management console`,
      initials: "PA"
    };
  }
  if (session.role === "admin") {
    return {
      title: state.school.name,
      meta: `${state.school.board} | ${state.school.city} | Session ${state.school.session} | Code ${state.school.code}`,
      initials: "SC"
    };
  }
  if (session.role === "teacher") {
    const teacher = currentTeacher();
    return {
      title: teacher?.name || session.name,
      meta: `${teacher?.subjects?.join(", ") || "Teacher"} | Classes ${teacher?.classes?.join(", ") || "NA"} | Class Teacher: ${teacher?.classTeacherOf || "No"}`,
      initials: initials(teacher?.name || session.name)
    };
  }
  const parent = state.parents.find((item) => item.id === session.parentId);
  const children = state.students.filter((student) => student.parentId === session.parentId).map((student) => student.name).join(", ");
  return {
    title: parent?.name || session.name,
    meta: `Parent Portal | Students: ${children || "Not linked"} | ${parent?.phone || "No phone"}`,
    initials: initials(parent?.name || session.name)
  };
}

function initials(name) {
  return String(name || "iG").split(" ").filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase();
}

function updateHeader() {
  const profile = sessionProfile();
  el("#activeRole").textContent = session?.role === "platform" ? "Platform Administration" : session?.role === "admin" ? "School Login" : session?.role === "teacher" ? "Teacher Login" : "Parent Login";
  el("#dashboardTitle").textContent = profile.title;
  el("#headerIdentity").innerHTML = `
    <span class="identity-avatar">${escapeHtml(profile.initials)}</span>
    <div>
      <p class="eyebrow" id="activeRole">${session?.role === "platform" ? "Platform Administration" : session?.role === "admin" ? "School Admin" : session?.role === "teacher" ? "Teacher Portal" : "Parent Portal"}</p>
      <h2 id="dashboardTitle">${escapeHtml(profile.title)}</h2>
      <p class="identity-meta">${escapeHtml(profile.meta)}</p>
    </div>
  `;
  const headerActions = document.querySelector(".header-actions");
  if (headerActions) {
    const themeSelect = el("#themeSelect");
    if (themeSelect) themeSelect.value = activeTheme;
  }
  const schoolChip = document.querySelector(".school-chip");
  if (schoolChip) {
    schoolChip.innerHTML = `
      <strong>${escapeHtml(state.school.name)}</strong>
      <span>${escapeHtml(state.school.board)} | ${escapeHtml(state.school.session)}</span>
    `;
  }
}

function statCards(items) {
  return `<div class="stat-grid">${items.map((item) => `
    <article class="stat-card">
      <span class="stat-number">${escapeHtml(item.value)}</span>
      <span class="stat-label">${escapeHtml(item.label)}</span>
    </article>
  `).join("")}</div>`;
}

function navIcon(key) {
  const icons = {
    overview: "dashboard",
    setup: "settings",
    schools: "building",
    requests: "inbox",
    teachers: "users",
    students: "user",
    exams: "file",
    attendance: "check",
    fees: "dollar",
    timetable: "clock",
    notices: "bell",
    reports: "chart",
    marks: "percent",
    homework: "edit",
    papers: "file",
    parents: "users"
  };
  const iconId = icons[key] || "dashboard";
  return `<svg width="16" height="16"><use href="#icon-${iconId}"/></svg>`;
}

function tabs(items) {
  const nav = el("#portalNav");
  if (nav) {
    nav.innerHTML = items.map((item) => `
      <button class="portal-nav-btn ${activeTab === item.key ? "active" : ""}" data-tab="${item.key}" type="button">
        <span class="portal-nav-icon">${navIcon(item.key)}</span>
        <span>${escapeHtml(item.label)}</span>
      </button>
    `).join("");
  }
  return "";
}

function listRows(items, emptyText) {
  if (!items.length) return `<p class="empty-state">${escapeHtml(emptyText)}</p>`;
  return `<div class="list">${items.join("")}</div>`;
}

function setDashboard(roleLabel, title, html) {
  el("#dashboardContent").innerHTML = html;
  el("#sidebarRole").textContent = roleLabel;
  updateHeader();
  showAppPage();
  el("#dashboard").hidden = false;
}

function renderDashboard() {
  if (!session) return;
  if (session.role === "platform") renderPlatformAdmin();
  if (session.role === "admin") renderAdmin();
  if (session.role === "teacher") renderTeacher();
  if (session.role === "parent") renderParent();
}

function renderPlatformAdmin() {
  const tabItems = [
    { key: "overview", label: "Overview" },
    { key: "schools", label: "Schools" },
    { key: "requests", label: "Signup Requests" }
  ];
  const activeSchools = state.schools.filter((school) => school.status === "Active");
  const inactiveSchools = state.schools.filter((school) => school.status === "Inactive");
  const pendingSchools = state.schools.filter((school) => school.status === "Pending");
  const panels = {
    overview: `
      ${statCards([
        { value: state.schools.length, label: "Registered Schools" },
        { value: activeSchools.length, label: "Active Schools" },
        { value: inactiveSchools.length, label: "Inactive Schools" },
        { value: pendingSchools.length, label: "Signup Requests" }
      ])}
      <div class="panel-grid two">
        <div class="data-panel">
          <h3>Active Schools</h3>
          ${platformSchoolList(activeSchools)}
        </div>
        <div class="data-panel">
          <h3>Pending Requests</h3>
          ${platformSchoolList(pendingSchools)}
        </div>
      </div>
    `,
    schools: `
      <div class="data-panel">
        <div class="panel-title-row">
          <div>
            <h3>School Management</h3>
            <p class="mini-text">Activate, deactivate, and monitor schools using the iGuider platform.</p>
          </div>
        </div>
        <form class="form-grid compact-form" data-action="add-platform-school">
          <label>School Name<input name="name" required></label>
          <label>School Code<input name="code" required></label>
          <label>Session<input name="session" placeholder="2026-2027" required></label>
          <label>Board<input name="board" placeholder="CBSE"></label>
          <label>City<input name="city"></label>
          <label>Contact Name<input name="contactName" required></label>
          <label>Email<input name="email" type="email"></label>
          <label>Mobile<input name="mobile"></label>
          <label>Admin Username<input name="adminUsername" required></label>
          <label>Admin Password<input name="adminPassword" required></label>
          <label>Plan
            <select name="plan">
              <option>Trial</option>
              <option>Premium</option>
              <option>Enterprise</option>
            </select>
          </label>
          <label>Status
            <select name="status">
              <option>Pending</option>
              <option>Active</option>
              <option>Inactive</option>
            </select>
          </label>
          <button class="primary-btn" type="submit">Add School</button>
        </form>
        ${platformSchoolList(state.schools, true)}
      </div>
    `,
    requests: `
      <div class="data-panel">
        <div class="panel-title-row">
          <div>
            <h3>Signup Requests</h3>
            <p class="mini-text">New school signups submitted from the public authentication page.</p>
          </div>
        </div>
        ${platformSchoolList(pendingSchools, true)}
      </div>
    `
  };
  setDashboard("Platform Administration", "iGuider Administration", `${tabs(tabItems)}${panels[activeTab] || panels.overview}`);
}

function renderAdmin() {
  const tabItems = [
    { key: "overview", label: "Overview" },
    { key: "setup", label: "Academic Setup" },
    { key: "teachers", label: "Teachers" },
    { key: "students", label: "Students" },
    { key: "exams", label: "Exams" },
    { key: "attendance", label: "Attendance" },
    { key: "fees", label: "Fees" },
    { key: "timetable", label: "Timetable" },
    { key: "notices", label: "Notices" },
    { key: "reports", label: "Reports" }
  ];

  const feeDue = state.fees.reduce((sum, fee) => sum + Math.max(Number(fee.amount) - Number(fee.paid), 0), 0);
  const todayAttendance = state.attendance.filter((item) => item.date === today());
  const presentCount = todayAttendance.filter((item) => item.status === "Present").length;
  const attendanceRate = todayAttendance.length ? Math.round((presentCount / todayAttendance.length) * 100) : 0;

  const panels = {
    overview: `
      ${statCards([
        { value: state.teachers.length, label: "Teachers" },
        { value: state.students.length, label: "Students" },
        { value: state.parents.length, label: "Parents" },
        { value: `${attendanceRate}%`, label: "Today Attendance" },
        { value: state.exams.length, label: "Exam Plans" },
        { value: money(feeDue), label: "Fee Outstanding" },
        { value: state.homework.length, label: "Homework" },
        { value: state.notices.length, label: "Notices" }
      ])}
      <div class="panel-grid two">
        <div class="data-panel">
          <h3>School Profile</h3>
          <p class="mini-text"><strong>${escapeHtml(state.school.name)}</strong></p>
          <p class="mini-text">Session ${escapeHtml(state.school.session)} | ${escapeHtml(state.school.board)} | ${escapeHtml(state.school.city)}</p>
        </div>
        <div class="data-panel">
          <h3>Recent Activity</h3>
          ${auditList(state.auditLogs.slice(0, 5))}
        </div>
      </div>
    `,
    setup: `
      ${statCards([
        { value: state.classes.length, label: "Total Classes" },
        { value: new Set(state.classes.map((item) => item.grade)).size, label: "Class Levels" },
        { value: new Set(state.classes.map((item) => item.section)).size, label: "Sections Used" },
        { value: state.subjects.length, label: "Subjects" }
      ])}
      <div class="panel-grid two">
        <div class="data-panel">
          <div class="panel-title-row">
            <div>
              <h3>Manage Classes & Sections</h3>
              <p class="mini-text">Add every class and section running in the school, then assign room and class teacher.</p>
            </div>
          </div>
          <form class="form-grid compact-grid" data-action="add-class">
            <label>Class<input name="grade" placeholder="8" required></label>
            <label>Section<input name="section" placeholder="B" required></label>
            <label>Class + Section<input name="name" placeholder="8B" required></label>
            <label>Room<input name="room" placeholder="205"></label>
            <label>Class Teacher<select name="classTeacherId">${teacherOptions(state.teachers, true)}</select></label>
            <button class="primary-btn" type="submit">Add Class</button>
          </form>
          <h3>School Class Structure</h3>
          ${classList(state.classes)}
        </div>
        <div class="data-panel">
          <div class="panel-title-row">
            <div>
              <h3>Manage Subjects</h3>
              <p class="mini-text">Create the subject master used by teachers, exams, marks, homework, and timetable.</p>
            </div>
          </div>
          <form class="form-grid compact-grid" data-action="add-subject">
            <label>Subject Name<input name="name" placeholder="Computer Science" required></label>
            <label>Code<input name="code" placeholder="CS" required></label>
            <button class="primary-btn" type="submit">Add Subject</button>
          </form>
          <h3>Subjects</h3>
          ${subjectList(state.subjects)}
        </div>
      </div>
    `,
    teachers: `
      <div class="data-panel">
        <h3>Add Teacher & Login</h3>
        <form class="form-grid" data-action="add-teacher">
          <label>Name<input name="name" required></label>
          <label>Username<input name="username" required></label>
          <label>Password<input name="password" required></label>
          <label>Email<input name="email" type="email"></label>
          <label>Phone<input name="phone"></label>
          <label>Subjects<input name="subjects" placeholder="Mathematics, Science" required></label>
          <label>Classes<input name="classes" placeholder="8A, 9A" required></label>
          <label>Class Teacher Of<input name="classTeacherOf" placeholder="8A or blank"></label>
          <button class="primary-btn" type="submit">Add Teacher</button>
        </form>
        <h3>Teacher Directory</h3>
        ${teacherList(state.teachers, true)}
      </div>
    `,
    students: `
      <div class="data-panel">
        <h3>Add Student</h3>
        <form class="form-grid" data-action="add-student-admin">
          <label>Admission No<input name="admissionNo" required></label>
          <label>Name<input name="name" required></label>
          <label>Class<select name="className">${classOptions(state.classes)}</select></label>
          <label>Roll No<input name="rollNo" required></label>
          <label>Date of Birth<input name="dob" type="date"></label>
          <label>Parent<select name="parentId">${parentOptions(state.parents)}</select></label>
          <button class="primary-btn" type="submit">Add Student</button>
        </form>
        <h3>Student Register</h3>
        ${studentList(state.students)}
      </div>
    `,
    exams: `
      <div class="data-panel">
        <h3>Create Exam / Class Test</h3>
        <form class="form-grid" data-action="add-exam">
          <label>Name<input name="name" placeholder="Unit Test 2" required></label>
          <label>Type<select name="type"><option>Class Test</option><option>Exam</option><option>Practical</option></select></label>
          <label>Class<select name="className">${classOptions(state.classes)}</select></label>
          <label>Maximum Marks<input name="max" type="number" min="1" value="50" required></label>
          <label>Date<input name="date" type="date" required></label>
          <label>Status<select name="status"><option>Scheduled</option><option>Completed</option><option>Published</option></select></label>
          <button class="primary-btn" type="submit">Create Exam</button>
        </form>
        <h3>Exam Planner</h3>
        ${examList(state.exams)}
      </div>
    `,
    attendance: `
      <div class="data-panel">
        <h3>Record Attendance</h3>
        <form class="form-grid" data-action="add-attendance">
          <label>Student<select name="studentId">${studentOptions(state.students)}</select></label>
          <label>Date<input name="date" type="date" value="${today()}" required></label>
          <label>Status<select name="status"><option>Present</option><option>Absent</option><option>Late</option><option>Leave</option></select></label>
          <label class="wide">Note<input name="note" placeholder="Optional"></label>
          <button class="primary-btn" type="submit">Save Attendance</button>
        </form>
        <h3>Attendance Register</h3>
        ${attendanceList(state.attendance)}
      </div>
    `,
    fees: `
      <div class="data-panel">
        <h3>Create Fee Record</h3>
        <form class="form-grid" data-action="add-fee">
          <label>Student<select name="studentId">${studentOptions(state.students)}</select></label>
          <label>Term<input name="term" placeholder="Quarter 2" required></label>
          <label>Amount<input name="amount" type="number" min="0" required></label>
          <label>Paid<input name="paid" type="number" min="0" value="0" required></label>
          <label>Due Date<input name="dueDate" type="date" required></label>
          <button class="primary-btn" type="submit">Save Fee</button>
        </form>
        <h3>Fee Ledger</h3>
        ${feeList(state.fees)}
      </div>
    `,
    timetable: `
      <div class="data-panel">
        <h3>Add Timetable Entry</h3>
        <form class="form-grid" data-action="add-timetable">
          <label>Class<select name="className">${classOptions(state.classes)}</select></label>
          <label>Day<select name="day">${["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"].map((day) => `<option>${day}</option>`).join("")}</select></label>
          <label>Period<input name="period" required></label>
          <label>Time<input name="time" placeholder="08:30 - 09:15" required></label>
          <label>Subject<select name="subject">${subjectOptions(state.subjects)}</select></label>
          <label>Teacher<select name="teacherId">${teacherOptions(state.teachers)}</select></label>
          <button class="primary-btn" type="submit">Add Period</button>
        </form>
        <h3>Timetable</h3>
        ${timetableList(state.timetable)}
      </div>
    `,
    notices: `
      <div class="data-panel">
        <h3>Create Notice</h3>
        <form class="form-grid" data-action="add-notice">
          <label>Title<input name="title" required></label>
          <label>Audience<input name="audience" placeholder="All / Class 8A" required></label>
          <label>Priority<select name="priority"><option>Normal</option><option>High</option><option>Urgent</option></select></label>
          <label class="wide">Message<textarea name="message" required></textarea></label>
          <button class="primary-btn" type="submit">Publish Notice</button>
        </form>
        <h3>Published Notices</h3>
        ${noticeList(state.notices)}
      </div>
    `,
    reports: `
      <div class="panel-grid two">
        <div class="data-panel">
          <h3>Performance Summary</h3>
          ${reportCards(state.students)}
        </div>
        <div class="data-panel">
          <h3>Operational Summary</h3>
          ${feeSummary()}
          ${attendanceSummary()}
        </div>
      </div>
    `
  };

  setDashboard("School Admin", "School Control Center", `${tabs(tabItems)}${panels[activeTab] || panels.overview}`);
}

function renderTeacher() {
  const teacher = currentTeacher();
  const assignedStudents = state.students.filter((student) => teacher.classes.includes(student.className));
  const ownPapers = state.papers.filter((paper) => paper.teacherId === teacher.id);
  const ownHomework = state.homework.filter((item) => item.teacherId === teacher.id);
  const ownTimetable = state.timetable.filter((item) => item.teacherId === teacher.id);
  const tabItems = [
    { key: "overview", label: "Overview" },
    { key: "marks", label: "Marks" },
    { key: "attendance", label: "Attendance" },
    { key: "homework", label: "Homework" },
    { key: "papers", label: "Question Papers" },
    { key: "students", label: "Class Teacher" },
    { key: "parents", label: "Parents" },
    { key: "timetable", label: "Timetable" }
  ];

  const panels = {
    overview: `
      ${statCards([
        { value: teacher.subjects.length, label: "Subjects" },
        { value: teacher.classes.length, label: "Assigned Classes" },
        { value: assignedStudents.length, label: "Visible Students" },
        { value: ownPapers.length, label: "Question Papers" },
        { value: ownHomework.length, label: "Homework" },
        { value: ownTimetable.length, label: "Timetable Periods" }
      ])}
      <div class="panel-grid two">
        <div class="data-panel">
          <h3>My Assignment</h3>
          <p class="mini-text">Subjects: ${escapeHtml(teacher.subjects.join(", "))}</p>
          <p class="mini-text">Classes: ${escapeHtml(teacher.classes.join(", "))}</p>
          <p class="mini-text">Class Teacher: ${escapeHtml(teacher.classTeacherOf || "Not assigned")}</p>
        </div>
        <div class="data-panel">
          <h3>Latest Notices</h3>
          ${noticeList(state.notices.slice(0, 3))}
        </div>
      </div>
    `,
    marks: `
      <div class="data-panel">
        <h3>Add Class Test or Exam Marks</h3>
        <form class="form-grid" data-action="add-marks">
          <label>Student<select name="studentId" required>${studentOptions(assignedStudents)}</select></label>
          <label>Exam<select name="examId">${examOptions(state.exams)}</select></label>
          <label>Subject<select name="subject" required>${teacher.subjects.map((subject) => `<option>${escapeHtml(subject)}</option>`).join("")}</select></label>
          <label>Type<select name="type"><option>Class Test</option><option>Exam</option><option>Practical</option></select></label>
          <label>Title<input name="title" placeholder="Unit Test 1" required></label>
          <label>Score<input name="score" type="number" min="0" required></label>
          <label>Maximum<input name="max" type="number" min="1" required value="50"></label>
          <label>Publish<select name="published"><option value="true">Published</option><option value="false">Draft</option></select></label>
          <button class="primary-btn" type="submit">Save Marks</button>
        </form>
        <h3>Recent Marks</h3>
        ${marksList(state.marks.filter((mark) => teacher.subjects.includes(mark.subject)))}
      </div>
    `,
    attendance: `
      <div class="data-panel">
        <h3>Record Attendance</h3>
        <form class="form-grid" data-action="add-attendance">
          <label>Student<select name="studentId">${studentOptions(assignedStudents)}</select></label>
          <label>Date<input name="date" type="date" value="${today()}" required></label>
          <label>Status<select name="status"><option>Present</option><option>Absent</option><option>Late</option><option>Leave</option></select></label>
          <label class="wide">Note<input name="note" placeholder="Optional"></label>
          <button class="primary-btn" type="submit">Save Attendance</button>
        </form>
        <h3>Attendance Records</h3>
        ${attendanceList(state.attendance.filter((item) => teacher.classes.includes(item.className)))}
      </div>
    `,
    homework: `
      <div class="data-panel">
        <h3>Assign Homework</h3>
        <form class="form-grid" data-action="add-homework">
          <label>Title<input name="title" required></label>
          <label>Class<select name="className">${teacher.classes.map((className) => `<option>${escapeHtml(className)}</option>`).join("")}</select></label>
          <label>Subject<select name="subject">${teacher.subjects.map((subject) => `<option>${escapeHtml(subject)}</option>`).join("")}</select></label>
          <label>Due Date<input name="dueDate" type="date" required></label>
          <label class="wide">Details<textarea name="details" required></textarea></label>
          <button class="primary-btn" type="submit">Assign Homework</button>
        </form>
        <h3>Homework Given</h3>
        ${homeworkList(ownHomework)}
      </div>
    `,
    papers: `
      <div class="data-panel">
        <h3>Create Question Paper</h3>
        <form class="form-grid" data-action="add-paper">
          <label>Title<input name="title" required></label>
          <label>Class<select name="className" required>${teacher.classes.map((className) => `<option>${escapeHtml(className)}</option>`).join("")}</select></label>
          <label>Subject<select name="subject" required>${teacher.subjects.map((subject) => `<option>${escapeHtml(subject)}</option>`).join("")}</select></label>
          <label>Duration<input name="duration" value="60 minutes" required></label>
          <label>Maximum Marks<input name="max" value="50" required></label>
          <label class="wide">Questions<textarea name="questions" required></textarea></label>
          <button class="primary-btn" type="submit">Create Paper</button>
        </form>
        <h3>My Papers</h3>
        ${paperList(ownPapers)}
      </div>
    `,
    students: `
      <div class="data-panel">
        ${teacher.classTeacherOf ? `
          <h3>Add Student to ${escapeHtml(teacher.classTeacherOf)}</h3>
          <form class="form-grid" data-action="add-student">
            <label>Admission No<input name="admissionNo" required></label>
            <label>Name<input name="name" required></label>
            <label>Roll No<input name="rollNo" required></label>
            <label>Date of Birth<input name="dob" type="date"></label>
            <label>Parent<select name="parentId">${parentOptions(state.parents)}</select></label>
            <button class="primary-btn" type="submit">Add Student</button>
          </form>
          <h3>My Class Students</h3>
          ${studentList(state.students.filter((student) => student.className === teacher.classTeacherOf))}
        ` : `<p class="empty-state">You are not assigned as a class teacher yet.</p>`}
      </div>
    `,
    parents: `
      <div class="data-panel">
        <h3>Add Parent Login</h3>
        <form class="form-grid" data-action="add-parent">
          <label>Name<input name="name" required></label>
          <label>Username<input name="username" required></label>
          <label>Password<input name="password" required></label>
          <label>Phone<input name="phone" required></label>
          <label>Email<input name="email" type="email"></label>
          <button class="primary-btn" type="submit">Add Parent</button>
        </form>
        <h3>Parent Directory</h3>
        ${parentList(state.parents)}
      </div>
    `,
    timetable: `
      <div class="data-panel">
        <h3>My Timetable</h3>
        ${timetableList(ownTimetable)}
      </div>
    `
  };

  setDashboard("Teacher Portal", `Welcome, ${teacher.name}`, `${tabs(tabItems)}${panels[activeTab] || panels.overview}`);
}

function renderParent() {
  const parent = state.parents.find((item) => item.id === session.parentId);
  const children = state.students.filter((student) => student.parentId === parent.id);
  const childIds = children.map((student) => student.id);
  const childMarks = state.marks.filter((mark) => childIds.includes(mark.studentId) && mark.published !== false);
  const childAttendance = state.attendance.filter((item) => childIds.includes(item.studentId));
  const childHomework = state.homework.filter((item) => children.some((student) => student.className === item.className));
  const childFees = state.fees.filter((fee) => childIds.includes(fee.studentId));
  const average = childMarks.length
    ? Math.round(childMarks.reduce((sum, mark) => sum + (Number(mark.score) / Number(mark.max)) * 100, 0) / childMarks.length)
    : 0;
  const present = childAttendance.filter((item) => item.status === "Present").length;
  const attendanceRate = childAttendance.length ? Math.round((present / childAttendance.length) * 100) : 0;
  const feeDue = childFees.reduce((sum, fee) => sum + Math.max(Number(fee.amount) - Number(fee.paid), 0), 0);

  const tabItems = [
    { key: "overview", label: "Overview" },
    { key: "students", label: "My Children" },
    { key: "marks", label: "Progress" },
    { key: "attendance", label: "Attendance" },
    { key: "homework", label: "Homework" },
    { key: "fees", label: "Fees" },
    { key: "notices", label: "Notices" }
  ];

  const panels = {
    overview: `
      ${statCards([
        { value: children.length, label: "Linked Students" },
        { value: `${average}%`, label: "Average Marks" },
        { value: `${attendanceRate}%`, label: "Attendance" },
        { value: money(feeDue), label: "Fee Due" }
      ])}
      <div class="panel-grid two">
        <div class="data-panel">
          <h3>My Children</h3>
          ${studentList(children)}
        </div>
        <div class="data-panel">
          <h3>Latest Notices</h3>
          ${noticeList(state.notices.slice(0, 4))}
        </div>
      </div>
    `,
    students: `
      <div class="data-panel">
        <h3>My Children</h3>
        ${studentList(children)}
      </div>
    `,
    marks: `
      <div class="data-panel">
        <h3>Progress Tracking</h3>
        ${marksList(childMarks, true)}
      </div>
    `,
    attendance: `
      <div class="data-panel">
        <h3>Attendance</h3>
        ${attendanceList(childAttendance)}
      </div>
    `,
    homework: `
      <div class="data-panel">
        <h3>Homework</h3>
        ${homeworkList(childHomework)}
      </div>
    `,
    fees: `
      <div class="data-panel">
        <h3>Fees</h3>
        ${feeList(childFees)}
      </div>
    `,
    notices: `
      <div class="data-panel">
        <h3>Notices</h3>
        ${noticeList(state.notices)}
      </div>
    `
  };

  setDashboard("Parent Portal", `Welcome, ${parent.name}`, `${tabs(tabItems)}${panels[activeTab] || panels.overview}`);
}

function classList(classes) {
  return listRows(classes.map((item) => `
    <article class="list-row">
      <div>
        <h4>${escapeHtml(item.name)} <span class="badge">Room ${escapeHtml(item.room || "NA")}</span></h4>
        <p>Grade ${escapeHtml(item.grade)} | Section ${escapeHtml(item.section)} | Class Teacher: ${escapeHtml(getTeacherName(item.classTeacherId))}</p>
      </div>
    </article>
  `), "No classes created.");
}

function subjectList(subjects) {
  return listRows(subjects.map((subject) => `
    <article class="list-row">
      <div>
        <h4>${escapeHtml(subject.name)} <span class="badge">${escapeHtml(subject.code)}</span></h4>
      </div>
    </article>
  `), "No subjects created.");
}

function teacherList(teachers, showDelete = false) {
  return listRows(teachers.map((teacher) => `
    <article class="list-row">
      <div>
        <h4>${escapeHtml(teacher.name)} <span class="badge">${escapeHtml(teacher.username)}</span> <span class="badge">${escapeHtml(teacher.status || "Active")}</span></h4>
        <p>Subjects: ${escapeHtml(teacher.subjects.join(", "))}</p>
        <p>Classes: ${escapeHtml(teacher.classes.join(", "))} ${teacher.classTeacherOf ? `| Class Teacher: ${escapeHtml(teacher.classTeacherOf)}` : ""}</p>
        <p>${escapeHtml(teacher.email || "No email")} | ${escapeHtml(teacher.phone || "No phone")} | Password: ${escapeHtml(teacher.password)}</p>
      </div>
      ${showDelete ? `<button class="icon-btn danger" data-delete="teacher" data-id="${teacher.id}">Remove</button>` : ""}
    </article>
  `), "No teachers yet.");
}

function studentList(students) {
  return listRows(students.map((student) => {
    const parent = state.parents.find((item) => item.id === student.parentId);
    return `
      <article class="list-row">
        <div>
          <h4>${escapeHtml(student.name)} <span class="badge">${escapeHtml(student.admissionNo || "No Admission")}</span> <span class="badge">Class ${escapeHtml(student.className)}</span></h4>
          <p>Roll No: ${escapeHtml(student.rollNo)} | DOB: ${escapeHtml(student.dob || "NA")} | Parent: ${escapeHtml(parent?.name || "Not linked")}</p>
        </div>
      </article>
    `;
  }), "No students found.");
}

function parentList(parents) {
  return listRows(parents.map((parent) => `
    <article class="list-row">
      <div>
        <h4>${escapeHtml(parent.name)} <span class="badge">${escapeHtml(parent.username)}</span></h4>
        <p>Phone: ${escapeHtml(parent.phone)} | Email: ${escapeHtml(parent.email || "No email")} | Password: ${escapeHtml(parent.password)}</p>
      </div>
    </article>
  `), "No parents yet.");
}

function platformSchoolList(schools, showActions = false) {
  return listRows(schools.map((school) => `
    <article class="list-row school-row">
      <div>
        <h4>${escapeHtml(school.name)} <span class="badge">${escapeHtml(school.status)}</span> <span class="badge">${escapeHtml(school.plan)}</span></h4>
        <p>Code: ${escapeHtml(school.code)} | City: ${escapeHtml(school.city || "Not provided")} | Joined: ${escapeHtml(school.joined)}</p>
        <p>Contact: ${escapeHtml(school.contactName)} | ${escapeHtml(school.email || "No email")} | ${escapeHtml(school.mobile || "No mobile")}</p>
      </div>
      ${showActions ? `
        <div class="row-actions">
          <button class="icon-btn success" data-school-status="Active" data-id="${school.id}" type="button">Activate</button>
          <button class="icon-btn danger" data-school-status="Inactive" data-id="${school.id}" type="button">Deactivate</button>
        </div>
      ` : ""}
    </article>
  `), "No schools found.");
}

function noticeList(notices) {
  return listRows(notices.map((notice) => `
    <article class="list-row">
      <div>
        <h4>${escapeHtml(notice.title)} <span class="badge">${escapeHtml(notice.audience)}</span> <span class="badge">${escapeHtml(notice.priority || "Normal")}</span></h4>
        <p>${escapeHtml(notice.message)}</p>
        <p>${escapeHtml(notice.date || "")}</p>
      </div>
    </article>
  `), "No notices published.");
}

function examList(exams) {
  return listRows(exams.map((exam) => `
    <article class="list-row">
      <div>
        <h4>${escapeHtml(exam.name)} <span class="badge">${escapeHtml(exam.type)}</span> <span class="badge">${escapeHtml(exam.status)}</span></h4>
        <p>Class ${escapeHtml(exam.className)} | Max Marks: ${escapeHtml(exam.max)} | Date: ${escapeHtml(exam.date)}</p>
      </div>
    </article>
  `), "No exams planned.");
}

function marksList(marks, showProgress = false) {
  return listRows(marks.map((mark) => {
    const student = state.students.find((item) => item.id === mark.studentId);
    const percent = Math.round((Number(mark.score) / Number(mark.max)) * 100);
    return `
      <article class="list-row">
        <div>
          <h4>${escapeHtml(mark.title)} <span class="badge">${escapeHtml(mark.type)}</span> <span class="badge">${mark.published === false ? "Draft" : "Published"}</span></h4>
          <p>${escapeHtml(student?.name || "Unknown Student")} | ${escapeHtml(mark.subject)} | ${escapeHtml(mark.score)}/${escapeHtml(mark.max)} (${percent}%)</p>
        </div>
        ${showProgress ? `<div class="progress-bar" aria-label="${percent}%"><span style="width:${percent}%"></span></div>` : ""}
      </article>
    `;
  }), "No marks available.");
}

function attendanceList(records) {
  return listRows(records.map((item) => {
    const student = state.students.find((record) => record.id === item.studentId);
    return `
      <article class="list-row">
        <div>
          <h4>${escapeHtml(student?.name || "Unknown Student")} <span class="badge">${escapeHtml(item.status)}</span></h4>
          <p>${escapeHtml(item.date)} | Class ${escapeHtml(item.className)} ${item.note ? `| ${escapeHtml(item.note)}` : ""}</p>
        </div>
      </article>
    `;
  }), "No attendance records.");
}

function homeworkList(records) {
  return listRows(records.map((item) => `
    <article class="list-row">
      <div>
        <h4>${escapeHtml(item.title)} <span class="badge">${escapeHtml(item.className)}</span> <span class="badge">${escapeHtml(item.subject)}</span></h4>
        <p>Due: ${escapeHtml(item.dueDate)} | Teacher: ${escapeHtml(getTeacherName(item.teacherId))}</p>
        <p>${escapeHtml(item.details)}</p>
      </div>
    </article>
  `), "No homework assigned.");
}

function feeList(records) {
  return listRows(records.map((fee) => {
    const student = state.students.find((item) => item.id === fee.studentId);
    const due = Math.max(Number(fee.amount) - Number(fee.paid), 0);
    return `
      <article class="list-row">
        <div>
          <h4>${escapeHtml(student?.name || "Unknown Student")} <span class="badge">${escapeHtml(fee.status)}</span></h4>
          <p>${escapeHtml(fee.term)} | Amount: ${money(fee.amount)} | Paid: ${money(fee.paid)} | Due: ${money(due)} | Due Date: ${escapeHtml(fee.dueDate)}</p>
        </div>
      </article>
    `;
  }), "No fee records.");
}

function timetableList(records) {
  return listRows(records.map((item) => `
    <article class="list-row">
      <div>
        <h4>${escapeHtml(item.day)} Period ${escapeHtml(item.period)} <span class="badge">${escapeHtml(item.className)}</span></h4>
        <p>${escapeHtml(item.time)} | ${escapeHtml(item.subject)} | ${escapeHtml(getTeacherName(item.teacherId))}</p>
      </div>
    </article>
  `), "No timetable entries.");
}

function paperList(papers) {
  return listRows(papers.map((paper) => `
    <article class="list-row">
      <div>
        <h4>${escapeHtml(paper.title)} <span class="badge">${escapeHtml(paper.className)} ${escapeHtml(paper.subject)}</span></h4>
        <p>Duration: ${escapeHtml(paper.duration)} | Maximum Marks: ${escapeHtml(paper.max)}</p>
        <div class="paper-preview">${escapeHtml(paper.questions)}</div>
      </div>
    </article>
  `), "No question papers created.");
}

function auditList(records) {
  return listRows(records.map((log) => `
    <article class="list-row">
      <div>
        <h4>${escapeHtml(log.actor)} <span class="badge">${escapeHtml(log.date)}</span></h4>
        <p>${escapeHtml(log.action)}</p>
      </div>
    </article>
  `), "No activity yet.");
}

function reportCards(students) {
  return listRows(students.map((student) => {
    const records = state.marks.filter((mark) => mark.studentId === student.id && mark.published !== false);
    const average = records.length
      ? Math.round(records.reduce((sum, mark) => sum + (Number(mark.score) / Number(mark.max)) * 100, 0) / records.length)
      : 0;
    return `
      <article class="list-row">
        <div>
          <h4>${escapeHtml(student.name)} <span class="badge">${escapeHtml(student.className)}</span></h4>
          <p>Academic average: ${average}% | Records: ${records.length}</p>
        </div>
        <div class="progress-bar" aria-label="${average}%"><span style="width:${average}%"></span></div>
      </article>
    `;
  }), "No students available.");
}

function feeSummary() {
  const total = state.fees.reduce((sum, fee) => sum + Number(fee.amount), 0);
  const paid = state.fees.reduce((sum, fee) => sum + Number(fee.paid), 0);
  const due = Math.max(total - paid, 0);
  return `
    <div class="summary-block">
      <strong>Fee Collection</strong>
      <span>Total: ${money(total)}</span>
      <span>Collected: ${money(paid)}</span>
      <span>Outstanding: ${money(due)}</span>
    </div>
  `;
}

function attendanceSummary() {
  const present = state.attendance.filter((item) => item.status === "Present").length;
  const rate = state.attendance.length ? Math.round((present / state.attendance.length) * 100) : 0;
  return `
    <div class="summary-block">
      <strong>Attendance Health</strong>
      <span>Total records: ${state.attendance.length}</span>
      <span>Present records: ${present}</span>
      <span>Overall rate: ${rate}%</span>
    </div>
  `;
}

function classOptions(classes) {
  return classes.map((item) => `<option value="${escapeHtml(item.name)}">${escapeHtml(item.name)}</option>`).join("");
}

function subjectOptions(subjects) {
  return subjects.map((item) => `<option value="${escapeHtml(item.name)}">${escapeHtml(item.name)}</option>`).join("");
}

function teacherOptions(teachers, includeBlank = false) {
  return `${includeBlank ? "<option value=''>Unassigned</option>" : ""}${teachers.map((teacher) => `<option value="${teacher.id}">${escapeHtml(teacher.name)}</option>`).join("")}`;
}

function studentOptions(students) {
  return students.map((student) => `<option value="${student.id}">${escapeHtml(student.name)} - ${escapeHtml(student.className)}</option>`).join("");
}

function parentOptions(parents) {
  return parents.map((parent) => `<option value="${parent.id}">${escapeHtml(parent.name)}</option>`).join("");
}

function examOptions(exams) {
  return exams.map((exam) => `<option value="${exam.id}">${escapeHtml(exam.name)} - ${escapeHtml(exam.className)}</option>`).join("");
}

async function handleLogin(event) {
  event.preventDefault();
  const role = el("#roleSelect").value;
  const username = el("#usernameInput").value.trim();
  const password = el("#passwordInput").value;

  if (!requireSupabase()) return;
  if (role === "platform" && !isPlatformAdminRoute()) {
    alert("Platform administration is only available at /admin.");
    return;
  }

  let user = null;
  try {
    const { data, error } = await sb.from("app_users").select("*").eq("role", role).eq("username", username).eq("password_hash", password).maybeSingle();
    if (!error && data) {
      user = { role: data.role, username: data.username, password: data.password_hash, name: data.name, teacherId: data.teacher_id, parentId: data.parent_id, dbId: data.id, schoolId: data.school_id };
    }
  } catch (e) { console.error("Supabase login query failed:", e); }

  const envPlatformUser = sbConfig.platformUsername || "platform";
  const envPlatformPassword = sbConfig.platformPassword || "";
  if (!user && role === "platform" && username === envPlatformUser && password === envPlatformPassword) {
    const inserted = await dbInsert("app_users", { role: "platform", name: "iGuider Platform Admin", username, password_hash: password });
    user = { role: "platform", username, password, name: "iGuider Platform Admin", dbId: inserted?.id };
  }

  if (!user) {
    alert("Invalid login details. Please use the credentials issued by the school administrator.");
    return;
  }

  session = user;
  await syncFromSupabase();

  if (user.role === "admin") {
    const schoolProfile = state.school;
    const school = state.schools.find((item) => item.id === schoolProfile.platformSchoolId || item.code === schoolProfile.code);
    if (school?.status !== "Active") {
      session = null;
      alert("This school account is currently inactive. Please contact iGuider administration.");
      return;
    }
  }

  activeTab = "overview";
  renderDashboard();
}

async function handleSignup(event) {
  event.preventDefault();
  if (!requireSupabase()) return;
  const form = event.currentTarget;
  const schoolName = formValue(form, "schoolName");
  const email = formValue(form, "email");
  const mobile = formValue(form, "mobile");
  const password = formValue(form, "password");
  const username = email || mobile;
  if (!username) {
    alert("Please provide either an email address or a mobile number.");
    return;
  }
  const schoolCode = `IG-${Math.floor(1000 + Math.random() * 9000)}`;
  const contactName = formValue(form, "contactName");
  const schoolEntry = {
    name: schoolName, code: schoolCode, city: "Not provided",
    contactName, email, mobile, status: "Pending", plan: "Trial", joined: today()
  };
  const dbSchool = await dbInsert("platform_schools", { name: schoolName, code: schoolCode, city: "Not provided", contact_name: contactName, email, mobile, status: "Pending", plan: "Trial", joined: today() });
  const sId = dbSchool?.id || null;
  if (sId) {
    const dbProfile = await dbInsert("school_profiles", { platform_school_id: sId, name: schoolName, code: schoolCode, session: "2026-2027", board: "Not set", city: "Not provided" });
    if (dbProfile?.id) {
      await dbInsert("app_users", { school_id: dbProfile.id, role: "admin", name: contactName, username, password_hash: password });
    }
  }
  state.schools.unshift({ ...schoolEntry, id: sId });
  saveState(`Received signup request from ${schoolName}`);
  form.reset();
  alert("Signup request submitted. iGuider administration will review and activate the school account.");
}

function handleGoogleSignup() {
  const form = el("#signupForm");
  form.schoolName.value = form.schoolName.value || "Google Connected School";
  form.contactName.value = form.contactName.value || "Google Account User";
  form.email.value = form.email.value || `school${Date.now()}@gmail.com`;
  form.password.value = form.password.value || "Google@123";
  form.requestSubmit();
}

function setSignupMethod(method) {
  const emailField = el("#signupEmailField");
  const mobileField = el("#signupMobileField");
  const emailInput = emailField.querySelector("input");
  const mobileInput = mobileField.querySelector("input");
  const useMobile = method === "mobile";
  emailField.hidden = useMobile;
  mobileField.hidden = !useMobile;
  emailInput.required = !useMobile;
  mobileInput.required = useMobile;
  document.querySelectorAll("[data-signup-method]").forEach((button) => {
    button.classList.toggle("active", button.dataset.signupMethod === method);
  });
}


function formValue(form, name) {
  return new FormData(form).get(name)?.toString().trim() || "";
}

function feeStatus(amount, paid) {
  if (Number(paid) <= 0) return "Due";
  if (Number(paid) >= Number(amount)) return "Paid";
  return "Partially Paid";
}

function openProfileModal() {
  const form = el("#profileForm");
  if (session.role === "platform") {
    form.innerHTML = `
      <label>Name<input name="name" value="${escapeHtml(session.name)}" required></label>
      <label>Username<input name="username" value="${escapeHtml(session.username)}" required></label>
      <label>Password<input name="password" value="${escapeHtml(session.password)}" required></label>
      <button class="primary-btn" type="submit">Save Administration Details</button>
    `;
  }
  if (session.role === "admin") {
    form.innerHTML = `
      <label>School Name<input name="schoolName" value="${escapeHtml(state.school.name)}" required></label>
      <label>School Code<input name="schoolCode" value="${escapeHtml(state.school.code)}" required></label>
      <label>Academic Session<input name="session" value="${escapeHtml(state.school.session)}" required></label>
      <label>Board<input name="board" value="${escapeHtml(state.school.board)}" required></label>
      <label>City<input name="city" value="${escapeHtml(state.school.city)}" required></label>
      <button class="primary-btn" type="submit">Save School Details</button>
    `;
  }
  if (session.role === "teacher") {
    const teacher = currentTeacher();
    form.innerHTML = `
      <label>Name<input name="name" value="${escapeHtml(teacher.name)}" required></label>
      <label>Email<input name="email" type="email" value="${escapeHtml(teacher.email || "")}"></label>
      <label>Phone<input name="phone" value="${escapeHtml(teacher.phone || "")}"></label>
      <label>Password<input name="password" value="${escapeHtml(teacher.password)}" required></label>
      <button class="primary-btn" type="submit">Save Teacher Details</button>
    `;
  }
  if (session.role === "parent") {
    const parent = state.parents.find((item) => item.id === session.parentId);
    form.innerHTML = `
      <label>Name<input name="name" value="${escapeHtml(parent.name)}" required></label>
      <label>Email<input name="email" type="email" value="${escapeHtml(parent.email || "")}"></label>
      <label>Phone<input name="phone" value="${escapeHtml(parent.phone || "")}"></label>
      <label>Password<input name="password" value="${escapeHtml(parent.password)}" required></label>
      <button class="primary-btn" type="submit">Save Parent Details</button>
    `;
  }
  el("#profileModal").hidden = false;
}

function closeProfileModal() {
  el("#profileModal").hidden = true;
}

function saveProfile(event) {
  event.preventDefault();
  const form = event.currentTarget;
  if (!session) return;
  if (!requireSupabase()) return;
  if (session.role === "platform") {
    const user = state.users.find((item) => item.role === "platform" && item.username === session.username);
    if (user) {
      user.name = formValue(form, "name");
      user.username = formValue(form, "username");
      user.password = formValue(form, "password");
      session = user;
      if (user.dbId) dbUpdate("app_users", user.dbId, { name: user.name, username: user.username, password_hash: user.password });
    }
    saveState("Updated platform administration profile");
  }
  if (session.role === "admin") {
    state.school.name = formValue(form, "schoolName");
    state.school.code = formValue(form, "schoolCode");
    state.school.session = formValue(form, "session");
    state.school.board = formValue(form, "board");
    state.school.city = formValue(form, "city");
    session.name = state.school.name;
    if (state.school.dbId) dbUpdate("school_profiles", state.school.dbId, { name: state.school.name, code: state.school.code, session: state.school.session, board: state.school.board, city: state.school.city });
    saveState("Updated school profile details");
  }
  if (session.role === "teacher") {
    const teacher = currentTeacher();
    teacher.name = formValue(form, "name");
    teacher.email = formValue(form, "email");
    teacher.phone = formValue(form, "phone");
    teacher.password = formValue(form, "password");
    const user = state.users.find((item) => item.teacherId === teacher.id);
    if (user) {
      user.name = teacher.name;
      user.password = teacher.password;
      session.name = teacher.name;
      session.password = teacher.password;
    }
    dbUpdate("teachers", teacher.id, { name: teacher.name, email: teacher.email, phone: teacher.phone });
    if (user?.dbId) dbUpdate("app_users", user.dbId, { name: teacher.name, password_hash: teacher.password });
    saveState("Updated teacher profile details");
  }
  if (session.role === "parent") {
    const parent = state.parents.find((item) => item.id === session.parentId);
    parent.name = formValue(form, "name");
    parent.email = formValue(form, "email");
    parent.phone = formValue(form, "phone");
    parent.password = formValue(form, "password");
    const user = state.users.find((item) => item.parentId === parent.id);
    if (user) {
      user.name = parent.name;
      user.password = parent.password;
      session.name = parent.name;
      session.password = parent.password;
    }
    dbUpdate("parents", parent.id, { name: parent.name, email: parent.email, phone: parent.phone });
    if (user?.dbId) dbUpdate("app_users", user.dbId, { name: parent.name, password_hash: parent.password });
    saveState("Updated parent profile details");
  }
  closeProfileModal();
  renderDashboard();
}

async function handleSubmit(event) {
  const form = event.target.closest("form[data-action]");
  if (!form) return;
  event.preventDefault();
  const action = form.dataset.action;
  const teacher = currentTeacher();
  const sid = getSchoolDbId();

  if (!requireSupabase()) return;

  if (action === "add-platform-school") {
    const entry = {
      name: formValue(form, "name"),
      code: formValue(form, "code"),
      session: formValue(form, "session"),
      board: formValue(form, "board"),
      city: formValue(form, "city"),
      contactName: formValue(form, "contactName"),
      email: formValue(form, "email"),
      mobile: formValue(form, "mobile"),
      adminUsername: formValue(form, "adminUsername"),
      adminPassword: formValue(form, "adminPassword"),
      plan: formValue(form, "plan") || "Trial",
      status: formValue(form, "status") || "Pending",
      joined: today()
    };
    const inserted = await dbInsert("platform_schools", {
      name: entry.name,
      code: entry.code,
      city: entry.city,
      contact_name: entry.contactName,
      email: entry.email,
      mobile: entry.mobile,
      status: entry.status,
      plan: entry.plan,
      joined: entry.joined
    });
    if (inserted?.id) {
      const profile = await dbInsert("school_profiles", {
        platform_school_id: inserted.id,
        name: entry.name,
        code: entry.code,
        session: entry.session,
        board: entry.board,
        city: entry.city
      });
      if (profile?.id) {
        await dbInsert("app_users", {
          school_id: profile.id,
          role: "admin",
          name: entry.contactName,
          username: entry.adminUsername,
          password_hash: entry.adminPassword
        });
      }
      state.schools.unshift(inserted);
      saveState(`Added school ${entry.name}`);
      form.reset();
      renderDashboard();
    }
    return;
  }

  if (action === "add-class") {
    const className = formValue(form, "name");
    const teacherId = formValue(form, "classTeacherId");
    const entry = { id: id("class"), name: className, grade: formValue(form, "grade"), section: formValue(form, "section"), room: formValue(form, "room"), classTeacherId: teacherId };
    state.classes.push(entry);
    if (teacherId) {
      const classTeacher = state.teachers.find((item) => item.id === teacherId);
      if (classTeacher) {
        classTeacher.classTeacherOf = className;
        if (!classTeacher.classes.includes(className)) classTeacher.classes.push(className);
        dbUpdate("teachers", classTeacher.id, { class_teacher_of: className, classes: classTeacher.classes });
      }
    }
    dbInsert("classes", { school_id: sid, name: className, grade: entry.grade, section: entry.section, room: entry.room, class_teacher_id: teacherId || null });
    saveState(`Created class ${className}`);
  }

  if (action === "add-subject") {
    const entry = { id: id("subject"), name: formValue(form, "name"), code: formValue(form, "code").toUpperCase() };
    state.subjects.push(entry);
    dbInsert("subjects", { school_id: sid, name: entry.name, code: entry.code });
    saveState(`Created subject ${entry.name}`);
  }

  if (action === "add-teacher") {
    const teacherId = id("teacher");
    const username = formValue(form, "username");
    const password = formValue(form, "password");
    const name = formValue(form, "name");
    const subjectsList = formValue(form, "subjects").split(",").map((item) => item.trim()).filter(Boolean);
    const classesList = formValue(form, "classes").split(",").map((item) => item.trim()).filter(Boolean);
    const classTeacherOf = formValue(form, "classTeacherOf");
    state.teachers.push({
      id: teacherId, name, username, password,
      email: formValue(form, "email"), phone: formValue(form, "phone"),
      subjects: subjectsList, classes: classesList, classTeacherOf, status: "Active"
    });
    state.users.push({ role: "teacher", username, password, teacherId, name });
    // Insert teacher first, then user
    (async () => {
      const dbTeacher = await dbInsert("teachers", { school_id: sid, name, username, email: formValue(form, "email"), phone: formValue(form, "phone"), subjects: subjectsList, classes: classesList, class_teacher_of: classTeacherOf, status: "Active" });
      const tId = dbTeacher?.id || null;
      dbInsert("app_users", { school_id: sid, role: "teacher", name, username, password_hash: password, teacher_id: tId });
    })();
    saveState(`Added teacher ${name}`);
  }

  if (action === "add-notice") {
    const entry = { id: id("notice"), title: formValue(form, "title"), audience: formValue(form, "audience"), priority: formValue(form, "priority"), message: formValue(form, "message"), date: today() };
    state.notices.unshift(entry);
    dbInsert("notices", { school_id: sid, title: entry.title, audience: entry.audience, priority: entry.priority, message: entry.message, notice_date: today() });
    saveState(`Published notice ${entry.title}`);
  }

  if (action === "add-exam") {
    const entry = { id: id("exam"), name: formValue(form, "name"), type: formValue(form, "type"), className: formValue(form, "className"), max: Number(formValue(form, "max")), date: formValue(form, "date"), status: formValue(form, "status") };
    state.exams.unshift(entry);
    dbInsert("exams", { school_id: sid, name: entry.name, type: entry.type, class_name: entry.className, max_marks: entry.max, exam_date: entry.date || null, status: entry.status });
    saveState(`Created exam ${entry.name}`);
  }

  if (action === "add-marks") {
    const student = state.students.find((item) => item.id === formValue(form, "studentId"));
    if (!student) return;
    const entry = {
      id: id("mark"), examId: formValue(form, "examId"), studentId: student.id,
      className: student.className, subject: formValue(form, "subject"),
      type: formValue(form, "type"), title: formValue(form, "title"),
      score: Number(formValue(form, "score")), max: Number(formValue(form, "max")),
      published: formValue(form, "published") !== "false"
    };
    state.marks.unshift(entry);
    dbInsert("marks", { school_id: sid, exam_id: entry.examId?.includes("-") ? entry.examId : null, student_id: student.id, class_name: entry.className, subject: entry.subject, type: entry.type, title: entry.title, score: entry.score, max_marks: entry.max, published: entry.published });
    saveState(`Saved marks for ${student.name}`);
  }

  if (action === "add-attendance") {
    const student = state.students.find((item) => item.id === formValue(form, "studentId"));
    if (!student) return;
    const entry = { id: id("attendance"), studentId: student.id, className: student.className, date: formValue(form, "date"), status: formValue(form, "status"), note: formValue(form, "note") };
    state.attendance.unshift(entry);
    dbInsert("attendance", { school_id: sid, student_id: student.id, class_name: entry.className, attendance_date: entry.date, status: entry.status, note: entry.note });
    saveState(`Marked attendance for ${student.name}`);
  }

  if (action === "add-homework") {
    const entry = { id: id("homework"), teacherId: teacher.id, className: formValue(form, "className"), subject: formValue(form, "subject"), title: formValue(form, "title"), dueDate: formValue(form, "dueDate"), details: formValue(form, "details") };
    state.homework.unshift(entry);
    dbInsert("homework", { school_id: sid, teacher_id: teacher.id, class_name: entry.className, subject: entry.subject, title: entry.title, due_date: entry.dueDate || null, details: entry.details });
    saveState(`Assigned homework ${entry.title}`);
  }

  if (action === "add-paper") {
    const entry = {
      id: id("paper"), teacherId: teacher.id, className: formValue(form, "className"),
      subject: formValue(form, "subject"), title: formValue(form, "title"),
      duration: formValue(form, "duration"), max: formValue(form, "max"),
      questions: formValue(form, "questions")
    };
    state.papers.unshift(entry);
    dbInsert("question_papers", { school_id: sid, teacher_id: teacher.id, class_name: entry.className, subject: entry.subject, title: entry.title, duration: entry.duration, max_marks: entry.max, questions: entry.questions });
    saveState(`Created question paper ${entry.title}`);
  }

  if (action === "add-student" || action === "add-student-admin") {
    const className = action === "add-student" ? teacher.classTeacherOf : formValue(form, "className");
    const name = formValue(form, "name");
    const entry = {
      id: id("student"), admissionNo: formValue(form, "admissionNo"), name, className,
      rollNo: formValue(form, "rollNo"), dob: formValue(form, "dob"),
      parentId: formValue(form, "parentId"), status: "Active"
    };
    state.students.push(entry);
    dbInsert("students", { school_id: sid, admission_no: entry.admissionNo, name, class_name: className, roll_no: entry.rollNo, dob: entry.dob || null, parent_id: entry.parentId?.includes("-") ? entry.parentId : null, status: "Active" });
    saveState(`Added student ${name}`);
  }

  if (action === "add-parent") {
    const parentId = id("parent");
    const username = formValue(form, "username");
    const password = formValue(form, "password");
    const name = formValue(form, "name");
    state.parents.push({ id: parentId, name, username, password, phone: formValue(form, "phone"), email: formValue(form, "email") });
    state.users.push({ role: "parent", username, password, parentId, name });
    (async () => {
      const dbParent = await dbInsert("parents", { school_id: sid, name, username, email: formValue(form, "email"), phone: formValue(form, "phone") });
      const pId = dbParent?.id || null;
      dbInsert("app_users", { school_id: sid, role: "parent", name, username, password_hash: password, parent_id: pId });
    })();
    saveState(`Added parent ${name}`);
  }

  if (action === "add-fee") {
    const amount = Number(formValue(form, "amount"));
    const paid = Number(formValue(form, "paid"));
    const entry = { id: id("fee"), studentId: formValue(form, "studentId"), term: formValue(form, "term"), amount, paid, dueDate: formValue(form, "dueDate"), status: feeStatus(amount, paid) };
    state.fees.unshift(entry);
    dbInsert("fees", { school_id: sid, student_id: entry.studentId?.includes("-") ? entry.studentId : null, term: entry.term, amount, paid, due_date: entry.dueDate || null, status: entry.status });
    saveState(`Updated fee ledger for ${entry.term}`);
  }

  if (action === "add-timetable") {
    const entry = { id: id("timetable"), className: formValue(form, "className"), day: formValue(form, "day"), period: formValue(form, "period"), time: formValue(form, "time"), subject: formValue(form, "subject"), teacherId: formValue(form, "teacherId") };
    state.timetable.unshift(entry);
    dbInsert("timetable", { school_id: sid, class_name: entry.className, day: entry.day, period: entry.period, time: entry.time, subject: entry.subject, teacher_id: entry.teacherId?.includes("-") ? entry.teacherId : null });
    saveState(`Added timetable period for ${entry.className}`);
  }

  form.reset();
  renderDashboard();
}

function handleClick(event) {
  const viewTarget = event.target.closest("[data-view]");
  if (viewTarget) {
    event.preventDefault();
    const view = viewTarget.dataset.view;
    if (view === "auth") showAuthPage();
    if (view === "getstarted") showGetStartedPage();
    if (view === "public") showPublicPage();
    return;
  }

  const scrollTarget = event.target.closest("[data-scroll]");
  if (scrollTarget) {
    el(scrollTarget.dataset.scroll).scrollIntoView({ behavior: "smooth" });
    return;
  }

  const tab = event.target.closest("[data-tab]");
  if (tab) {
    activeTab = tab.dataset.tab;
    renderDashboard();
    return;
  }

  const deleteBtn = event.target.closest("[data-delete]");
  if (deleteBtn && deleteBtn.dataset.delete === "teacher") {
    if (!requireSupabase()) return;
    const teacherId = deleteBtn.dataset.id;
    const teacher = state.teachers.find((item) => item.id === teacherId);
    state.teachers = state.teachers.filter((item) => item.id !== teacherId);
    state.users = state.users.filter((item) => item.teacherId !== teacherId && item.username !== teacher?.username);
    dbDelete("teachers", teacherId);
    saveState(`Removed teacher ${teacher?.name || teacherId}`);
    renderDashboard();
  }

  const schoolStatusBtn = event.target.closest("[data-school-status]");
  if (schoolStatusBtn) {
    if (!requireSupabase()) return;
    const school = state.schools.find((item) => item.id === schoolStatusBtn.dataset.id);
    if (!school) return;
    school.status = schoolStatusBtn.dataset.schoolStatus;
    dbUpdate("platform_schools", school.id, { status: school.status });
    saveState(`${school.status} school ${school.name}`);
    renderDashboard();
  }
}

function initializeRoleDefaults() {
  el("#roleSelect").addEventListener("change", () => {
    el("#usernameInput").value = "";
    el("#passwordInput").value = "";
  });
}

el("#loginForm").addEventListener("submit", handleLogin);
el("#getStartedForm").addEventListener("submit", handleGetStarted);
el("#dashboardContent").addEventListener("submit", handleSubmit);
el("#dashboardContent").addEventListener("click", handleClick);
document.addEventListener("click", handleClick);
el("#editProfileBtn").addEventListener("click", openProfileModal);
el("#closeProfileBtn").addEventListener("click", closeProfileModal);
el("#profileModal").addEventListener("click", (event) => {
  if (event.target.id === "profileModal") closeProfileModal();
});
el("#profileForm").addEventListener("submit", saveProfile);
el("#themeSelect").addEventListener("change", (event) => applyTheme(event.target.value));
el("#logoutBtn").addEventListener("click", () => {
  session = null;
  el("#dashboard").hidden = true;
  showAuthPage();
});

// Get Started → WhatsApp form handler
function handleGetStarted(event) {
  event.preventDefault();
  if (!requireSupabase()) return;
  const form = event.currentTarget;
  const schoolName = formValue(form, "schoolName");
  const address = formValue(form, "address");
  const totalStudents = formValue(form, "totalStudents");
  const contactNumber = formValue(form, "contactNumber");
  const altNumber = formValue(form, "altNumber");
  const email = formValue(form, "email");

  const message = [
    `🏫 *New School Inquiry — iGuider ERP*`,
    ``,
    `*School/Institute:* ${schoolName}`,
    `*Address:* ${address}`,
    `*Total Students (Approx):* ${totalStudents}`,
    `*Contact Number:* ${contactNumber}`,
    altNumber ? `*Alternative Number:* ${altNumber}` : "",
    `*Email:* ${email}`,
    ``,
    `Submitted from iguider.in`
  ].filter(Boolean).join("\n");

  const whatsappUrl = `https://wa.me/918638373298?text=${encodeURIComponent(message)}`;
  window.open(whatsappUrl, "_blank");

  // Also save to Supabase for tracking
  dbInsert("audit_logs", {
    school_id: getSchoolDbId(),
    actor: email || contactNumber,
    action: `Inquiry from ${schoolName} (${totalStudents} students)`,
    log_date: today()
  });

  form.reset();
  alert("Thank you! Your inquiry has been sent to our WhatsApp. Our team will contact you within 24 hours.");
}

applyTheme(activeTheme);
initializeRoleDefaults();
refreshHeroMetrics();
updatePublicWebsite();

// Auto-route: if URL has /admin or #admin, go straight to login with Platform Admin
if (isPlatformAdminRoute()) {
  showAuthPage();
}

// Sync from Supabase on app startup
syncFromSupabase();
