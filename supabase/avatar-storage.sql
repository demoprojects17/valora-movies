-- Run once in this project's Supabase SQL Editor.
-- Users upload only to their own UID folder. Avatars can be displayed publicly.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 1048576, array['image/webp', 'image/jpeg'])
on conflict (id) do update set public = true, file_size_limit = 1048576, allowed_mime_types = array['image/webp', 'image/jpeg'];

drop policy if exists "Velora avatar upload" on storage.objects;
drop policy if exists "Velora avatar owner read" on storage.objects;
drop policy if exists "Velora avatar owner delete" on storage.objects;

create policy "Velora avatar upload" on storage.objects
for insert to authenticated
with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "Velora avatar owner read" on storage.objects
for select to authenticated
using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "Velora avatar owner delete" on storage.objects
for delete to authenticated
using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);
