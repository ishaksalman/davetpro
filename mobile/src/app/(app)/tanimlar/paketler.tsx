import { useState } from "react";
import { View } from "react-native";
import { formatMoney } from "@/lib/format";
import type { Package } from "@/lib/database.types";
import { useSessionContext } from "~/lib/auth/session";
import { useLookups } from "~/lib/data/lookups";
import { StatusBadge } from "~/ui/Badge";
import { Fab } from "~/ui/Button";
import { EmptyState, ErrorState, RowSkeleton } from "~/ui/Feedback";
import { ListGroup, ListRow } from "~/ui/List";
import { InlineHeader, Screen, ScrollScreen } from "~/ui/Screen";
import { PackageSheet } from "~/features/definition-sheets";

export default function PackagesScreen() {
  const { isAdmin } = useSessionContext();
  const q = useLookups();
  const [edit, setEdit] = useState<Package | null>(null);
  const [open, setOpen] = useState(false);
  const pkgs = q.data?.packages ?? [];
  return (
    <Screen>
      <InlineHeader title="Paketler" />
      <ScrollScreen onRefresh={() => q.refetch()} refreshing={q.isRefetching} bottomPad={120}>
        {q.isError ? <ErrorState message={q.error instanceof Error ? q.error.message : undefined} onRetry={() => q.refetch()} /> : q.isLoading ? (
          <ListGroup><RowSkeleton /><RowSkeleton /></ListGroup>
        ) : pkgs.length === 0 ? (
          <EmptyState title="Henüz paket yok" description="Fiyat ve hizmetleri tanımlayın; rezervasyonda tek dokunuşla seçilir." action={isAdmin ? { label: "Paket ekle", icon: "plus", onPress: () => setOpen(true) } : undefined} />
        ) : (
          <ListGroup>
            {pkgs.map((p) => (
              <ListRow
                key={p.id} icon="package" title={p.name}
                subtitle={`${formatMoney(p.base_price)}${p.pricing_type === "kisi_basi" ? " / kişi" : ""}${p.included_services.length ? ` · ${p.included_services.length} hizmet` : ""}`}
                right={!p.is_active ? <StatusBadge label="Pasif" tone="neutral" size="S" /> : undefined}
                onPress={isAdmin ? () => { setEdit(p); setOpen(true); } : undefined}
              />
            ))}
          </ListGroup>
        )}
      </ScrollScreen>
      {isAdmin ? <View pointerEvents="box-none" style={{ position: "absolute", right: 16, bottom: 32 }}><Fab label="Yeni paket" onPress={() => { setEdit(null); setOpen(true); }} /></View> : null}
      <PackageSheet pkg={edit} venues={q.data?.venues ?? []} visible={open} onClose={() => setOpen(false)} />
    </Screen>
  );
}
