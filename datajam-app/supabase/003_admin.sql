-- Apply after 002 as postgres. Admin membership is managed only in the SQL editor.
create table registration_private.admins (
  user_id uuid primary key references auth.users(id) on delete cascade
);
create table registration_private.decisions (
  user_id uuid primary key references registration_private.profiles(id) on delete cascade,
  status text not null check (status in ('pending','accepted','waitlisted','rejected')),
  updated_by uuid not null references auth.users(id),
  updated_at timestamptz not null default now()
);
create table registration_private.emails (
  id uuid primary key,
  user_id uuid not null references registration_private.profiles(id) on delete cascade,
  recipient text not null,
  subject text not null,
  body text not null,
  kind text not null check (kind in ('acceptance','manual')),
  state text not null default 'queued' check (state in ('queued','sending','submitted','unknown','cancelled')),
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  message_id text,
  detail text
);
create unique index one_acceptance_email on registration_private.emails(user_id) where kind = 'acceptance';
alter table registration_private.admins enable row level security;
alter table registration_private.decisions enable row level security;
alter table registration_private.emails enable row level security;
revoke all on all tables in schema registration_private from public, anon, authenticated;

create function public.admin_action(action text, payload jsonb default '{}'::jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := auth.uid();
  target uuid;
  mail registration_private.emails%rowtype;
  result jsonb;
  email_id uuid;
begin
  if uid is null or not exists (select 1 from auth.users where id = uid and email_confirmed_at is not null) then
    raise exception 'Sign in with a verified login email first.';
  end if;
  if action = 'access' then
    return jsonb_build_object('is_admin', exists(select 1 from registration_private.admins where user_id = uid));
  end if;
  if not exists (select 1 from registration_private.admins where user_id = uid) then
    raise exception 'Organizer access required.';
  end if;
  if payload is null or jsonb_typeof(payload) <> 'object' or octet_length(payload::text) > 8192 then raise exception 'Invalid request'; end if;
  perform pg_advisory_xact_lock(20260923, 1);
  if action = 'list' then
    select coalesce(jsonb_agg(to_jsonb(r) order by r.name, r.id), '[]'::jsonb) into result from (
      select p.*, u.email as login_email, t.name as team_name, t.id as team_id,
        coalesce(d.status,'pending') as status, d.updated_at as decision_at
      from registration_private.profiles p join auth.users u on u.id = p.id
      left join registration_private.members m on m.user_id = p.id
      left join registration_private.teams t on t.id = m.team_id
      left join registration_private.decisions d on d.user_id = p.id
    ) r;
    return jsonb_build_object('registrations', result, 'emails', (
      select coalesce(jsonb_agg(to_jsonb(e) order by e.created_at desc), '[]'::jsonb)
      from (select * from registration_private.emails order by created_at desc limit 200) e));
  elsif action in ('decision','compose') then
    target := (payload->>'user_id')::uuid;
    if not exists(select 1 from registration_private.profiles where id = target) then raise exception 'Registration not found.'; end if;
    if action = 'decision' then
      if coalesce(payload->>'status','') not in ('pending','accepted','waitlisted','rejected') then raise exception 'Invalid status'; end if;
      insert into registration_private.decisions(user_id,status,updated_by) values (target,payload->>'status',uid)
      on conflict (user_id) do update set status = excluded.status, updated_by = uid, updated_at = now();
      if payload->>'status' = 'accepted' then
        insert into registration_private.emails(id,user_id,recipient,subject,body,kind,created_by)
        select gen_random_uuid(), p.id, u.email, 'You are accepted to DataJam 2026',
          'Hi ' || p.name || E',\n\nYou have been accepted to DataJam 2026! We will send event details and next steps separately.\n\nThe DataJam team', 'acceptance', uid
        from registration_private.profiles p join auth.users u on u.id = p.id where p.id = target
        on conflict do nothing;
        update registration_private.emails set state = 'queued' where user_id = target and kind = 'acceptance' and state = 'cancelled';
        select id into email_id from registration_private.emails where user_id = target and kind = 'acceptance' and state = 'queued';
      else
        update registration_private.emails set state = 'cancelled' where user_id = target and kind = 'acceptance' and state = 'queued';
      end if;
    else
      if coalesce(length(trim(payload->>'subject')),0) not between 1 and 200
        or payload->>'subject' ~ E'[\r\n]'
        or coalesce(length(trim(payload->>'text')),0) not between 1 and 5000 then raise exception 'Provide a subject (up to 200 characters) and message (up to 5000 characters).'; end if;
      email_id := (payload->>'id')::uuid;
      insert into registration_private.emails(id,user_id,recipient,subject,body,kind,created_by)
      select email_id, target, email, payload->>'subject', payload->>'text', 'manual', uid from auth.users where id = target
      on conflict (id) do nothing;
      if not exists(select 1 from registration_private.emails where id = email_id and user_id = target and subject = payload->>'subject' and body = payload->>'text' and kind = 'manual') then raise exception 'Email request ID already used.'; end if;
    end if;
    return jsonb_build_object('email_id',email_id);
  elsif action = 'claim' then
    update registration_private.emails set state = 'sending' where id = (payload->>'id')::uuid and state = 'queued'
    returning * into mail;
    return jsonb_build_object('email',case when mail.id is null then null else to_jsonb(mail) end);
  elsif action = 'finish' then
    if coalesce(payload->>'state','') not in ('submitted','unknown') then raise exception 'Invalid email state'; end if;
    update registration_private.emails set state = payload->>'state', message_id = left(payload->>'message_id',500), detail = left(payload->>'detail',1000)
    where id = (payload->>'id')::uuid and state = 'sending';
    return '{}'::jsonb;
  end if;
  raise exception 'Unknown admin action';
end;
$$;
revoke all on function public.admin_action(text,jsonb) from public, anon;
grant execute on function public.admin_action(text,jsonb) to authenticated;
