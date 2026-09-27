-- Apply once after 003_admin.sql. Existing profiles, teams and email history are preserved.
begin;
create table registration_private.admin_events (
  id uuid primary key default gen_random_uuid(),
  actor uuid not null references auth.users(id),
  action text not null,
  data jsonb not null,
  created_at timestamptz not null default now()
);
alter table registration_private.admin_events enable row level security;
revoke all on registration_private.admin_events from public, anon, authenticated;

-- Keep the existing decision/email implementation private and extend its public entry point.
alter function public.admin_action(text,jsonb) rename to admin_action_base;
revoke all on function public.admin_action_base(text,jsonb) from public, anon, authenticated;
create function public.admin_action(action text, payload jsonb default '{}'::jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := auth.uid();
  result jsonb;
  entry record;
  tid uuid;
  source_id uuid;
  target uuid;
  captain uuid;
  cap integer;
  n integer := 0;
  mail_ids jsonb := '[]'::jsonb;
begin
  result := public.admin_action_base('access', '{}');
  if action = 'access' then return result; end if;
  if not (result->>'is_admin')::boolean then raise exception 'Organizer access required.'; end if;
  if payload is null or jsonb_typeof(payload) <> 'object' or octet_length(payload::text) > 8192 then raise exception 'Invalid request'; end if;
  perform pg_advisory_xact_lock(20260923, 1);
  select max_team_size into cap from registration_private.settings where id;

  if action = 'list' then
    result := public.admin_action_base(action, payload);
    return result || jsonb_build_object('max_team_size', cap, 'teams', (
      select coalesce(jsonb_agg(to_jsonb(t) order by t.name, t.id), '[]'::jsonb)
      from registration_private.teams t
    ), 'events', (
      select coalesce(jsonb_agg(to_jsonb(e) order by e.created_at desc), '[]'::jsonb)
      from (select * from registration_private.admin_events order by created_at desc limit 100) e
    ), 'queued_emails', (
      select coalesce(jsonb_agg(id order by created_at), '[]'::jsonb) from registration_private.emails where state = 'queued'
    ));
  elsif action = 'accept_all' then
    -- Compare the preview count under the same lock, rather than accepting unseen arrivals.
    select count(*) into n from registration_private.profiles p
      left join registration_private.decisions d on d.user_id = p.id
      where coalesce(d.status, 'pending') = 'pending';
    if (payload->>'expected_count')::integer is distinct from n then
      raise exception 'Applications changed. Refresh and review the pending count before accepting all.';
    end if;
    for entry in select p.id from registration_private.profiles p
      left join registration_private.decisions d on d.user_id = p.id
      where coalesce(d.status, 'pending') = 'pending'
    loop
      result := public.admin_action_base('decision', jsonb_build_object('user_id', entry.id, 'status', 'accepted'));
      if result->>'email_id' is not null then mail_ids := mail_ids || jsonb_build_array(result->>'email_id'); end if;
    end loop;
    result := jsonb_build_object('accepted_count', n, 'email_ids', mail_ids);
  elsif action in ('team_create','team_rename','team_rotate','team_assign','team_remove','team_transfer','team_delete') then
    tid := (payload->>'team_id')::uuid;
    target := (payload->>'user_id')::uuid;
    if action <> 'team_create' then
      select captain_id into captain from registration_private.teams where id = tid;
      if not found then raise exception 'Team not found. Refresh the dashboard.'; end if;
    end if;
    if action in ('team_create','team_rename') and coalesce(length(trim(payload->>'name')),0) not between 1 and 80 then
      raise exception 'Team name must be 1–80 characters.';
    end if;
    if action in ('team_create','team_assign') then
      if not exists(select 1 from registration_private.profiles where id = target and photo_consent is not null) then
        raise exception 'Participant must complete their profile and photo preference first.';
      end if;
      select team_id into source_id from registration_private.members where user_id = target;
      if action = 'team_create' and source_id is not null then raise exception 'Choose a participant without a team.'; end if;
      if source_id = tid then raise exception 'Participant already belongs to this team.'; end if;
      if action = 'team_assign' and (select count(*) from registration_private.members where team_id = tid) >= cap then
        raise exception 'This team is full.';
      end if;
      if source_id is not null then
        if exists(select 1 from registration_private.teams where id = source_id and captain_id = target)
          and (select count(*) from registration_private.members where team_id = source_id) > 1 then
          raise exception 'Transfer captaincy in the current team before moving its captain.';
        end if;
        delete from registration_private.members where user_id = target;
        if not exists(select 1 from registration_private.members where team_id = source_id) then
          delete from registration_private.teams where id = source_id;
        else
          update registration_private.teams set invite_code = left(replace(gen_random_uuid()::text,'-',''),12) where id = source_id;
        end if;
      end if;
      if action = 'team_create' then
        insert into registration_private.teams(name,captain_id) values(trim(payload->>'name'),target) returning id into tid;
      end if;
      insert into registration_private.members(user_id,team_id) values(target,tid);
    elsif action = 'team_rename' then
      update registration_private.teams set name = trim(payload->>'name') where id = tid;
    elsif action = 'team_rotate' then
      update registration_private.teams set invite_code = left(replace(gen_random_uuid()::text,'-',''),12) where id = tid;
    elsif action in ('team_transfer','team_remove') then
      if not exists(select 1 from registration_private.members where team_id = tid and user_id = target) then raise exception 'Select a current team member.'; end if;
      if action = 'team_transfer' then
        update registration_private.teams set captain_id = target where id = tid;
      else
        if captain = target and (select count(*) from registration_private.members where team_id = tid) > 1 then
          raise exception 'Transfer captaincy before removing the captain.';
        end if;
        delete from registration_private.members where user_id = target;
        if not exists(select 1 from registration_private.members where team_id = tid) then
          delete from registration_private.teams where id = tid;
        else
          update registration_private.teams set invite_code = left(replace(gen_random_uuid()::text,'-',''),12) where id = tid;
        end if;
      end if;
    elsif action = 'team_delete' then
      delete from registration_private.teams where id = tid;
    end if;
    result := jsonb_build_object('team_id',tid);
  else
    result := public.admin_action_base(action,payload);
  end if;
  if action not in ('claim','finish') then
    insert into registration_private.admin_events(actor,action,data) values(uid,action,
      case when action = 'compose' then jsonb_build_object('email_id', result->>'email_id', 'user_id',payload->>'user_id') else payload end);
  end if;
  return result;
end;
$$;
revoke all on function public.admin_action(text,jsonb) from public, anon;
grant execute on function public.admin_action(text,jsonb) to authenticated;

alter function public.registration_action(text,jsonb) rename to registration_action_base;
revoke all on function public.registration_action_base(text,jsonb) from public, anon, authenticated;
create function public.registration_action(action text, payload jsonb default '{}'::jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare result jsonb;
begin
  result := public.registration_action_base(action,payload);
  if result ? 'error' then return result; end if;
  return result || jsonb_build_object(
    'admission_status', coalesce((select status from registration_private.decisions where user_id = auth.uid()),'pending'),
    'is_admin', exists(select 1 from registration_private.admins where user_id = auth.uid())
  );
end;
$$;
revoke all on function public.registration_action(text,jsonb) from public, anon;
grant execute on function public.registration_action(text,jsonb) to authenticated;
commit;
