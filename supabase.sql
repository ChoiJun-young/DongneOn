-- Supabase SQL Editor에서 실행. 공개 열람 + 인증 사용자 작성.
-- 이메일과 위치 좌표는 messages 테이블에 저장하지 않습니다.
create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  topic_id integer not null check (topic_id between 1 and 100),
  user_id uuid not null references auth.users(id) on delete cascade,
  nickname text not null check (char_length(nickname) between 2 and 16),
  body text not null check (char_length(btrim(body)) between 1 and 300),
  created_at timestamptz not null default now()
);
create index if not exists messages_topic_time on public.messages(topic_id, created_at desc);
create index if not exists messages_user_time on public.messages(user_id, created_at desc);

-- 클라이언트가 작성자/닉네임/시각을 조작하지 못하도록 서버에서 채웁니다.
-- 사용자별 트랜잭션 락으로 동시 전송을 직렬화하고 3초 간격을 적용합니다.
create or replace function public.prepare_chat_message()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid;
  v_nickname text;
begin
  v_uid := auth.uid();
  if v_uid is null then raise exception 'Login required'; end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(v_uid::text, 0));
  if exists (select 1 from public.messages where user_id = v_uid and created_at > pg_catalog.clock_timestamp() - interval '3 seconds') then
    raise exception 'Please wait 3 seconds between messages';
  end if;
  select pg_catalog.left(pg_catalog.btrim(coalesce(raw_user_meta_data->>'nickname','동네이웃')),16)
    into v_nickname from auth.users where id=v_uid;
  if v_nickname is null or pg_catalog.char_length(v_nickname)<2 then v_nickname := '동네이웃'; end if;
  new.user_id := v_uid;
  new.nickname := v_nickname;
  new.body := pg_catalog.btrim(new.body);
  new.created_at := pg_catalog.clock_timestamp();
  return new;
end;
$$;
revoke all on function public.prepare_chat_message() from public, anon, authenticated;
drop trigger if exists prepare_chat_message on public.messages;
create trigger prepare_chat_message before insert on public.messages
for each row execute function public.prepare_chat_message();

alter table public.messages enable row level security;
revoke all on public.messages from public, anon, authenticated;
grant select on public.messages to anon, authenticated;
grant insert (topic_id, body) on public.messages to authenticated;
drop policy if exists messages_public_read on public.messages;
create policy messages_public_read on public.messages for select to anon, authenticated using (true);
drop policy if exists messages_authenticated_insert on public.messages;
create policy messages_authenticated_insert on public.messages for insert to authenticated with check (auth.uid() = user_id);
-- UPDATE/DELETE 권한은 부여하지 않습니다. 운영자 삭제는 Supabase 관리 화면에서 처리합니다.

do $$
begin
  if not exists (select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='messages') then
    alter publication supabase_realtime add table public.messages;
  end if;
end $$;
