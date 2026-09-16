-- =============================================================================
-- DavetPro · 0039 · Stüdyo iş türleri
--
-- organization_type "hangi iş" sorusunun cevabı. Salonun listesi organizasyon
-- odaklı; stüdyonun işi farklı — vesikalık, portre, ürün çekimi salonda
-- olmayan kalemler.
--
-- "Drone", "albüm", "video klip" buraya GİRMİYOR: onlar iş türü değil hizmet,
-- yerleri ek hizmet kalemleri. Tür ile hizmeti karıştırmak raporu da bozardı —
-- "hangi tür işi daha çok yapıyorum" sorusunun cevabı hizmet listesi olamaz.
--
-- NEDEN AYRI 'dugun_nisan': stüdyoda düğün ve nişan tek kalem, salonda ayrı
-- ayrı. Aynı değere iki farklı etiket vermek yerine ayrı değer veriliyor;
-- böylece etiket haritası tek ve global kalıyor, raporlar da karışmıyor.
--
-- Değerler enum'a ekleniyor ama hangi tipin hangilerini GÖRECEĞİ arayüzde
-- sözlükten belirleniyor — salona vesikalık, stüdyoya sünnet gösterilmiyor.
-- =============================================================================

alter type public.organization_type add value if not exists 'dis_cekim';
alter type public.organization_type add value if not exists 'dugun_nisan';
alter type public.organization_type add value if not exists 'vesikalik';
alter type public.organization_type add value if not exists 'portre';
alter type public.organization_type add value if not exists 'studyo';
alter type public.organization_type add value if not exists 'urun';
alter type public.organization_type add value if not exists 'video_etkinlik';
