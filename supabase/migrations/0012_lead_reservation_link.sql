-- =============================================================================
-- DavetPro · 0012 · Dönüşmüş talebin rezervasyon bağlantısı korunuyor
--
-- Hata: leads.reservation_id ve venue_holds.reservation_id "on delete set null"
-- idi. Yönetici dönüşmüş bir rezervasyonu silince talep 'kazanildi' durumunda
-- kalıp bağlantısı kopuyordu. Sonuç: "Rezervasyonu Görüntüle" hiçbir yere
-- gitmiyor ve dönüşüm oranı raporu rezervasyonu olmayan bir kazanım sayıyor.
--
-- Çözüm: RESTRICT. Sözleşmelerde zaten böyle. Yanlış girilen bir rezervasyon
-- silinmez, 'iptal_edildi' yapılır — salonu da serbest bırakır ve geçmiş kalır.
-- =============================================================================

alter table public.leads
  drop constraint if exists leads_reservation_id_business_id_fkey;

alter table public.leads
  add constraint leads_reservation_id_business_id_fkey
  foreign key (reservation_id, business_id)
  references public.reservations (id, business_id) on delete restrict;

alter table public.venue_holds
  drop constraint if exists venue_holds_reservation_id_business_id_fkey;

alter table public.venue_holds
  add constraint venue_holds_reservation_id_business_id_fkey
  foreign key (reservation_id, business_id)
  references public.reservations (id, business_id) on delete restrict;
