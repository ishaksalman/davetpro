-- =============================================================================
-- DavetPro · 0046 · Teslim bağlantısı (fotoğrafçı)
--
-- Fotoğrafçı teslimi çoğunlukla dış bir galeri bağlantısıyla yapıyor
-- (Drive, Pixieset, WeTransfer…). Bağlantıyı tutacak yer yoktu; teslimat
-- kaydı yarım kalıyordu.
--
-- NEDEN YALNIZCA https: bağlantı müşteriye WhatsApp ile gidiyor ve panelde
-- tıklanabilir duruyor; javascript:/data: gibi şemalar kabul edilmemeli.
--
-- NULL = bağlantı eklenmemiş. Salon işletmelerinde hep NULL kalır.
-- =============================================================================

alter table public.reservations
  add column if not exists delivery_link text;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'reservations_delivery_link_check'
  ) then
    alter table public.reservations
      add constraint reservations_delivery_link_check
      check (delivery_link is null
             or (length(delivery_link) <= 2000 and delivery_link ~* '^https://'));
  end if;
end;
$$;

comment on column public.reservations.delivery_link is
  'Teslim edilen fotoğraf/video için dış galeri bağlantısı (yalnızca https).';
