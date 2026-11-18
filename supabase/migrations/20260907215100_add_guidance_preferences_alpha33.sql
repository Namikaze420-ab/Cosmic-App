alter table public.user_preferences
  add column if not exists focus_areas text[] not null default '{}'::text[],
  add column if not exists guidance_style text not null default 'balanced';

alter table public.user_preferences
  drop constraint if exists user_preferences_focus_areas_check,
  add constraint user_preferences_focus_areas_check
    check (
      cardinality(focus_areas) <= 3
      and focus_areas <@ array['work','relationships','money','wellbeing','growth']::text[]
    );

alter table public.user_preferences
  drop constraint if exists user_preferences_guidance_style_check,
  add constraint user_preferences_guidance_style_check
    check (guidance_style in ('practical','balanced','reflective'));
