-- =============================================================================
-- DavetPro · 0039 · Fotoğrafçıya özel iş türleri
--
-- organization_type "hangi olay" sorusunun cevabı. Düğün, nişan, kına
-- fotoğrafçı için de doğru — çekilen olay bunlar. Eksik olan, bir düğüne
-- bağlı OLMAYAN işler: dış çekim, bebek çekimi, doğum günü.
--
-- "Drone", "albüm", "video klip" buraya GİRMİYOR: onlar olay değil hizmet,
-- yerleri ek hizmet kalemleri. Tür ile hizmeti karıştırmak raporları da
-- bozardı — "hangi tür işi daha çok yapıyorum" sorusunun cevabı hizmet
-- listesi olamaz.
--
-- Değerler enum'a ekleniyor ama hangi tipin hangilerini GÖRECEĞİ arayüzde
-- sözlükten belirleniyor; salona dış çekim/bebek gösterilmiyor.
-- =============================================================================

alter type public.organization_type add value if not exists 'dis_cekim';
alter type public.organization_type add value if not exists 'bebek';
alter type public.organization_type add value if not exists 'dogum_gunu';
