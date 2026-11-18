-- Cosmic Planner authenticated persistence / RLS smoke test.
--
-- This script is intentionally transactional and rolls back every write.
-- Run only in staging/QA. It selects the most recently created Auth user solely
-- to provide a valid FK owner for the transaction; no user content is read.
-- A failure raises an exception. A successful run ends with a PASS row.

begin;

select set_config('qa.original_uid', (select id::text from auth.users order by created_at desc limit 1), true);
select set_config('request.jwt.claim.sub', current_setting('qa.original_uid'), true);
set local role authenticated;

insert into public.planner_items (
  id, user_id, title, starts_at, ends_at, status, priority, category, source, reminder_minutes
) values (
  gen_random_uuid(), auth.uid(), 'QA_RLS_PLANNER_ROLLBACK',
  '2099-12-31T10:00:00Z', '2099-12-31T11:00:00Z',
  'planned', 'medium', 'work', 'cosmic_planner', array[15]
);

do $$
begin
  if (select count(*) from public.planner_items where user_id = auth.uid() and title = 'QA_RLS_PLANNER_ROLLBACK') <> 1 then
    raise exception 'planner own-row select failed';
  end if;
end $$;

update public.planner_items
set status = 'completed'
where user_id = auth.uid() and title = 'QA_RLS_PLANNER_ROLLBACK';

do $$
begin
  if (select count(*) from public.planner_items where user_id = auth.uid() and title = 'QA_RLS_PLANNER_ROLLBACK' and status = 'completed') <> 1 then
    raise exception 'planner own-row update failed';
  end if;
end $$;

insert into public.diary_entries (
  id, user_id, entry_date, title, content, mood, tags
) values (
  gen_random_uuid(), auth.uid(), '2099-12-31',
  'QA_RLS_DIARY_ROLLBACK', 'Temporary QA content', 4, array['qa']
);

do $$
begin
  if (select count(*) from public.diary_entries where user_id = auth.uid() and entry_date = '2099-12-31' and title = 'QA_RLS_DIARY_ROLLBACK') <> 1 then
    raise exception 'diary own-row insert/select failed';
  end if;
end $$;

update public.diary_entries
set content = 'Temporary QA content updated'
where user_id = auth.uid() and entry_date = '2099-12-31' and title = 'QA_RLS_DIARY_ROLLBACK';

do $$
begin
  if (select count(*) from public.diary_entries where user_id = auth.uid() and entry_date = '2099-12-31' and content = 'Temporary QA content updated') <> 1 then
    raise exception 'diary own-row update failed';
  end if;
end $$;

-- Change the simulated authenticated UID. RLS must hide the first user's rows.
select set_config('request.jwt.claim.sub', gen_random_uuid()::text, true);

do $$
begin
  if (select count(*) from public.planner_items where title = 'QA_RLS_PLANNER_ROLLBACK') <> 0 then
    raise exception 'planner cross-user visibility leak';
  end if;
  if (select count(*) from public.diary_entries where title = 'QA_RLS_DIARY_ROLLBACK') <> 0 then
    raise exception 'diary cross-user visibility leak';
  end if;
end $$;

select set_config('request.jwt.claim.sub', current_setting('qa.original_uid'), true);
delete from public.planner_items where user_id = auth.uid() and title = 'QA_RLS_PLANNER_ROLLBACK';
delete from public.diary_entries where user_id = auth.uid() and title = 'QA_RLS_DIARY_ROLLBACK';

reset role;
rollback;

select 'PASS: planner + diary CRUD and cross-user RLS isolation verified; transaction rolled back' as qa_result;
