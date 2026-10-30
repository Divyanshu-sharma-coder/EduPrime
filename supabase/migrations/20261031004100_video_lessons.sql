alter table public.lessons
  add column if not exists mux_upload_id text,
  add column if not exists mux_asset_id text,
  add column if not exists mux_playback_id text,
  add column if not exists video_status text,
  add column if not exists video_error text,
  add column if not exists video_ready_at timestamptz;

alter table public.lessons
  add constraint lessons_video_status_valid
  check (
    video_status is null
    or video_status in ('pending', 'preparing', 'ready', 'errored')
  );

create index lessons_mux_upload_id_idx
  on public.lessons (mux_upload_id)
  where mux_upload_id is not null;

create index lessons_mux_asset_id_idx
  on public.lessons (mux_asset_id)
  where mux_asset_id is not null;
