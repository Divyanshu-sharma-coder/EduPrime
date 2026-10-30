alter table public.courses
  add column if not exists short_description text;

update public.courses
set short_description = left(description, 180)
where short_description is null;

alter table public.courses
  alter column short_description set default '',
  alter column short_description set not null;

drop policy if exists "public can read published modules" on public.modules;
create policy "public can read published modules"
on public.modules for select to anon, authenticated
using (
  exists (
    select 1
    from public.courses c
    where c.id = course_id
      and c.status = 'published'
  )
);

drop policy if exists "public can read published lessons" on public.lessons;
create policy "public can read published lessons"
on public.lessons for select to anon, authenticated
using (
  exists (
    select 1
    from public.modules m
    join public.courses c on c.id = m.course_id
    where m.id = module_id
      and c.status = 'published'
  )
);

drop view if exists public.published_course_catalog;
create view public.published_course_catalog
with (security_invoker = false)
as
select
  c.id,
  c.slug,
  c.title,
  c.short_description,
  c.description,
  c.thumbnail,
  c.price,
  c.level,
  c.language,
  c.category_id,
  c.teacher_id,
  coalesce(nullif(p.name, ''), 'EduPrime instructor') as teacher_name,
  c.status,
  c.created_at,
  c.updated_at
from public.courses c
left join public.profiles p on p.id = c.teacher_id
where c.status = 'published';

grant select on public.published_course_catalog to anon, authenticated;
