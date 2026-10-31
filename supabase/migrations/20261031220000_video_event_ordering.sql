alter table public.lessons
  add column if not exists video_event_created_at timestamptz;
