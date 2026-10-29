-- =====================================================================
-- Admin migration — run AFTER schema.sql (SQL Editor -> New query -> Run)
-- Adds: 'admin' role, event venue/description/status, admin RLS policies,
--       admin_create_user / admin_delete_user functions.
-- Safe to re-run.
-- =====================================================================

-- 1. ROLE: allow 'admin' -------------------------------------------------
alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles
  add constraint profiles_role_check check (role in ('student','teacher','admin'));

-- 2. EVENTS: venue, description, status ----------------------------------
alter table public.events add column if not exists venue       text;
alter table public.events add column if not exists description text;
alter table public.events add column if not exists status      text not null default 'open';
alter table public.events drop constraint if exists events_status_check;
alter table public.events
  add constraint events_status_check check (status in ('open','closed'));

-- 3. HELPER: is the current user an admin? -------------------------------
-- SECURITY DEFINER so policies on profiles can call it without recursion.
create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public
as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;

-- 4. SECURITY: nobody can promote themselves ------------------------------
-- Only an admin (or the SQL Editor, where auth.uid() is null) may change a role.
create or replace function public.protect_profile_role()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  if new.role is distinct from old.role
     and auth.uid() is not null
     and not public.is_admin() then
    raise exception 'Only an administrator can change roles';
  end if;
  return new;
end;
$$;
drop trigger if exists protect_role on public.profiles;
create trigger protect_role before update on public.profiles
  for each row execute procedure public.protect_profile_role();

-- Signup can only ever create student/teacher (blocks role=admin in metadata)
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public
as $$
declare r text := coalesce(new.raw_user_meta_data ->> 'role', 'student');
begin
  if r not in ('student','teacher') then r := 'student'; end if;
  insert into public.profiles (id, email, full_name, role)
  values (new.id, new.email, new.raw_user_meta_data ->> 'full_name', r);
  return new;
end;
$$;

-- 5. ADMIN POLICIES --------------------------------------------------------
drop policy if exists "Admins manage profiles" on public.profiles;
create policy "Admins manage profiles" on public.profiles
  for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "Admins manage events" on public.events;
create policy "Admins manage events" on public.events
  for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "Admins manage attendance" on public.attendance;
create policy "Admins manage attendance" on public.attendance
  for all using (public.is_admin()) with check (public.is_admin());

-- 6. CLOSED EVENTS: students can no longer scan into them -----------------
drop policy if exists "Students can insert their own attendance" on public.attendance;
create policy "Students can insert their own attendance"
  on public.attendance for insert
  with check (
    auth.uid() = student_id
    and exists (select 1 from public.events e where e.id = event_id and e.status = 'open')
  );

-- 7. ADMIN FUNCTIONS: create / delete real auth users ---------------------
create or replace function public.admin_create_user(
  p_email text, p_password text, p_full_name text, p_role text
) returns uuid language plpgsql security definer set search_path = public, auth, extensions
as $$
declare new_id uuid := gen_random_uuid();
begin
  if not public.is_admin() then raise exception 'Admins only'; end if;
  if p_role not in ('student','teacher','admin') then raise exception 'Invalid role'; end if;
  if length(coalesce(p_password,'')) < 6 then raise exception 'Password must be at least 6 characters'; end if;
  if exists (select 1 from auth.users where lower(email) = lower(p_email)) then
    raise exception 'Email already registered';
  end if;

  insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
    confirmation_token, email_change, email_change_token_new, recovery_token
  ) values (
    '00000000-0000-0000-0000-000000000000', new_id, 'authenticated', 'authenticated',
    lower(p_email), crypt(p_password, gen_salt('bf')), now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    jsonb_build_object('full_name', p_full_name, 'role', p_role),
    now(), now(), '', '', '', ''
  );

  insert into auth.identities (
    id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at
  ) values (
    gen_random_uuid(), new_id,
    jsonb_build_object('sub', new_id::text, 'email', lower(p_email), 'email_verified', true),
    'email', new_id::text, now(), now(), now()
  );

  -- the signup trigger only allows student/teacher, so set the final role here
  update public.profiles set role = p_role, full_name = p_full_name where id = new_id;
  return new_id;
end;
$$;

create or replace function public.admin_delete_user(p_user_id uuid)
returns void language plpgsql security definer set search_path = public, auth
as $$
begin
  if not public.is_admin() then raise exception 'Admins only'; end if;
  if p_user_id = auth.uid() then raise exception 'You cannot delete your own account'; end if;
  delete from auth.users where id = p_user_id;  -- cascades to profiles + attendance
end;
$$;

revoke all on function public.admin_create_user(text,text,text,text) from public, anon;
revoke all on function public.admin_delete_user(uuid) from public, anon;
grant execute on function public.admin_create_user(text,text,text,text) to authenticated;
grant execute on function public.admin_delete_user(uuid) to authenticated;

-- =====================================================================
-- MAKE YOUR FIRST ADMIN: sign up in the app first, then run (edit email):
--   update public.profiles set role = 'admin' where email = 'you@school.edu';
-- =====================================================================
