-- =============================================================================
-- DavetPro · 0041 · Organizasyon firması iş türü
--
-- Üçüncü dikey. Salon kendi mekânında çalışıyor, fotoğrafçı platoda;
-- organizasyon firması ikisini birden yapıyor — kendi salonu olabiliyor ama
-- işlerin çoğu dış mekânda, müşterinin adresinde.
--
-- Enum değeri AYRI DOSYADA: alter type ... add value ile eklenen değer aynı
-- işlem içinde kullanılamıyor. 0042 bu değeri kullandığı için ayrıldılar.
-- =============================================================================

alter type public.business_type add value if not exists 'organizasyon';
