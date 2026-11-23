import { useState } from "react";
import { View } from "react-native";
import * as Linking from "expo-linking";
import { router } from "expo-router";
import { STAGES, STAGE_FLOW, reservationStage, type Stage } from "@/lib/stage";
import { isShootOver, todayISO } from "@/lib/time";
import { useDeliveryFields } from "~/lib/data/management";
import { useUpdateStage } from "~/lib/data/reservations";
import type { ReservationRow } from "~/lib/data/types";
import { useSubmitGuard } from "~/lib/hooks";
import { Banner, useToast } from "~/ui/Feedback";
import { Button } from "~/ui/Button";
import { TextField } from "~/ui/Inputs";
import { ListGroup, ListRow, SectionHeader } from "~/ui/List";
import { DateField } from "~/ui/Pickers";
import { BottomSheet } from "~/ui/Sheet";

/**
 * Teslimat: tek eksende çekim → seçim → düzenleme → baskı → teslim. İki kolon
 * (status + delivery_status) TEK update ile yazılır (web `updateReservationStage`).
 * Teslim bağlantısı yalnızca https.
 */
export function DeliverySheet({ row, visible, onClose }: { row: ReservationRow; visible: boolean; onClose: () => void }) {
  return (
    <BottomSheet visible={visible} title="Teslimat" onClose={onClose}>
      <Body row={row} onClose={onClose} />
    </BottomSheet>
  );
}

function Body({ row, onClose }: { row: ReservationRow; onClose: () => void }) {
  const toast = useToast();
  const guard = useSubmitGuard();
  const stageM = useUpdateStage(row.id);
  const f = useDeliveryFields(row.id);
  const [due, setDue] = useState<string | null>(row.delivery_due_date);
  const [link, setLink] = useState(row.delivery_link ?? "");
  const [error, setError] = useState<string | null>(null);
  const current = reservationStage(row.status, row.delivery_status, isShootOver(row.event_date, row.end_time, row.start_time));

  const run = (fn: () => Promise<{ ok: boolean; error?: string }>, ok: string) =>
    guard.run(async () => {
      setError(null);
      const r = await fn();
      if (!r.ok) return setError(r.error ?? "İşlem yapılamadı.");
      toast({ tone: "success", message: ok });
    });

  return (
    <View style={{ gap: 16 }}>
      {error ? <Banner tone="danger" title="Kaydedilemedi" body={error} /> : null}
      <View style={{ gap: 10 }}>
        <SectionHeader title="Aşama" />
        <ListGroup>
          {STAGE_FLOW.map((s: Stage) => (
            <ListRow
              key={s}
              icon={s === current ? "circle-check" : "clock"}
              title={STAGES[s].label}
              value={s === current ? "Şu an" : undefined}
              onPress={s === current ? undefined : () => run(async () => { try { await stageM.mutateAsync(s); return { ok: true }; } catch (e) { return { ok: false, error: e instanceof Error ? e.message : undefined }; } }, `Durum: ${STAGES[s].label}`)}
            />
          ))}
        </ListGroup>
      </View>
      <DateField label="Teslim hedef tarihi" value={due} onChange={setDue} clearable placeholder="Belirtilmedi" minDate={todayISO()} />
      <Button label="Hedef tarihi kaydet" variant="secondary" size="M" loading={guard.pending} onPress={() => run(() => f.dueDate.mutateAsync(due), "Hedef tarih kaydedildi")} />
      <TextField label="Teslim bağlantısı (galeri)" placeholder="https://…" autoCapitalize="none" autoCorrect={false} keyboardType="url" value={link} onChangeText={setLink} />
      <View style={{ flexDirection: "row", gap: 10 }}>
        <View style={{ flex: 1 }}><Button label="Bağlantıyı kaydet" variant="secondary" size="M" loading={guard.pending} onPress={() => run(() => f.link.mutateAsync(link.trim() === "" ? null : link), "Bağlantı kaydedildi")} /></View>
        {row.delivery_link ? <View style={{ flex: 1 }}><Button label="Aç" variant="outline" size="M" onPress={() => Linking.openURL(row.delivery_link!)} /></View> : null}
      </View>
      <Button label="Rezervasyonu aç" variant="ghost" onPress={() => { onClose(); router.push({ pathname: "/rezervasyon/[id]", params: { id: row.id } }); }} />
    </View>
  );
}
