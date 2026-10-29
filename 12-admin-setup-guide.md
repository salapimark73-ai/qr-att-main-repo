# Admin Profile — Setup Guide (Supabase + Expo SDK 54)

## 1. How your database fits together

| Table | Where | What it holds |
|---|---|---|
| **users** (`auth.users`) | Built into Supabase Auth | Email + password. You never create this table; Supabase manages it. |
| **profiles** | `public.profiles` | One row per user: `full_name`, `role` (`student` / `teacher` / `admin`). Linked to `auth.users` by `id`. |
| **events** | `public.events` | `event_code`, `title`, `venue`, `description`, `status` (`open`/`closed`), `start_time`, `end_time`. |
| **attendance** | `public.attendance` | `student_id` + `event_id` + `scanned_at` (one row per student per event). |

A trigger (`handle_new_user`) automatically creates the `profiles` row whenever a row appears in `auth.users`. That is how every user ends up visible in the Admin screens.

## 2. Create the tables (one time)

1. Open your Supabase project → **SQL Editor** → **New query**.
2. Paste the contents of `supabase/schema.sql` → **Run** (skip if you already ran it).
3. New query → paste `supabase/admin-migration.sql` → **Run**.

This adds the `admin` role, event venue/description/status, admin permissions, and two functions (`admin_create_user`, `admin_delete_user`).

## 3. Create users

**Way A — in the app (easiest):** sign up through the Register screen. A `profiles` row is created automatically and appears under *Admin → Manage Users*.

**Way B — in the Supabase dashboard:** *Authentication → Users → Add user → Create new user* (tick *Auto Confirm User*). The trigger creates the profile as `student`.

**Way C — from the Admin profile:** *Admin → Manage Users → Add User* (name, email, password, role). It calls `admin_create_user`, which inserts into `auth.users` + `profiles` in one step.

## 4. Make your first admin

1. Register normally in the app with the email you want as admin.
2. In the SQL Editor run (change the email):

```sql
update public.profiles set role = 'admin' where email = 'you@school.edu';
```

3. Sign out and sign in again. You will land on the **Admin** tab.

Check it worked:

```sql
select id, email, full_name, role from public.profiles;
```

## 5. What the admin can do

| Guide requirement | Where in the app |
|---|---|
| Manage users | Admin → Manage Users: search, filter by role, add, edit name/role, delete |
| Manage events | Admin → Manage Events: create, edit, view details + attendees, close/reopen, show QR, delete |
| View overall attendance | Admin → Overall Attendance: all records, filter by event, search student |
| Manage or correct attendance | Same screen: add a record manually, delete a wrong one |
| View system records/reports | Admin → Reports: totals, attendance % per event, top students, Share |

Closing an event blocks students from scanning into it (enforced by a database policy). Student and teacher screens are unchanged; admins simply see the Admin and Profile tabs instead.

## 6. Run on SDK 54

```powershell
cd qr-att-main-repo-main
Remove-Item -Recurse -Force node_modules, package-lock.json -ErrorAction SilentlyContinue
npm install --legacy-peer-deps
npx expo install --fix      # aligns any patch versions with SDK 54
npx expo start -c
```

Create a `.env` file from `.env.example` with your Supabase URL and anon key.

## 7. Troubleshooting

| Problem | Fix |
|---|---|
| Admin tab missing | Your profile role isn't `admin` yet (step 4); sign out and in again. |
| "Admins only" / permission errors | `admin-migration.sql` not run, or the account isn't an admin. |
| Add User says "Email already registered" | That email exists in Authentication → Users. |
| Student sees a "row-level security" error when scanning | The event is closed (expected). |
| Add User works but login fails | Re-run `admin-migration.sql` and try again with a 6+ character password. |
