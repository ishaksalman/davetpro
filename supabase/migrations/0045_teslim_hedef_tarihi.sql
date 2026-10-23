-- =============================================================================
-- DavetPro · 0045 · Teslim hedef tarihi (fotoğrafçı)
--
-- Teslimat panosunda "ne zamana kadar teslim edeceğiz" bilgisi yoktu; geciken
-- işler diğerlerinden ayırt edilemiyordu.
--
-- NEDEN reservation_pricing DEĞİL: tarih finansal değil, rol bazlı finans
-- kısıtına girmemeli — çekimci de görüp güncelleyebilmeli.
--
-- NULL = hedef belirlenmemiş. Salon işletmelerinde hep NULL kalır.
-- =============================================================================

alter table public.reservations
  add column if not exists delivery_due_date date;

comment on column public.reservations.delivery_due_date is
  'Müşteriye söz verilen teslim tarihi. Opsiyonel; salonda kullanılmıyor.';
