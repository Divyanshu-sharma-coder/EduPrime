alter table public.materials
  add column if not exists title text,
  add column if not exists file_name text,
  add column if not exists file_type text,
  add column if not exists storage_path text,
  add column if not exists file_size bigint,
  add column if not exists updated_at timestamptz not null default now();

update public.materials
set
  title = coalesce(nullif(title, ''), 'Study material'),
  file_name = coalesce(nullif(file_name, ''), file_url),
  file_type = coalesce(
    nullif(file_type, ''),
    case type
      when 'pdf' then 'application/pdf'
      when 'ppt' then 'application/vnd.ms-powerpoint'
      when 'doc' then 'application/msword'
      else 'application/octet-stream'
    end
  )
where nullif(title, '') is null or nullif(file_name, '') is null or nullif(file_type, '') is null;

alter table public.materials
  alter column title set default 'Study material',
  alter column title set not null,
  alter column file_name set not null,
  alter column file_type set not null,
  add constraint materials_file_size_valid check (file_size is null or file_size > 0),
  add constraint materials_file_type_valid check (
    file_type in (
      'application/pdf',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/octet-stream'
    )
  );

drop trigger if exists materials_set_updated_at on public.materials;
create trigger materials_set_updated_at
before update on public.materials
for each row execute function public.set_updated_at();

insert into storage.buckets (id, name, public)
values ('study-materials', 'study-materials', false)
on conflict (id) do update set public = false;

drop policy if exists "course members read materials" on public.materials;
drop policy if exists "course teachers manage materials" on public.materials;

create policy "enrolled members read materials"
on public.materials for select to authenticated
using (
  exists (
    select 1
    from public.courses c
    where c.id = course_id
      and (
        public.is_admin()
        or c.teacher_id = (select auth.uid())
        or (
          c.status = 'published'
          and exists (
            select 1
            from public.enrollments e
            where e.course_id = c.id
              and e.user_id = (select auth.uid())
              and e.status = 'active'
              and (e.expires_at is null or e.expires_at > now())
          )
        )
      )
  )
);

create policy "course staff manage materials"
on public.materials for all to authenticated
using (
  exists (
    select 1
    from public.courses c
    where c.id = course_id
      and (c.teacher_id = (select auth.uid()) or public.is_admin())
  )
)
with check (
  exists (
    select 1
    from public.courses c
    where c.id = course_id
      and (c.teacher_id = (select auth.uid()) or public.is_admin())
  )
);

drop policy if exists "study materials teachers can upload" on storage.objects;
drop policy if exists "study materials authorized users can read" on storage.objects;
drop policy if exists "study materials staff can update" on storage.objects;
drop policy if exists "study materials staff can delete" on storage.objects;

create policy "study materials teachers can upload"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'study-materials'
  and public.is_teacher_or_admin()
  and (storage.foldername(name))[1] ~ '^[0-9a-f-]{36}$'
  and (storage.foldername(name))[2] ~ '^[0-9a-f-]{36}$'
  and exists (
    select 1
    from public.lessons l
    join public.modules m on m.id = l.module_id
    join public.courses c on c.id = m.course_id
    where c.id = ((storage.foldername(name))[1])::uuid
      and l.id = ((storage.foldername(name))[2])::uuid
      and (c.teacher_id = (select auth.uid()) or public.is_admin())
  )
);

create policy "study materials authorized users can read"
on storage.objects for select to authenticated
using (
  bucket_id = 'study-materials'
  and exists (
    select 1
    from public.materials material
    join public.courses c on c.id = material.course_id
    where material.storage_path = name
      and (
        public.is_admin()
        or c.teacher_id = (select auth.uid())
        or (
          c.status = 'published'
          and exists (
            select 1
            from public.enrollments e
            where e.course_id = c.id
              and e.user_id = (select auth.uid())
              and e.status = 'active'
              and (e.expires_at is null or e.expires_at > now())
          )
        )
      )
  )
);

create policy "study materials staff can update"
on storage.objects for update to authenticated
using (
  bucket_id = 'study-materials'
  and exists (
    select 1
    from public.materials material
    join public.courses c on c.id = material.course_id
    where material.storage_path = name
      and (c.teacher_id = (select auth.uid()) or public.is_admin())
  )
)
with check (
  bucket_id = 'study-materials'
  and public.is_teacher_or_admin()
);

create policy "study materials staff can delete"
on storage.objects for delete to authenticated
using (
  bucket_id = 'study-materials'
  and exists (
    select 1
    from public.materials material
    join public.courses c on c.id = material.course_id
    where material.storage_path = name
      and (c.teacher_id = (select auth.uid()) or public.is_admin())
  )
);
