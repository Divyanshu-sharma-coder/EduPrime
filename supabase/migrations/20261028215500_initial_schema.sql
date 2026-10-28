create extension if not exists "pgcrypto";

create type public.user_role as enum ('student', 'teacher', 'admin');
create type public.course_status as enum ('draft', 'published', 'archived');
create type public.enrollment_status as enum ('active', 'expired', 'cancelled');
create type public.question_type as enum ('single', 'multiple', 'numeric', 'true_false');
create type public.payment_status as enum ('pending', 'paid', 'failed', 'refunded');
create type public.material_type as enum ('pdf', 'ppt', 'doc', 'image', 'link');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role public.user_role not null default 'student',
  name text not null default '',
  avatar text,
  phone text,
  language text not null default 'English',
  exam_goal text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, name, avatar)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'name', ''),
    new.raw_user_meta_data ->> 'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and role = 'admin'
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
    where id = (select auth.uid()) and role in ('teacher', 'admin')
  );
$$;

create table public.courses (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  description text not null default '',
  thumbnail text,
  price numeric(10, 2) not null default 0 check (price >= 0),
  level text not null,
  language text not null default 'English',
  category_id text,
  teacher_id uuid not null references public.profiles(id) on delete restrict,
  status public.course_status not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger courses_set_updated_at
before update on public.courses
for each row execute function public.set_updated_at();

create table public.modules (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  title text not null,
  position integer not null default 0 check (position >= 0),
  created_at timestamptz not null default now(),
  unique (course_id, position)
);

create table public.lessons (
  id uuid primary key default gen_random_uuid(),
  module_id uuid not null references public.modules(id) on delete cascade,
  title text not null,
  video_asset_id text,
  duration integer not null default 0 check (duration >= 0),
  is_preview boolean not null default false,
  position integer not null default 0 check (position >= 0),
  created_at timestamptz not null default now(),
  unique (module_id, position)
);

create table public.materials (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  lesson_id uuid references public.lessons(id) on delete cascade,
  file_url text not null,
  type public.material_type not null,
  downloadable boolean not null default false,
  created_at timestamptz not null default now(),
  check (lesson_id is not null or course_id is not null)
);

create table public.enrollments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete cascade,
  status public.enrollment_status not null default 'active',
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  unique (user_id, course_id)
);

create table public.lesson_progress (
  user_id uuid not null references public.profiles(id) on delete cascade,
  lesson_id uuid not null references public.lessons(id) on delete cascade,
  seconds_watched integer not null default 0 check (seconds_watched >= 0),
  completed boolean not null default false,
  updated_at timestamptz not null default now(),
  primary key (user_id, lesson_id)
);

create table public.live_sessions (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  title text not null,
  starts_at timestamptz not null,
  duration integer not null default 60 check (duration > 0),
  room_id text not null unique,
  recording_asset_id text,
  created_at timestamptz not null default now()
);

create table public.attendance (
  session_id uuid not null references public.live_sessions(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  joined_at timestamptz not null default now(),
  left_at timestamptz,
  primary key (session_id, user_id, joined_at)
);

create table public.tests (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  title text not null,
  duration integer not null default 30 check (duration > 0),
  negative_marking numeric(5, 2) not null default 0 check (negative_marking >= 0),
  created_at timestamptz not null default now()
);

create table public.questions (
  id uuid primary key default gen_random_uuid(),
  test_id uuid not null references public.tests(id) on delete cascade,
  type public.question_type not null,
  body text not null,
  options jsonb not null default '[]'::jsonb,
  answer jsonb not null default 'null'::jsonb,
  explanation text,
  marks numeric(6, 2) not null default 1 check (marks > 0),
  created_at timestamptz not null default now()
);

create table public.attempts (
  id uuid primary key default gen_random_uuid(),
  test_id uuid not null references public.tests(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  score numeric(8, 2),
  started_at timestamptz not null default now(),
  submitted_at timestamptz
);

create table public.answers (
  attempt_id uuid not null references public.attempts(id) on delete cascade,
  question_id uuid not null references public.questions(id) on delete cascade,
  response jsonb not null default 'null'::jsonb,
  time_spent integer not null default 0 check (time_spent >= 0),
  primary key (attempt_id, question_id)
);

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete restrict,
  course_id uuid not null references public.courses(id) on delete restrict,
  amount numeric(10, 2) not null check (amount >= 0),
  gst numeric(10, 2) not null default 0 check (gst >= 0),
  razorpay_order_id text unique,
  status public.payment_status not null default 'pending',
  created_at timestamptz not null default now()
);

create table public.coupons (
  code text primary key,
  discount numeric(10, 2) not null check (discount >= 0),
  expires_at timestamptz,
  usage_limit integer check (usage_limit is null or usage_limit > 0),
  created_at timestamptz not null default now()
);

create table public.doubts (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null references public.lessons(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  body text not null,
  image_url text,
  created_at timestamptz not null default now()
);

create table public.doubt_replies (
  id uuid primary key default gen_random_uuid(),
  doubt_id uuid not null references public.doubts(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now()
);

create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  rating integer not null check (rating between 1 and 5),
  body text not null default '',
  created_at timestamptz not null default now(),
  unique (course_id, user_id)
);

create table public.certificates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete cascade,
  code text not null unique,
  issued_at timestamptz not null default now(),
  unique (user_id, course_id)
);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  type text not null,
  payload jsonb not null default '{}'::jsonb,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.courses enable row level security;
alter table public.modules enable row level security;
alter table public.lessons enable row level security;
alter table public.materials enable row level security;
alter table public.enrollments enable row level security;
alter table public.lesson_progress enable row level security;
alter table public.live_sessions enable row level security;
alter table public.attendance enable row level security;
alter table public.tests enable row level security;
alter table public.questions enable row level security;
alter table public.attempts enable row level security;
alter table public.answers enable row level security;
alter table public.payments enable row level security;
alter table public.coupons enable row level security;
alter table public.doubts enable row level security;
alter table public.doubt_replies enable row level security;
alter table public.reviews enable row level security;
alter table public.certificates enable row level security;
alter table public.notifications enable row level security;

create policy "profiles are visible to their owner"
on public.profiles for select to authenticated
using ((select auth.uid()) = id or public.is_admin());
create policy "users update their own profile"
on public.profiles for update to authenticated
using ((select auth.uid()) = id or public.is_admin())
with check ((select auth.uid()) = id or public.is_admin());
create policy "admins manage profiles"
on public.profiles for all to authenticated
using (public.is_admin()) with check (public.is_admin());

create policy "published courses are public"
on public.courses for select to anon, authenticated
using (status = 'published' or teacher_id = (select auth.uid()) or public.is_admin());
create policy "teachers manage their courses"
on public.courses for all to authenticated
using (teacher_id = (select auth.uid()) or public.is_admin())
with check (teacher_id = (select auth.uid()) or public.is_admin());

create policy "course members read modules"
on public.modules for select to authenticated
using (exists (select 1 from public.courses c where c.id = course_id and (c.status = 'published' or c.teacher_id = (select auth.uid()) or public.is_admin())));
create policy "course teachers manage modules"
on public.modules for all to authenticated
using (exists (select 1 from public.courses c where c.id = course_id and (c.teacher_id = (select auth.uid()) or public.is_admin())))
with check (exists (select 1 from public.courses c where c.id = course_id and (c.teacher_id = (select auth.uid()) or public.is_admin())));

create policy "course members read lessons"
on public.lessons for select to authenticated
using (exists (select 1 from public.modules m join public.courses c on c.id = m.course_id where m.id = module_id and (c.status = 'published' or c.teacher_id = (select auth.uid()) or public.is_admin())));
create policy "course teachers manage lessons"
on public.lessons for all to authenticated
using (exists (select 1 from public.modules m join public.courses c on c.id = m.course_id where m.id = module_id and (c.teacher_id = (select auth.uid()) or public.is_admin())))
with check (exists (select 1 from public.modules m join public.courses c on c.id = m.course_id where m.id = module_id and (c.teacher_id = (select auth.uid()) or public.is_admin())));

create policy "course members read materials"
on public.materials for select to authenticated
using (exists (select 1 from public.courses c where c.id = course_id and (c.status = 'published' or c.teacher_id = (select auth.uid()) or public.is_admin())));
create policy "course teachers manage materials"
on public.materials for all to authenticated
using (exists (select 1 from public.courses c where c.id = course_id and (c.teacher_id = (select auth.uid()) or public.is_admin())))
with check (exists (select 1 from public.courses c where c.id = course_id and (c.teacher_id = (select auth.uid()) or public.is_admin())));

create policy "users read their enrollments"
on public.enrollments for select to authenticated
using (user_id = (select auth.uid()) or public.is_admin() or exists (select 1 from public.courses c where c.id = course_id and c.teacher_id = (select auth.uid())));
create policy "admins manage enrollments"
on public.enrollments for all to authenticated
using (public.is_admin()) with check (public.is_admin());

create policy "users manage their progress"
on public.lesson_progress for all to authenticated
using (user_id = (select auth.uid()) or public.is_admin())
with check (user_id = (select auth.uid()) or public.is_admin());
create policy "teachers read course progress"
on public.lesson_progress for select to authenticated
using (exists (select 1 from public.lessons l join public.modules m on m.id = l.module_id join public.courses c on c.id = m.course_id where l.id = lesson_id and c.teacher_id = (select auth.uid())));

create policy "published sessions are readable"
on public.live_sessions for select to authenticated
using (exists (select 1 from public.courses c where c.id = course_id and (c.status = 'published' or c.teacher_id = (select auth.uid()) or public.is_admin())));
create policy "teachers manage sessions"
on public.live_sessions for all to authenticated
using (exists (select 1 from public.courses c where c.id = course_id and (c.teacher_id = (select auth.uid()) or public.is_admin())))
with check (exists (select 1 from public.courses c where c.id = course_id and (c.teacher_id = (select auth.uid()) or public.is_admin())));

create policy "users read attendance"
on public.attendance for select to authenticated
using (user_id = (select auth.uid()) or public.is_admin() or exists (select 1 from public.live_sessions s join public.courses c on c.id = s.course_id where s.id = session_id and c.teacher_id = (select auth.uid())));
create policy "users record own attendance"
on public.attendance for insert to authenticated
with check (user_id = (select auth.uid()));
create policy "users update own attendance"
on public.attendance for update to authenticated
using (user_id = (select auth.uid()) or public.is_admin())
with check (user_id = (select auth.uid()) or public.is_admin());
create policy "admins manage attendance"
on public.attendance for all to authenticated
using (public.is_admin()) with check (public.is_admin());

create policy "course members read tests"
on public.tests for select to authenticated
using (exists (select 1 from public.courses c where c.id = course_id and (c.status = 'published' or c.teacher_id = (select auth.uid()) or public.is_admin())));
create policy "course teachers manage tests"
on public.tests for all to authenticated
using (exists (select 1 from public.courses c where c.id = course_id and (c.teacher_id = (select auth.uid()) or public.is_admin())))
with check (exists (select 1 from public.courses c where c.id = course_id and (c.teacher_id = (select auth.uid()) or public.is_admin())));

create policy "test members read questions"
on public.questions for select to authenticated
using (exists (select 1 from public.tests t join public.courses c on c.id = t.course_id where t.id = test_id and (c.status = 'published' or c.teacher_id = (select auth.uid()) or public.is_admin())));
create policy "test teachers manage questions"
on public.questions for all to authenticated
using (exists (select 1 from public.tests t join public.courses c on c.id = t.course_id where t.id = test_id and (c.teacher_id = (select auth.uid()) or public.is_admin())))
with check (exists (select 1 from public.tests t join public.courses c on c.id = t.course_id where t.id = test_id and (c.teacher_id = (select auth.uid()) or public.is_admin())));

create policy "users manage their attempts"
on public.attempts for all to authenticated
using (user_id = (select auth.uid()) or public.is_admin())
with check (user_id = (select auth.uid()) or public.is_admin());
create policy "teachers read attempts"
on public.attempts for select to authenticated
using (exists (select 1 from public.tests t join public.courses c on c.id = t.course_id where t.id = test_id and c.teacher_id = (select auth.uid())));

create policy "attempt owners manage answers"
on public.answers for all to authenticated
using (exists (select 1 from public.attempts a where a.id = attempt_id and (a.user_id = (select auth.uid()) or public.is_admin())))
with check (exists (select 1 from public.attempts a where a.id = attempt_id and (a.user_id = (select auth.uid()) or public.is_admin())));
create policy "teachers read answers"
on public.answers for select to authenticated
using (exists (select 1 from public.attempts a join public.tests t on t.id = a.test_id join public.courses c on c.id = t.course_id where a.id = attempt_id and c.teacher_id = (select auth.uid())));

create policy "users read own payments"
on public.payments for select to authenticated
using (user_id = (select auth.uid()) or public.is_admin() or exists (select 1 from public.courses c where c.id = course_id and c.teacher_id = (select auth.uid())));
create policy "admins manage payments"
on public.payments for all to authenticated
using (public.is_admin()) with check (public.is_admin());

create policy "admins manage coupons"
on public.coupons for all to authenticated
using (public.is_admin()) with check (public.is_admin());

create policy "course members read doubts"
on public.doubts for select to authenticated
using (exists (select 1 from public.lessons l join public.modules m on m.id = l.module_id join public.courses c on c.id = m.course_id where l.id = lesson_id and (c.status = 'published' or c.teacher_id = (select auth.uid()) or public.is_admin())));
create policy "students create own doubts"
on public.doubts for insert to authenticated
with check (user_id = (select auth.uid()) and exists (select 1 from public.enrollments e where e.user_id = (select auth.uid()) and e.status = 'active' and e.course_id = (select m.course_id from public.lessons l join public.modules m on m.id = l.module_id where l.id = lesson_id)));
create policy "doubt owners update own doubts"
on public.doubts for update to authenticated
using (user_id = (select auth.uid()) or public.is_admin())
with check (user_id = (select auth.uid()) or public.is_admin());
create policy "admins manage doubts"
on public.doubts for all to authenticated
using (public.is_admin()) with check (public.is_admin());

create policy "course members read replies"
on public.doubt_replies for select to authenticated
using (exists (select 1 from public.doubts d join public.lessons l on l.id = d.lesson_id join public.modules m on m.id = l.module_id join public.courses c on c.id = m.course_id where d.id = doubt_id and (c.status = 'published' or c.teacher_id = (select auth.uid()) or public.is_admin())));
create policy "course members create replies"
on public.doubt_replies for insert to authenticated
with check (user_id = (select auth.uid()) and exists (select 1 from public.doubts d join public.lessons l on l.id = d.lesson_id join public.modules m on m.id = l.module_id join public.enrollments e on e.course_id = m.course_id where d.id = doubt_id and e.user_id = (select auth.uid()) and e.status = 'active'));
create policy "admins manage replies"
on public.doubt_replies for all to authenticated
using (public.is_admin()) with check (public.is_admin());

create policy "published course reviews are public"
on public.reviews for select to anon, authenticated
using (exists (select 1 from public.courses c where c.id = course_id and c.status = 'published') or user_id = (select auth.uid()) or public.is_admin());
create policy "enrolled users create reviews"
on public.reviews for insert to authenticated
with check (user_id = (select auth.uid()) and exists (select 1 from public.enrollments e where e.user_id = (select auth.uid()) and e.course_id = course_id and e.status = 'active'));
create policy "review owners update reviews"
on public.reviews for update to authenticated
using (user_id = (select auth.uid()) or public.is_admin())
with check (user_id = (select auth.uid()) or public.is_admin());
create policy "admins manage reviews"
on public.reviews for all to authenticated
using (public.is_admin()) with check (public.is_admin());

create policy "users read their certificates"
on public.certificates for select to authenticated
using (user_id = (select auth.uid()) or public.is_admin());
create policy "admins manage certificates"
on public.certificates for all to authenticated
using (public.is_admin()) with check (public.is_admin());

create policy "users read their notifications"
on public.notifications for select to authenticated
using (user_id = (select auth.uid()) or public.is_admin());
create policy "users update their notifications"
on public.notifications for update to authenticated
using (user_id = (select auth.uid()) or public.is_admin())
with check (user_id = (select auth.uid()) or public.is_admin());
create policy "admins manage notifications"
on public.notifications for all to authenticated
using (public.is_admin()) with check (public.is_admin());

create index courses_teacher_id_idx on public.courses (teacher_id);
create index modules_course_id_idx on public.modules (course_id);
create index lessons_module_id_idx on public.lessons (module_id);
create index enrollments_user_id_idx on public.enrollments (user_id);
create index lesson_progress_user_id_idx on public.lesson_progress (user_id);
create index live_sessions_course_id_idx on public.live_sessions (course_id);
create index tests_course_id_idx on public.tests (course_id);
create index attempts_user_id_idx on public.attempts (user_id);
create index doubts_user_id_idx on public.doubts (user_id);
create index reviews_course_id_idx on public.reviews (course_id);
create index notifications_user_id_idx on public.notifications (user_id);
