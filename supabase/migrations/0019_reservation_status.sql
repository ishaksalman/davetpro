-- =============================================================================
-- DavetPro · 0019 · Rezervasyon durumu sadeleşiyor
--
-- Talepler modülü gelmeden önce rezervasyon tablosu satış hattını da taşıyordu:
-- 'on_gorusme' potansiyel müşteri, 'opsiyonlu' tutulmuş tarih demekti. Artık
-- ikisi de Talepler'de yaşıyor (lead + venue_holds). Rezervasyon yalnızca
-- kesinleşmiş işi temsil ediyor.
--
-- İki somut sorun çözülüyor:
--   1. Form varsayılanı 'opsiyonlu' idi; yeni rezervasyonlar yanlış durumla
--      açılıyordu.
--   2. Raporlar yalnızca 'iptal_edildi' hariç tutuyor. Yani 'on_gorusme'
--      durumundaki bir kayıt — ki potansiyel müşteri demekti — satış olarak
--      sayılıyordu. Ciro olduğundan yüksek görünüyordu.
--
-- Enum değerleri KALDIRILMIYOR. reservation_financials görünümü status
-- kolonunu seçiyor ve customer_balances de ona bağlı; tipi yeniden kurmak
-- finansal çekirdeği düşürüp yeniden yaratmayı gerektirirdi. Kazanç bu riske
-- değmiyor. Değerler arayüzden kaldırıldığı için yeni kayıt alamıyorlar.
-- =============================================================================

-- Geçmiş kayıtlar: satış hattı artık Talepler'de olduğu için bu iki durumda
-- kalmış rezervasyonlar kesinleşmiş sayılıyor.
update public.reservations
   set status = 'kesinlesti'
 where status in ('on_gorusme', 'opsiyonlu');

-- Yeni rezervasyon kesinleşmiş iştir.
alter table public.reservations
  alter column status set default 'kesinlesti';

comment on column public.reservations.status is
  'kesinlesti | tamamlandi | iptal_edildi. on_gorusme ve opsiyonlu artık '
  'kullanılmıyor — satış hattı Talepler modülünde.';
