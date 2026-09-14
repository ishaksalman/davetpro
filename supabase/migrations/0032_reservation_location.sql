-- =============================================================================
-- DavetPro · 0032 · Etkinlik adresi
--
-- Salon kendi mekânında çalışıyor, adres işletmenin kendi bilgisi. Fotoğrafçı
-- ise müşterinin mekânına gidiyor; her rezervasyonun kendi adresi oluyor.
--
-- Kolon her iki tip için de duruyor ama arayüzde yalnızca fotoğrafçıya
-- gösteriliyor. Tipe göre kolon açmak şemayı ikiye bölerdi; nullable tek
-- kolon hem sade hem geri dönüşsüz bir karar değil.
-- =============================================================================

alter table public.reservations
  add column if not exists location text;

comment on column public.reservations.location is
  'Etkinliğin yapılacağı adres. Fotoğrafçıda dolduruluyor, salonda boş kalıyor.';

-- Yeni parametre arity değiştiriyor; eski imzalar düşürülmeli.
drop function if exists public.save_reservation(
  uuid, uuid, uuid, uuid, public.organization_type, public.reservation_status,
  date, time, time, integer, text, numeric, numeric, date, numeric, jsonb);
drop function if exists public.save_reservation(
  uuid, uuid, uuid, uuid, public.organization_type, public.reservation_status,
  date, time, time, integer, text, numeric, numeric, date, numeric, jsonb, text);

create function public.save_reservation(
  p_id                uuid,
  p_customer_id       uuid,
  p_venue_id          uuid,
  p_package_id        uuid,
  p_organization_type public.organization_type,
  p_status            public.reservation_status,
  p_event_date        date,
  p_start_time        time,
  p_end_time          time,
  p_guest_count       integer,
  p_notes             text,
  p_gross_amount      numeric,
  p_discount_amount   numeric,
  p_due_date          date,
  p_unit_price        numeric default null,
  -- Ek hizmet kalemleri: [{ "name": "Dış çekim", "amount": 12000 }]
  p_items             jsonb default null,
  -- Etkinliğin yapılacağı adres. Fotoğrafçı müşterinin mekânına gidiyor;
  -- salon kendi mekânında çalıştığı için orada boş kalıyor.
  p_location          text default null
)
returns uuid
language plpgsql
set search_path = public, pg_temp
as $fn$
declare
  v_id     uuid;
  v_extras numeric := 0;
begin
  if p_id is null then
    insert into public.reservations (
      customer_id, venue_id, package_id, organization_type, status,
      event_date, start_time, end_time, guest_count, notes, location
    ) values (
      p_customer_id, p_venue_id, p_package_id, p_organization_type, p_status,
      p_event_date, p_start_time, p_end_time, p_guest_count,
      nullif(btrim(p_notes), ''), nullif(btrim(p_location), '')
    )
    returning id into v_id;
  else
    update public.reservations set
      customer_id       = p_customer_id,
      venue_id          = p_venue_id,
      package_id        = p_package_id,
      organization_type = p_organization_type,
      status            = p_status,
      event_date        = p_event_date,
      start_time        = p_start_time,
      end_time          = p_end_time,
      guest_count       = p_guest_count,
      notes             = nullif(btrim(p_notes), ''),
      location          = nullif(btrim(p_location), '')
    where id = p_id
    returning id into v_id;

    if v_id is null then
      raise exception 'Rezervasyon bulunamadı.' using errcode = 'no_data_found';
    end if;
  end if;

  -- Finans yetkisi olmayan personel fiyat yazamaz; rezervasyon yine oluşur.
  if public.can_see_finance() and p_gross_amount is not null then
    /*
     * p_items VERİLDİYSE kalemler baştan yazılır. null ise kalemlere hiç
     * dokunulmaz: convert_lead bu fonksiyonu kalem göndermeden çağırıyor ve
     * oradaki davranış değişmemeli.
     *
     * Silip yeniden yazmak, satır satır eşleştirmekten basit ve kalemlerin
     * kendi kimliğine bağlı hiçbir kayıt yok (ödeme kaleme değil rezervasyona
     * bağlanıyor).
     */
    if p_items is not null then
      delete from public.reservation_items where reservation_id = v_id;

      insert into public.reservation_items (reservation_id, name, amount, sort_order)
      select v_id, btrim(item ->> 'name'),
             (item ->> 'amount')::numeric, (ordinality - 1)::int
        from jsonb_array_elements(p_items) with ordinality as t(item, ordinality)
       where length(btrim(coalesce(item ->> 'name', ''))) > 0;
    end if;

    select coalesce(sum(amount), 0) into v_extras
      from public.reservation_items where reservation_id = v_id;

    /*
     * p_gross_amount PAKET tutarı; brüt, kalemler eklenerek bulunuyor.
     * convert_lead teklifin toplamını gönderip kalem göndermediği için orada
     * brüt = toplam olarak kalıyor, yani davranış aynı.
     */
    insert into public.reservation_pricing
      (reservation_id, package_amount, extras_amount, gross_amount,
       discount_amount, due_date, unit_price)
    values
      (v_id, p_gross_amount, v_extras, p_gross_amount + v_extras,
       coalesce(p_discount_amount, 0), p_due_date, p_unit_price)
    on conflict (reservation_id) do update set
      package_amount  = excluded.package_amount,
      extras_amount   = excluded.extras_amount,
      gross_amount    = excluded.gross_amount,
      discount_amount = excluded.discount_amount,
      due_date        = excluded.due_date,
      unit_price      = excluded.unit_price;
  end if;

  return v_id;
end;
$fn$;

grant execute on function public.save_reservation(
  uuid, uuid, uuid, uuid, public.organization_type, public.reservation_status,
  date, time, time, integer, text, numeric, numeric, date, numeric, jsonb, text
) to authenticated;
