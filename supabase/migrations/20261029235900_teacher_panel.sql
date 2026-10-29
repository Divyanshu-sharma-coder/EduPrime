insert into storage.buckets (id, name, public)
values ('course-thumbnails', 'course-thumbnails', true)
on conflict (id) do update set public = excluded.public;

create policy "teachers upload course thumbnails"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'course-thumbnails'
  and public.is_teacher_or_admin()
);

create policy "teachers update course thumbnails"
on storage.objects for update to authenticated
using (
  bucket_id = 'course-thumbnails'
  and public.is_teacher_or_admin()
)
with check (
  bucket_id = 'course-thumbnails'
  and public.is_teacher_or_admin()
);

create policy "teachers delete course thumbnails"
on storage.objects for delete to authenticated
using (
  bucket_id = 'course-thumbnails'
  and public.is_teacher_or_admin()
);
