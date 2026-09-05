-- =============================================================================
-- DavetPro · 0022 · Paketler salona bağlanabiliyor
--
-- Paketlerin bir kısmı gerçekten salona ait: "Kır Bahçesi Kuru Kiralama"
-- yalnızca o salonun kirasıdır, başka salonda seçilirse fiyat yanlış olur.
-- Menüler ise mutfak kaynaklı ve salonlar arasında ortaktır.
--
-- Bu yüzden bağ ZORUNLU DEĞİL: venue_id boşsa paket tüm salonlarda geçerli,
-- doluysa yalnızca o salonda. Zorunlu olsaydı "Gold Menü"yü her salon için
-- ayrı ayrı oluşturmak gerekirdi.
--
-- Mevcut paketlerin hepsi NULL kalır, yani davranış değişmez.
-- =============================================================================

alter table public.packages
  add column if not exists venue_id uuid;

-- Tenant sınırını aşan bağ kurulamaz (bileşik FK).
-- Salon silinirse paket "tüm salonlar"a döner; kolon listesi olmadan
-- business_id de NULL'a çekilmeye çalışılırdı (PostgreSQL 15+ söz dizimi).
alter table public.packages
  drop constraint if exists packages_venue_id_business_id_fkey;
alter table public.packages
  add constraint packages_venue_id_business_id_fkey
  foreign key (venue_id, business_id)
  references public.venues (id, business_id) on delete set null (venue_id);

create index if not exists packages_venue_idx
  on public.packages (business_id, venue_id);

comment on column public.packages.venue_id is
  'Boşsa paket tüm salonlarda seçilebilir; doluysa yalnızca o salonda.';
