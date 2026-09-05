-- =============================================================================
-- DavetPro · 0021 · packages.guest_capacity kaldırılıyor
--
-- Alan iki sekmede iki farklı anlama geliyordu ve ikisi de fiyatı
-- belirlemiyordu:
--   · Sabit fiyatta "fiyata dahil kişi sayısı" gibi okunuyordu
--   · Kişi başında yalnızca bir varsayılan ve önizleme değeriydi
--
-- Fiyat her iki durumda da rezervasyondaki/teklifteki kişi sayısıyla
-- hesaplanıyor. Kalan tek işlevi form açılışında kişi sayısını doldurmaktı;
-- bu kolaylık, alanın yarattığı kafa karışıklığına değmiyordu.
--
-- DİKKAT: geri alınamaz, kolondaki değerler siliniyor. Fiyat, rezervasyon ve
-- teklif tutarları etkilenmiyor — hiçbiri bu kolonu okumuyordu.
-- =============================================================================

alter table public.packages drop column if exists guest_capacity;
