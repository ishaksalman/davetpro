-- =============================================================================
-- DavetPro · 0034 · Sözleşmede geçecek ad
--
-- Müşteri adı çoğu zaman çift olarak giriliyor ("Ayşe & Ahmet Salman").
-- Takvimde ve listelerde doğru olan bu; salon sahibi işi böyle düşünüyor.
-- Ama sözleşmede taraf belirli bir gerçek kişi olmalı ve belge bugün kendi
-- içinde çelişiyor: ad iki kişiyi söylerken T.C. kimlik numarası tek kişiye
-- ait.
--
-- KOLON NULLABLE. Zorunluluk FORMDA: mevcut müşterilerde alan boş kalıyor ve
-- sözleşme eskisi gibi full_name ile çıkıyor. NOT NULL yapmak hem mevcut
-- kayıtları hem de DavetMekanı entegrasyonunu (0024) kırardı — orada müşteri
-- yalnızca ad ve telefonla açılıyor.
-- =============================================================================

alter table public.customers
  add column if not exists contract_name text
    check (contract_name is null or length(btrim(contract_name)) between 2 and 160);

comment on column public.customers.contract_name is
  'Sözleşmeyi imzalayacak kişinin tam adı. Kimlik numarası ve adres bu kişiye ait. Boşsa full_name kullanılır.';
