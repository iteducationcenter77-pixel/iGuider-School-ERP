# iGuider School ERP

iGuider School ERP is a browser-based school management system prototype with platform administration, school administration, teacher, and parent portals.

## Included

- Professional public landing page
- Separate login and signup panels
- Platform Administration dashboard for managing schools
- School activate/deactivate controls
- School admin dashboard
- Class and section management
- Teacher, student, parent, subject, exam, marks, attendance, homework, fees, timetable, notice, and report modules
- Supabase schema and client configuration template

## Local Run

Open `index.html` in a browser.

Default local credentials:

- Platform Administration: `platform` / `admin123`
- School Admin: `admin` / `admin123`
- Teacher: `anita` / `teach123`
- Parent: `parent1` / `parent123`

## Supabase Setup

1. Create a Supabase project.
2. Open the Supabase SQL editor.
3. Run `supabase-schema.sql`.
4. Copy `supabase-config.example.js` to `supabase-config.js`.
5. Replace the project URL and anon key in `supabase-config.js`.
6. Update `index.html` to load `supabase-config.js` instead of `supabase-config.example.js` before deployment.

The current front-end keeps local browser persistence as a fallback. The schema is ready for connecting the UI modules to Supabase tables.

## Deployment

This is a static front-end project. Deploy the following files to any static hosting provider:

- `index.html`
- `styles.css`
- `script.js`
- `supabase-config.js`

Keep `supabase-schema.sql` and `README.md` in the repository for setup and maintenance.

