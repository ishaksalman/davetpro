import { useState } from "react";
import { View } from "react-native";
import type { ExpenseCategory } from "@/lib/database.types";
import { useSessionContext } from "~/lib/auth/session";
import { useManageCategories } from "~/lib/data/management";
import { StatusBadge } from "~/ui/Badge";
import { Fab } from "~/ui/Button";
import { EmptyState, ErrorState, RowSkeleton } from "~/ui/Feedback";
import { ListGroup, ListRow } from "~/ui/List";
import { InlineHeader, Screen, ScrollScreen } from "~/ui/Screen";
import { CategorySheet } from "~/features/settings-sheets";

export default function CategoriesSettings() {
  const { isAdmin, canFinance } = useSessionContext();
  const cats = useManageCategories(canFinance);
  const [cat, setCat] = useState<ExpenseCategory | null>(null);
  const [open, setOpen] = useState(false);
  if (!canFinance) return <Screen><InlineHeader title="Gider kategorileri" /><EmptyState title="Yetkiniz yok" description="Finansal verileri görme yetkiniz bulunmuyor." /></Screen>;
  return (
    <Screen>
      <InlineHeader title="Gider kategorileri" />
      <ScrollScreen onRefresh={() => cats.refetch()} refreshing={cats.isRefetching} bottomPad={120}>
        {cats.isError ? (
          <ErrorState message={cats.error instanceof Error ? cats.error.message : undefined} onRetry={() => cats.refetch()} />
        ) : cats.isLoading ? (
          <ListGroup><RowSkeleton /><RowSkeleton /></ListGroup>
        ) : (cats.data ?? []).length === 0 ? (
          <EmptyState title="Henüz kategori yok" description="Giderleri gruplamak için kategori ekleyin." action={isAdmin ? { label: "Kategori ekle", icon: "plus", onPress: () => { setCat(null); setOpen(true); } } : undefined} />
        ) : (
          <ListGroup>
            {(cats.data ?? []).map((c) => (
              <ListRow key={c.id} icon="receipt" title={c.name} right={!c.is_active ? <StatusBadge label="Pasif" tone="neutral" size="S" /> : undefined} onPress={isAdmin ? () => { setCat(c); setOpen(true); } : undefined} />
            ))}
          </ListGroup>
        )}
      </ScrollScreen>
      {isAdmin ? <View pointerEvents="box-none" style={{ position: "absolute", right: 16, bottom: 32 }}><Fab label="Yeni kategori" onPress={() => { setCat(null); setOpen(true); }} /></View> : null}
      <CategorySheet category={cat} visible={open} onClose={() => setOpen(false)} />
    </Screen>
  );
}
