-- =============================================================================
-- DavetPro · 0047 · Sözleşme paylaşım bağlantısı
--
-- Sözleşme müşteriye WhatsApp'tan bağlantıyla gidiyor; müşteri giriş
-- yapmadan /s/<kod> adresinde okuyor.
--
-- NEDEN UZUN RASTGELE KOD: sözleşmede müşterinin telefonu, adresi ve
-- (varsa) kimlik numarası var. Kod 32 onaltılık karakter (128 bit); tahmin
-- edilemez, sıra numarası gibi taranamaz.
--
-- NEDEN EN GÜNCEL SÜRÜM: sözleşme yeniden oluşturulunca yeni satır açılıyor.
-- Müşteriye daha önce gönderilmiş bağlantı eski metinde kalmasın; aynı
-- rezervasyonun en son sürümü gösteriliyor (iptal edilmişse durumu da).
--
-- NEDEN SECURITY DEFINER FONKSİYON: anonim kullanıcının contracts tablosuna
-- hiçbir RLS izni yok ve olmayacak. Fonksiyon yalnızca kodu bilinen tek
-- sözleşmenin okunacak alanlarını döndürüyor.
-- =============================================================================

alter table public.contracts
  add column if not exists share_token text;

update public.contracts
set share_token = replace(gen_random_uuid()::text, '-', '')
where share_token is null;

alter table public.contracts
  alter column share_token set default replace(gen_random_uuid()::text, '-', ''),
  alter column share_token set not null;

create unique index if not exists contracts_share_token_key
  on public.contracts (share_token);

comment on column public.contracts.share_token is
  'Müşteriye gönderilen herkese açık sözleşme bağlantısının kodu (/s/<kod>).';

create or replace function public.contract_by_share_token(p_token text)
returns table (
  contract_number text,
  version         integer,
  status          public.contract_status,
  snapshot        jsonb,
  content         text,
  created_at      timestamptz,
  signed_at       timestamptz
)
language sql
stable
security definer
set search_path = public, pg_temp
as $fn$
  select c.contract_number, c.version, c.status, c.snapshot, c.content,
         c.created_at, c.signed_at
  from public.contracts c
  where c.reservation_id = (
    select t.reservation_id
    from public.contracts t
    -- Kısa ya da boş kodla tarama yapılmasın.
    where length(p_token) = 32 and t.share_token = p_token
  )
  order by c.version desc
  limit 1;
$fn$;

revoke all on function public.contract_by_share_token(text) from public;
grant execute on function public.contract_by_share_token(text) to anon, authenticated;
