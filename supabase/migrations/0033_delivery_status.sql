-- =============================================================================
-- DavetPro · 0033 · Teslim akışı (fotoğrafçı)
--
-- Fotoğrafçının işi çekim günü bitmiyor: seçim, düzenleme, baskı ve teslim
-- adımları var. Salonda böyle bir akış yok — organizasyon biter, iş biter.
--
-- NEDEN reservation_status'e DEĞER EKLENMEDİ: o enum 0019 ve 0020'de zorlukla
-- yeniden kuruldu; iki görünüm, birkaç fonksiyon ve bir CHECK ona bağlı.
-- Oraya değer eklemek aynı zinciri tekrar çözmek olurdu. Ayrı kolon salon
-- tarafına hiç dokunmuyor.
--
-- NULL = akış başlamamış (çekim henüz yapılmadı). Salon işletmelerinde kolon
-- hep NULL kalıyor ve arayüzde hiç görünmüyor.
-- =============================================================================

do $$
begin
  if not exists (select 1 from pg_type where typname = 'delivery_status') then
    create type public.delivery_status as enum (
      'cekim_yapildi',
      'secim_bekleniyor',
      'duzenleniyor',
      'baskida',
      'teslim_edildi'
    );
  end if;
end;
$$;

alter table public.reservations
  add column if not exists delivery_status public.delivery_status;

alter table public.reservations
  add column if not exists delivered_at timestamptz;

comment on column public.reservations.delivery_status is
  'Çekim sonrası teslim aşaması. NULL ise akış başlamamış. Salonda kullanılmıyor.';
comment on column public.reservations.delivered_at is
  'Teslim anı. delivery_status ''teslim_edildi'' olduğunda tetikleyici yazıyor.';

-- Teslim anı elle girilmiyor: durum teslime çekildiğinde damgalanıyor,
-- geri alınırsa temizleniyor. Böylece "teslim edildi ama tarihi yok" ya da
-- tersi bir kayıt oluşamıyor.
create or replace function public.sync_delivered_at()
returns trigger
language plpgsql
as $fn$
begin
  if new.delivery_status is distinct from old.delivery_status then
    new.delivered_at := case
      when new.delivery_status = 'teslim_edildi' then now()
      else null
    end;
  end if;
  return new;
end;
$fn$;

drop trigger if exists reservations_delivered_at on public.reservations;
create trigger reservations_delivered_at
  before update on public.reservations
  for each row execute function public.sync_delivered_at();
