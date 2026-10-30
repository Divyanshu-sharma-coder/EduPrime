create or replace function public.is_developer()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and role = 'developer'
  );
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and role in ('admin', 'developer')
  );
$$;

create or replace function public.is_teacher_or_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and role in ('teacher', 'admin', 'developer')
  );
$$;

create table public.platform_activity (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid not null references public.profiles(id) on delete restrict,
  action text not null,
  target_user_id uuid references public.profiles(id) on delete set null,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.platform_activity enable row level security;

create policy "admins read platform activity"
on public.platform_activity for select to authenticated
using (public.is_admin());

create table public.platform_settings (
  id boolean primary key default true check (id),
  emergency_lock boolean not null default false,
  updated_by uuid references public.profiles(id) on delete set null,
  updated_at timestamptz not null default now()
);

insert into public.platform_settings (id, emergency_lock)
values (true, false)
on conflict (id) do nothing;

alter table public.platform_settings enable row level security;

create policy "platform emergency state is readable"
on public.platform_settings for select to anon, authenticated
using (true);

create or replace function public.set_emergency_lock(locked boolean)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_developer() then
    raise exception 'Only developers can change emergency mode';
  end if;

  update public.platform_settings
  set emergency_lock = locked, updated_by = (select auth.uid()), updated_at = now()
  where id = true;

  insert into public.platform_activity (actor_id, action, details)
  values (
    (select auth.uid()),
    case when locked then 'emergency_lock_enabled' else 'emergency_lock_disabled' end,
    jsonb_build_object('emergency_lock', locked)
  );

  return locked;
end;
$$;

create or replace function public.set_user_role(target_user_id uuid, requested_role public.user_role)
returns public.user_role
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_role public.user_role;
  previous_role public.user_role;
begin
  select role into actor_role from public.profiles where id = (select auth.uid());
  if actor_role is null or actor_role not in ('admin', 'developer') then
    raise exception 'Only admins and developers can change roles';
  end if;
  if target_user_id = (select auth.uid()) then
    raise exception 'Users cannot change their own role';
  end if;
  if actor_role = 'admin' and requested_role not in ('student', 'teacher') then
    raise exception 'Admins can only assign student or teacher roles';
  end if;
  if requested_role = 'developer' and actor_role <> 'developer' then
    raise exception 'Only developers can assign the developer role';
  end if;

  select role into previous_role from public.profiles where id = target_user_id for update;
  if previous_role is null then
    raise exception 'Target profile does not exist';
  end if;

  perform set_config('eduprime.allow_role_change', 'on', true);
  update public.profiles set role = requested_role where id = target_user_id;
  insert into public.platform_activity (actor_id, action, target_user_id, details)
  values (
    (select auth.uid()),
    'user_role_changed',
    target_user_id,
    jsonb_build_object('from', previous_role, 'to', requested_role)
  );
  return requested_role;
end;
$$;

create or replace function public.prevent_direct_role_change()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  if new.role is distinct from old.role
    and coalesce(current_setting('eduprime.allow_role_change', true), '') <> 'on' then
    raise exception 'Roles can only be changed through the role management function';
  end if;
  return new;
end;
$$;

update public.profiles
set role = 'developer'
where id in (
  select id from auth.users
  where lower(email) = lower('divyanshusharma20062515@gmail.com')
);

drop trigger if exists profiles_prevent_direct_role_change on public.profiles;
create trigger profiles_prevent_direct_role_change
before update on public.profiles
for each row execute function public.prevent_direct_role_change();

drop policy if exists "users update their own profile" on public.profiles;
drop policy if exists "admins manage profiles" on public.profiles;

create policy "admins read profiles"
on public.profiles for select to authenticated
using (id = (select auth.uid()) or public.is_admin());

create policy "users update non-role profile fields"
on public.profiles for update to authenticated
using (id = (select auth.uid()) or public.is_admin())
with check (id = (select auth.uid()) or public.is_admin());

create policy "admins manage profiles"
on public.profiles for all to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "teachers manage their courses" on public.courses;
create policy "teachers manage their courses"
on public.courses for all to authenticated
using (
  public.is_teacher_or_admin()
  and (teacher_id = (select auth.uid()) or public.is_admin())
)
with check (
  public.is_teacher_or_admin()
  and (teacher_id = (select auth.uid()) or public.is_admin())
);

drop policy if exists "teachers upload course thumbnails" on storage.objects;
drop policy if exists "teachers update course thumbnails" on storage.objects;
drop policy if exists "teachers delete course thumbnails" on storage.objects;

create policy "teachers upload course thumbnails"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'course-thumbnails'
  and public.is_teacher_or_admin()
  and (public.is_admin() or (storage.foldername(name))[1] = (select auth.uid())::text)
);

create policy "teachers update course thumbnails"
on storage.objects for update to authenticated
using (
  bucket_id = 'course-thumbnails'
  and public.is_teacher_or_admin()
  and (public.is_admin() or (storage.foldername(name))[1] = (select auth.uid())::text)
)
with check (
  bucket_id = 'course-thumbnails'
  and public.is_teacher_or_admin()
  and (public.is_admin() or (storage.foldername(name))[1] = (select auth.uid())::text)
);

create policy "teachers delete course thumbnails"
on storage.objects for delete to authenticated
using (
  bucket_id = 'course-thumbnails'
  and public.is_teacher_or_admin()
  and (public.is_admin() or (storage.foldername(name))[1] = (select auth.uid())::text)
);
