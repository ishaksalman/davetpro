-- =============================================================================
-- DavetPro · 0040 · Bağlama kodunu yalnızca yönetici üretebilsin
--
-- `generate_integration_link_code` yalnızca "bu kullanıcının bir işletmesi
-- var mı" diye bakıyordu. Yani işletmenin HERHANGİ bir personeli kod üretip
-- işletmeyi Düğünce'ye bağlayabilirdi.
--
-- Bağlama önemsiz bir tercih değil: kurulduğu anda işletmenin teklif
-- talepleri dış bir ürüne akmaya başlıyor ve geçmiş talepler de aktarılıyor.
-- Bu, sahip/yönetici kararı.
--
-- Ayarlar ekranı sekmeyi zaten yalnızca yöneticiye gösteriyor; burası asıl
-- kapı — arayüzü atlayıp fonksiyonu doğrudan çağıran da takılsın.
-- =============================================================================

create or replace function public.generate_integration_link_code(
  p_venue_id uuid default null
)
returns table (link_code text, valid_until timestamptz)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_business_id uuid := public.current_business_id();
  v_code        text;
  v_alphabet    text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  v_expires     timestamptz := now() + interval '15 minutes';
  i             integer;
begin
  if v_business_id is null then
    raise exception 'Oturum bulunamadı.' using errcode = 'insufficient_privilege';
  end if;

  if not public.is_business_admin() then
    raise exception 'Bu işlem için yönetici olmanız gerekir.'
      using errcode = 'insufficient_privilege';
  end if;

  if p_venue_id is not null and not exists (
    select 1 from public.venues
     where id = p_venue_id and business_id = v_business_id
  ) then
    raise exception 'Salon bu işletmeye ait değil.' using errcode = 'insufficient_privilege';
  end if;

  -- Aynı işletmenin bekleyen kodlarını geçersiz kıl; ekranda tek geçerli
  -- kod olsun, kullanıcı hangisini gireceğini düşünmesin.
  update public.integration_link_codes c
     set consumed_at = now()
   where c.business_id = v_business_id
     and c.consumed_at is null
     and c.expires_at > now();

  loop
    v_code := '';
    for i in 1..6 loop
      v_code := v_code || substr(v_alphabet, 1 + floor(random() * length(v_alphabet))::int, 1);
    end loop;
    exit when not exists (select 1 from public.integration_link_codes c where c.code = v_code);
  end loop;

  insert into public.integration_link_codes (code, business_id, venue_id, created_by, expires_at)
  values (v_code, v_business_id, p_venue_id, auth.uid(), v_expires);

  return query select v_code, v_expires;
end;
$$;

grant execute on function public.generate_integration_link_code(uuid) to authenticated;
