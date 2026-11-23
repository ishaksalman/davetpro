import { useState } from "react";
import { VERTICALS } from "@/lib/vertical";
import { useAppSession, useSessionContext } from "~/lib/auth/session";
import { Button } from "~/ui/Button";
import { ListGroup, ListRow } from "~/ui/List";
import { InlineHeader, Screen, ScrollScreen } from "~/ui/Screen";
import { BusinessSheet } from "~/features/settings-sheets";

export default function BusinessSettings() {
  const s = useAppSession();
  const { isAdmin, vertical: v } = useSessionContext();
  const [open, setOpen] = useState(false);
  const b = s.business;
  return (
    <Screen>
      <InlineHeader title="İşletme" />
      <ScrollScreen bottomPad={40}>
        <ListGroup>
          <ListRow icon="briefcase" title="İşletme adı" value={b.name} />
          <ListRow icon="tag" title="İşletme türü" value={VERTICALS[b.business_type].label} />
          {b.authorized_person ? <ListRow icon="user" title="Yetkili kişi" value={b.authorized_person} /> : null}
          {b.phone ? <ListRow icon="phone" title="Telefon" value={b.phone} /> : null}
          {b.email ? <ListRow icon="mail" title="E-posta" value={b.email} /> : null}
          {b.city ? <ListRow icon="map-pin" title="Şehir" value={b.city} /> : null}
          {b.address ? <ListRow icon="map-pin" title="Adres" subtitle={b.address} /> : null}
          {b.tax_office || b.tax_number ? <ListRow icon="receipt" title="Vergi" subtitle={[b.tax_office, b.tax_number].filter(Boolean).join(" · ")} /> : null}
          {v.usesCapacity ? <ListRow icon="users" title="Eş zamanlı kapasite" value={b.concurrent_capacity ? String(b.concurrent_capacity) : "Sınırsız"} /> : null}
        </ListGroup>
        {isAdmin ? <Button label="İşletme bilgilerini düzenle" variant="secondary" size="M" onPress={() => setOpen(true)} /> : null}
      </ScrollScreen>
      <BusinessSheet business={b} visible={open} onClose={() => setOpen(false)} />
    </Screen>
  );
}
