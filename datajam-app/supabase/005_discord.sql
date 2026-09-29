-- Apply after 004. Discord credentials and tables are never exposed to participants.
begin;
create table registration_private.discord_links (
  user_id uuid primary key,
  discord_id text not null unique check (discord_id ~ '^[0-9]{17,20}$'),
  synced_team_id uuid,
  needs_reconnect boolean not null default true
);
-- No cascading FK: retain identity/resources long enough to revoke access after deletion.
create table registration_private.discord_teams (
  team_id uuid primary key,
  role_id text,
  channel_id text
);
create table registration_private.discord_states (
  user_id uuid primary key references auth.users(id) on delete cascade,
  state_hash text not null,
  expires_at timestamptz not null
);
create table registration_private.discord_jobs (
  kind text not null check (kind in ('team','user')),
  id uuid not null,
  revision bigint not null default 1,
  attempts integer not null default 0,
  available_at timestamptz not null default now(),
  last_error text,
  primary key(kind,id)
);
create table registration_private.discord_worker (
  singleton boolean primary key default true check(singleton),
  token uuid,
  expires_at timestamptz not null default now()
);
insert into registration_private.discord_worker default values;
alter table registration_private.discord_links enable row level security;
alter table registration_private.discord_teams enable row level security;
alter table registration_private.discord_states enable row level security;
alter table registration_private.discord_jobs enable row level security;
alter table registration_private.discord_worker enable row level security;
revoke all on registration_private.discord_links, registration_private.discord_teams,
  registration_private.discord_states, registration_private.discord_jobs, registration_private.discord_worker
  from public, anon, authenticated;

create function registration_private.discord_enqueue(k text, i uuid) returns void
language sql security definer set search_path = '' as $$
  insert into registration_private.discord_jobs(kind,id) values(k,i)
  on conflict(kind,id) do update set revision = registration_private.discord_jobs.revision + 1,
    available_at = now(), attempts = 0, last_error = null;
$$;
revoke all on function registration_private.discord_enqueue(text,uuid) from public, anon, authenticated;

create function registration_private.discord_changed() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if TG_TABLE_NAME = 'teams' then
    perform registration_private.discord_enqueue('team', case when TG_OP = 'DELETE' then old.id else new.id end);
  else
    if TG_OP <> 'INSERT' then perform registration_private.discord_enqueue('user', old.user_id); end if;
    if TG_OP <> 'DELETE' then perform registration_private.discord_enqueue('user', new.user_id); end if;
  end if;
  return null;
end;
$$;
revoke all on function registration_private.discord_changed() from public, anon, authenticated;
create trigger discord_team_change after insert or update or delete on registration_private.teams
  for each row execute function registration_private.discord_changed();
create trigger discord_member_change after insert or update or delete on registration_private.members
  for each row execute function registration_private.discord_changed();
insert into registration_private.discord_jobs(kind,id) select 'team',id from registration_private.teams;

-- Caller-authenticated RPC: derives identity and team exclusively from auth.uid().
create function public.discord_user(action text, payload jsonb default '{}') returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := auth.uid(); tid uuid; link registration_private.discord_links%rowtype;
  channel text; n integer;
begin
  if uid is null or not exists(select 1 from auth.users where id = uid and email_confirmed_at is not null) then
    raise exception 'Sign in with a verified login email first.';
  end if;
  perform pg_advisory_xact_lock(20260923,1);
  select team_id into tid from registration_private.members where user_id = uid;
  select * into link from registration_private.discord_links where user_id = uid;
  if action = 'status' then
    select channel_id into channel from registration_private.discord_teams where team_id = tid;
    return jsonb_build_object('connected', link.discord_id is not null,
      'needs_reconnect', coalesce(link.needs_reconnect,false), 'has_team', tid is not null,
      'channel_id', case when tid is not null and link.synced_team_id = tid and not link.needs_reconnect
        and not exists(select 1 from registration_private.discord_jobs where kind = 'user' and id = uid)
        then channel else null end);
  elsif action = 'start' then
    if tid is null then raise exception 'Join an app team first.'; end if;
    if coalesce(payload->>'state_hash','') !~ '^[a-f0-9]{64}$' then raise exception 'Invalid state'; end if;
    insert into registration_private.attempts(user_id,bucket) values(uid,'discord')
    on conflict(user_id,bucket) do update set
      count = case when registration_private.attempts.started_at < now() - interval '15 minutes' then 1 else registration_private.attempts.count + 1 end,
      started_at = case when registration_private.attempts.started_at < now() - interval '15 minutes' then now() else registration_private.attempts.started_at end
    returning count into n;
    if n > 10 then return jsonb_build_object('error','Too many Discord attempts. Try again in 15 minutes.'); end if;
    insert into registration_private.discord_states values(uid,payload->>'state_hash',now() + interval '10 minutes')
    on conflict(user_id) do update set state_hash = excluded.state_hash, expires_at = excluded.expires_at;
    return '{}'::jsonb;
  elsif action = 'consume' then
    delete from registration_private.discord_states where user_id = uid and state_hash = payload->>'state_hash' and expires_at > now();
    if not found then raise exception 'Discord authorization expired or was already used. Try connecting again.'; end if;
    if tid is null then raise exception 'Join an app team first.'; end if;
    return jsonb_build_object('user_id',uid);
  else raise exception 'Unknown Discord action';
  end if;
end;
$$;
revoke all on function public.discord_user(text,jsonb) from public, anon;
grant execute on function public.discord_user(text,jsonb) to authenticated;

-- Only backend service_role may invoke this RPC. No direct private-schema exposure.
create function public.discord_service(action text, payload jsonb default '{}') returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := (payload->>'user_id')::uuid;
  tid uuid := (payload->>'team_id')::uuid;
  tok uuid := (payload->>'token')::uuid;
  j registration_private.discord_jobs%rowtype;
  result jsonb;
begin
  perform pg_advisory_xact_lock(20260923,1);
  if action = 'link' then
    if not exists(select 1 from registration_private.members where user_id = uid) then raise exception 'Join an app team first.'; end if;
    if exists(select 1 from registration_private.discord_links where user_id = uid and discord_id <> payload->>'discord_id') then
      raise exception 'Use the Discord account you originally connected. Contact an organizer to change accounts.';
    end if;
    if exists(select 1 from registration_private.discord_links where discord_id = payload->>'discord_id' and user_id <> uid) then
      raise exception 'This Discord account is already connected to another registration.';
    end if;
    insert into registration_private.discord_links(user_id,discord_id) values(uid,payload->>'discord_id') on conflict(user_id) do nothing;
    perform registration_private.discord_enqueue('user',uid);
    return '{}'::jsonb;
  elsif action = 'joined' then
    update registration_private.discord_links set needs_reconnect = false where user_id = uid;
    perform registration_private.discord_enqueue('user',uid);
    return '{}'::jsonb;
  elsif action = 'claim' then
    update registration_private.discord_worker set token = tok, expires_at = now() + interval '2 minutes'
      where singleton and expires_at <= now();
    if not found then return jsonb_build_object('busy',true); end if;
    select * into j from registration_private.discord_jobs where available_at <= now()
      order by available_at, kind, id limit 1;
    if not found then
      update registration_private.discord_worker set expires_at = now(), token = null where singleton;
      return '{}'::jsonb;
    end if;
    -- A crashed invocation cannot cause immediate hot retries.
    update registration_private.discord_jobs set available_at = now() + interval '2 minutes' where kind = j.kind and id = j.id;
    return to_jsonb(j);
  end if;
  if not exists(select 1 from registration_private.discord_worker where singleton and token = tok and expires_at > now()) then
    raise exception 'Discord worker lease expired';
  end if;
  if action = 'context' then
    if payload->>'kind' = 'team' then
      return jsonb_build_object('team', (select to_jsonb(t) from registration_private.teams t where id = tid),
        'resource',(select to_jsonb(d) from registration_private.discord_teams d where team_id = tid));
    end if;
    select team_id into tid from registration_private.members where user_id = uid;
    return jsonb_build_object('link',(select to_jsonb(l) from registration_private.discord_links l where user_id = uid),
      'team_id',tid, 'resource',(select to_jsonb(d) from registration_private.discord_teams d where team_id = tid),
      'roles',(select coalesce(jsonb_agg(role_id),'[]') from registration_private.discord_teams where role_id is not null));
  elsif action = 'save_team' then
    insert into registration_private.discord_teams(team_id,role_id,channel_id) values(tid,payload->>'role_id',payload->>'channel_id')
    on conflict(team_id) do update set role_id = excluded.role_id, channel_id = excluded.channel_id;
    perform registration_private.discord_enqueue('user',user_id) from registration_private.members where team_id = tid;
  elsif action = 'save_user' then
    update registration_private.discord_links set synced_team_id = tid, needs_reconnect = (payload->>'needs_reconnect')::boolean where user_id = uid;
  elsif action = 'finish' then
    if payload->>'error' is null then
      delete from registration_private.discord_jobs where kind = payload->>'kind' and id = (payload->>'id')::uuid and revision = (payload->>'revision')::bigint;
    else
      update registration_private.discord_jobs set attempts = attempts + 1, last_error = left(payload->>'error',200),
        available_at = now() + make_interval(secs => greatest(least(3600, 5 * power(2,least(attempts,10)))::int, least(86400,coalesce((payload->>'retry_after')::int,0))))
        where kind = payload->>'kind' and id = (payload->>'id')::uuid and revision = (payload->>'revision')::bigint;
    end if;
    -- Conservatively honor Discord Retry-After across all jobs, including global limits.
    update registration_private.discord_worker set expires_at = now() + make_interval(secs => least(86400,greatest(0,coalesce((payload->>'retry_after')::int,0)))), token = null where singleton;
  else raise exception 'Unknown Discord service action';
  end if;
  return '{}'::jsonb;
end;
$$;
revoke all on function public.discord_service(text,jsonb) from public, anon, authenticated;
grant execute on function public.discord_service(text,jsonb) to service_role;
commit;
