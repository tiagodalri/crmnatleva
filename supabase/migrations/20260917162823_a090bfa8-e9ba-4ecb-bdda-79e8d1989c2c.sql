create table public.calendar_feed_tokens (
  id uuid primary key default gen_random_uuid(),
  token text not null unique,
  label text,
  created_by uuid,
  created_at timestamptz not null default now(),
  last_accessed_at timestamptz,
  revoked_at timestamptz
);
grant select, insert, update, delete on public.calendar_feed_tokens to authenticated;
grant all on public.calendar_feed_tokens to service_role;
alter table public.calendar_feed_tokens enable row level security;
create policy "Admins can view calendar feed tokens" on public.calendar_feed_tokens for select using (public.has_role(auth.uid(), 'admin'::app_role));
create policy "Admins can create calendar feed tokens" on public.calendar_feed_tokens for insert with check (public.has_role(auth.uid(), 'admin'::app_role));
create policy "Admins can update calendar feed tokens" on public.calendar_feed_tokens for update using (public.has_role(auth.uid(), 'admin'::app_role)) with check (public.has_role(auth.uid(), 'admin'::app_role));
create policy "Admins can delete calendar feed tokens" on public.calendar_feed_tokens for delete using (public.has_role(auth.uid(), 'admin'::app_role));