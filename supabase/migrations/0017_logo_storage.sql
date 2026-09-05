-- =============================================================================
-- DavetPro · 0017 · İşletme logosu için dosya yükleme
--
-- logo_url bir metin kutusuydu: işletmeden logosunu bir yere yükleyip doğrudan
-- görsel adresini yapıştırması bekleniyordu. Salon sahibi için gerçekçi değil;
-- elindeki dosyayı seçebilmeli.
--
-- Klasör düzeni: logos/{business_id}/logo.{uzanti}
-- İlk klasör adı business_id olduğu için bir işletme yalnızca kendi klasörüne
-- yazabiliyor. Kova herkese açık (public): sözleşme çıktısı alınırken görsel
-- tarayıcı tarafından oturumsuz çekiliyor.
-- =============================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'logos', 'logos', true, 2097152,
  array['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml']
)
on conflict (id) do update
  set public = true,
      file_size_limit = 2097152,
      allowed_mime_types = excluded.allowed_mime_types;

-- Depolama politikaları tenant sınırını klasör adından okur.
-- storage.foldername(name) yol parçalarını dizi olarak veriyor.

drop policy if exists logos_read on storage.objects;
create policy logos_read on storage.objects
  for select to anon, authenticated
  using (bucket_id = 'logos');

drop policy if exists logos_insert on storage.objects;
create policy logos_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'logos'
    and (storage.foldername(name))[1] = public.current_business_id()::text
    and public.is_business_admin()
  );

drop policy if exists logos_update on storage.objects;
create policy logos_update on storage.objects
  for update to authenticated
  using (
    bucket_id = 'logos'
    and (storage.foldername(name))[1] = public.current_business_id()::text
    and public.is_business_admin()
  )
  with check (
    bucket_id = 'logos'
    and (storage.foldername(name))[1] = public.current_business_id()::text
    and public.is_business_admin()
  );

drop policy if exists logos_delete on storage.objects;
create policy logos_delete on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'logos'
    and (storage.foldername(name))[1] = public.current_business_id()::text
    and public.is_business_admin()
  );

-- Politikalar bu iki fonksiyonu storage şemasından çağırıyor.
grant execute on function public.current_business_id() to authenticated;
grant execute on function public.is_business_admin() to authenticated;
