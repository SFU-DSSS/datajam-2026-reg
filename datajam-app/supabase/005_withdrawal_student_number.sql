-- Apply once after 004_organizer_tools.sql, before deploying the new buttons.
-- If the unique index fails, review existing duplicates first; no rows are deleted:
-- select lower(btrim(student_number)), array_agg(id)
-- from registration_private.profiles group by 1 having count(*) > 1;
begin;

create unique index profiles_student_number_unique
  on registration_private.profiles (lower(btrim(student_number)));

-- Give both RPC callers and direct SQL writes a readable duplicate error.
create function registration_private.check_student_number()
returns trigger language plpgsql set search_path = '' as $$
begin
  perform pg_advisory_xact_lock(20260923, 1);
  if exists (select 1 from registration_private.profiles
    where lower(btrim(student_number)) = lower(btrim(new.student_number)) and id <> new.id) then
    raise exception 'This student number is already registered. Sign in to the existing account or contact the organizers.';
  end if;
  return new;
end;
$$;
create trigger check_student_number before insert or update of student_number
  on registration_private.profiles for each row execute function registration_private.check_student_number();
revoke all on function registration_private.check_student_number() from public, anon, authenticated;

-- Only the authorized entry points below can invoke this helper.
create function registration_private.delete_registration(target uuid)
returns void language plpgsql set search_path = '' as $$
declare
  tid uuid;
  successor uuid;
begin
  perform pg_advisory_xact_lock(20260923, 1);
  if not exists (select 1 from registration_private.profiles where id = target) then
    raise exception 'Registration not found. Refresh the dashboard.';
  end if;
  select team_id into tid from registration_private.members where user_id = target;
  if tid is not null then
    select user_id into successor from registration_private.members
      where team_id = tid and user_id <> target order by joined_at, user_id limit 1;
    if successor is null then
      delete from registration_private.teams where id = tid;
    else
      update registration_private.teams set
        captain_id = case when captain_id = target then successor else captain_id end,
        invite_code = left(replace(gen_random_uuid()::text, '-', ''), 12)
        where id = tid;
    end if;
  end if;
  delete from registration_private.members where user_id = target;
  -- Decisions and email records cascade with the profile. Auth account is retained.
  delete from registration_private.profiles where id = target;
end;
$$;
revoke all on function registration_private.delete_registration(uuid) from public, anon, authenticated;

alter function public.registration_action(text,jsonb) rename to registration_action_v4;
revoke all on function public.registration_action_v4(text,jsonb) from public, anon, authenticated;
create function public.registration_action(action text, payload jsonb default '{}'::jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
begin
  if action = 'withdraw' then
    -- The existing read verifies the caller and takes the shared transaction lock.
    perform public.registration_action_v4('me', payload);
    perform registration_private.delete_registration(auth.uid());
    return public.registration_action_v4('me', '{}');
  end if;
  return public.registration_action_v4(action, payload);
end;
$$;
revoke all on function public.registration_action(text,jsonb) from public, anon;
grant execute on function public.registration_action(text,jsonb) to authenticated;

alter function public.admin_action(text,jsonb) rename to admin_action_v4;
revoke all on function public.admin_action_v4(text,jsonb) from public, anon, authenticated;
create function public.admin_action(action text, payload jsonb default '{}'::jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare target uuid;
begin
  if action = 'registration_delete' then
    if not (public.admin_action_v4('access', '{}')->>'is_admin')::boolean then
      raise exception 'Organizer access required.';
    end if;
    if payload is null or jsonb_typeof(payload) <> 'object' or octet_length(payload::text) > 8192 then
      raise exception 'Invalid request';
    end if;
    target := (payload->>'user_id')::uuid;
    perform registration_private.delete_registration(target);
    insert into registration_private.admin_events(actor, action, data)
      values(auth.uid(), action, jsonb_build_object('user_id', target));
    return '{}'::jsonb;
  end if;
  return public.admin_action_v4(action, payload);
end;
$$;
revoke all on function public.admin_action(text,jsonb) from public, anon;
grant execute on function public.admin_action(text,jsonb) to authenticated;
commit;
