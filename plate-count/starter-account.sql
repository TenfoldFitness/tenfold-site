-- Plate Count starter account, part 2 of 2. Run AFTER starter-setup.sql and after creating the user:
--   Supabase -> Authentication -> Users -> Add user. Her email, the temporary password (you type it), tick Auto Confirm User.
-- Then put her email on the 'em' line below and run this.

-- 4. Turn the auth user you created into a starter account. Change the email on the first line if needed.
do $$
declare em text := 'ADRIENNE_EMAIL_HERE';   -- <- the email you used in "Add user"
begin
  if em = 'ADRIENNE_EMAIL_HERE' then raise exception 'Put Adrienne''s email in this script first.'; end if;
  update auth.users
     set raw_app_meta_data  = coalesce(raw_app_meta_data,'{}'::jsonb)  || '{"plate_track":"starter"}'::jsonb,
         raw_user_meta_data = coalesce(raw_user_meta_data,'{}'::jsonb) || '{"first_name":"Adrienne","must_change_password":true}'::jsonb
   where lower(email) = lower(em);
  if not found then raise exception 'No auth user with that email. Add her under Authentication -> Users first.'; end if;
  insert into public.plate_usernames (username, email) values ('adrienne21', lower(em))
    on conflict (username) do update set email = excluded.email;
end $$;
