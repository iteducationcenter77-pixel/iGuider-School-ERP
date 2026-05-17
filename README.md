# iGuider School ERP

iGuider School ERP is a deployed browser-based school management system with platform administration, school administration, teacher, and parent portals backed by Supabase.

## Included

- Professional public landing page
- Separate login and signup panels
- Platform Administration dashboard for managing schools
- School activate/deactivate controls
- School admin dashboard
- Class and section management
- Teacher, student, parent, subject, exam, marks, attendance, homework, fees, timetable, notice, and report modules
- Supabase schema and client configuration template

## Routes

- Public website and school login: `/`
- Platform administration: `/admin`

## Supabase Setup

1. Create a Supabase project.
2. Open the Supabase SQL editor.
3. Run `supabase-schema.sql`.
4. Copy `supabase-config.example.js` to `supabase-config.js`.
5. Replace the project URL and anon key in `supabase-config.js`.
6. Add a platform administrator in `app_users` with role `platform`, or set `PLATFORM_ADMIN_USERNAME` and `PLATFORM_ADMIN_PASSWORD` in Vercel so the first `/admin` login can create the platform user row.

Supabase is the source of truth. The app does not use browser storage for school, user, academic, fee, attendance, or platform records.

If you want the old demo school records in Supabase for review, run `supabase-demo-seed.sql` once from the Supabase SQL editor. The live app does not auto-seed demo records.

## Deployment

This is a static front-end project. Vercel runs `node build.js`, which generates `supabase-config.js` from environment variables.

- `index.html`
- `styles.css`
- `script.js`
- `supabase-config.js`

Keep `supabase-schema.sql` and `README.md` in the repository for setup and maintenance.
