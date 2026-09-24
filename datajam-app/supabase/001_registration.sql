-- Run once in a NEW Supabase project's SQL editor, as postgres.
-- No service-role key is needed by the application.
create schema registration_private;
revoke all on schema registration_private from public, anon, authenticated;

create table registration_private.settings (
  id boolean primary key default true check (id),
  max_team_size integer not null default 4 check (max_team_size between 2 and 20)
);
insert into registration_private.settings default values;

create table registration_private.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null check (length(name) between 1 and 100),
  institution text not null check (length(institution) between 1 and 150),
  student_number text not null check (length(student_number) between 1 and 50),
  student_email text not null check (length(student_email) between 3 and 254),
  discord_username text not null check (length(discord_username) between 1 and 100)
);
create table registration_private.teams (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(name) between 1 and 80),
  captain_id uuid not null references registration_private.profiles(id),
  -- The first 12 UUID v4 hex characters supply 48 random bits (before version bits).
  -- The same invitation secret powers both code and link.
  invite_code text not null unique default left(replace(gen_random_uuid()::text, '-', ''),12),
  created_at timestamptz not null default now()
);
create table registration_private.members (
  user_id uuid primary key references registration_private.profiles(id),
  team_id uuid not null references registration_private.teams(id) on delete cascade,
  joined_at timestamptz not null default now()
);
create index members_team on registration_private.members(team_id);
create table registration_private.attempts (
  user_id uuid not null references auth.users(id) on delete cascade,
  bucket text not null,
  started_at timestamptz not null default now(),
  count integer not null default 1,
  primary key (user_id, bucket)
);
alter table registration_private.settings enable row level security;
alter table registration_private.profiles enable row level security;
alter table registration_private.teams enable row level security;
alter table registration_private.members enable row level security;
alter table registration_private.attempts enable row level security;
revoke all on all tables in schema registration_private from public, anon, authenticated;

create function public.registration_action(action text, payload jsonb default '{}'::jsonb)
returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  tid uuid;
  target uuid;
  t registration_private.teams%rowtype;
  p registration_private.profiles%rowtype;
  cap integer;
  n integer;
  attempt_count integer;
  new_name text;
  roster jsonb;
  team_json jsonb;
begin
  if uid is null or not exists (select 1 from auth.users where id = uid and email_confirmed_at is not null) then
    raise exception 'Sign in with a verified login email first.';
  end if;
  if action not in ('me','profile','create','join','rename','rotate','remove','transfer','leave') or action is null then
    raise exception 'Unknown action';
  end if;
  if payload is null or jsonb_typeof(payload) <> 'object' or octet_length(payload::text) > 8192 then
    raise exception 'Invalid request';
  end if;

  -- Event-scale serialization keeps cross-team membership and captain changes atomic.
  -- This transaction lock is also taken by reads for a coherent response.
  perform pg_advisory_xact_lock(20260923, 1);
  select max_team_size into cap from registration_private.settings where id;
  select * into p from registration_private.profiles where id = uid;
  select team_id into tid from registration_private.members where user_id = uid;
  if tid is not null then select * into t from registration_private.teams where id = tid; end if;

  if action <> 'me' then
    insert into registration_private.attempts(user_id, bucket) values (uid, 'writes')
    on conflict (user_id, bucket) do update set
      count = case when registration_private.attempts.started_at < now() - interval '15 minutes' then 1 else registration_private.attempts.count + 1 end,
      started_at = case when registration_private.attempts.started_at < now() - interval '15 minutes' then now() else registration_private.attempts.started_at end
    returning count into attempt_count;
    if attempt_count > 100 then return jsonb_build_object('error', 'Too many attempts. Try again in 15 minutes.'); end if;
  end if;

  -- Return expected failures instead of raising so attempt counters commit.
  if action = 'profile' then
    if coalesce(length(trim(payload->>'name')),0) not between 1 and 100
      or coalesce(length(trim(payload->>'institution')),0) not between 1 and 150
      or coalesce(length(trim(payload->>'student_number')),0) not between 1 and 50
      or coalesce(length(trim(payload->>'discord_username')),0) not between 1 and 100
      or coalesce(length(trim(payload->>'student_email')),0) not between 3 and 254
      or coalesce(trim(payload->>'student_email'),'') !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
    then return jsonb_build_object('error', 'Complete all profile fields with a valid student email.'); end if;
    insert into registration_private.profiles values (
      uid, trim(payload->>'name'), trim(payload->>'institution'), trim(payload->>'student_number'), lower(trim(payload->>'student_email')), trim(payload->>'discord_username')
    ) on conflict (id) do update set name = excluded.name, institution = excluded.institution,
      student_number = excluded.student_number, student_email = excluded.student_email, discord_username = excluded.discord_username;
  elsif action <> 'me' then
    if p.id is null then return jsonb_build_object('error', 'Complete your profile first.'); end if;
    if action in ('create','join') then
      if tid is not null then return jsonb_build_object('error', 'Leave your current team before creating or joining another.'); end if;
      if action = 'create' then
        new_name := trim(payload->>'name');
        if coalesce(length(new_name),0) not between 1 and 80 then return jsonb_build_object('error', 'Team name must be 1–80 characters.'); end if;
        insert into registration_private.teams(name, captain_id) values (new_name, uid) returning id into tid;
      else
        insert into registration_private.attempts(user_id, bucket) values (uid, 'join')
        on conflict (user_id, bucket) do update set
          count = case when registration_private.attempts.started_at < now() - interval '15 minutes' then 1 else registration_private.attempts.count + 1 end,
          started_at = case when registration_private.attempts.started_at < now() - interval '15 minutes' then now() else registration_private.attempts.started_at end
        returning count into attempt_count;
        if attempt_count > 10 then return jsonb_build_object('error', 'Too many attempts. Try again in 15 minutes.'); end if;
        select id into tid from registration_private.teams where invite_code = lower(trim(payload->>'code'));
        if tid is null then return jsonb_build_object('error', 'Invalid or expired invitation code.'); end if;
        select count(*) into n from registration_private.members where team_id = tid;
        if n >= cap then return jsonb_build_object('error', 'This team is full.'); end if;
      end if;
      insert into registration_private.members(user_id, team_id) values (uid, tid);
    else
      if tid is null then return jsonb_build_object('error', 'You are not on a team.'); end if;
      if action <> 'leave' and t.captain_id <> uid then return jsonb_build_object('error', 'Only the captain can do that.'); end if;
      case action
        when 'rename' then
          new_name := trim(payload->>'name');
          if coalesce(length(new_name),0) not between 1 and 80 then return jsonb_build_object('error', 'Team name must be 1–80 characters.'); end if;
          update registration_private.teams set name = new_name where id = tid;
        when 'rotate' then
          update registration_private.teams set invite_code = left(replace(gen_random_uuid()::text, '-', ''),12) where id = tid;
        when 'remove', 'transfer' then
          if coalesce(payload->>'user_id','') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then return jsonb_build_object('error', 'Select a current teammate.'); end if;
          target := (payload->>'user_id')::uuid;
          if target = uid or not exists (select 1 from registration_private.members where user_id = target and team_id = tid) then return jsonb_build_object('error', 'Select another current teammate.'); end if;
          if action = 'remove' then
            delete from registration_private.members where user_id = target;
            -- Rotate on removal so the removed member cannot reuse a saved invitation.
            update registration_private.teams set invite_code = left(replace(gen_random_uuid()::text, '-', ''),12) where id = tid;
          else update registration_private.teams set captain_id = target where id = tid;
          end if;
        when 'leave' then
          select count(*) into n from registration_private.members where team_id = tid;
          if t.captain_id = uid and n > 1 then return jsonb_build_object('error', 'Transfer captaincy before leaving.'); end if;
          delete from registration_private.members where user_id = uid;
          if n = 1 then delete from registration_private.teams where id = tid; end if;
        else return jsonb_build_object('error', 'Unknown action');
      end case;
    end if;
  end if;

  select * into p from registration_private.profiles where id = uid;
  select team_id into tid from registration_private.members where user_id = uid;
  if tid is not null then
    select * into t from registration_private.teams where id = tid;
    select jsonb_agg(jsonb_build_object('id', pr.id, 'name', pr.name, 'discord_username', pr.discord_username) order by m.joined_at, pr.id)
      into roster from registration_private.members m join registration_private.profiles pr on pr.id = m.user_id where m.team_id = tid;
    team_json := jsonb_build_object('id',t.id,'name',t.name,'captain_id',t.captain_id,'invite_code',t.invite_code,'members',roster);
  end if;
  return jsonb_build_object(
    'user_id', uid, 'profile', case when p.id is null then null else to_jsonb(p) end,
    'team', team_json, 'max_team_size', cap,
    'permissions', jsonb_build_object('manage_team', coalesce(tid is not null and t.captain_id = uid,false)),
    'next_step', case when p.id is null then 'complete_profile' when tid is null then 'choose_team' else 'team_portal' end
  );
end;
$$;
revoke all on function public.registration_action(text,jsonb) from public, anon;
grant execute on function public.registration_action(text,jsonb) to authenticated;

-- Change capacity later (existing teams are not automatically reduced):
-- update registration_private.settings set max_team_size = 3 where id;
