import { useState } from "react";
import { USER_ROLE_LABELS } from "@/lib/constants";
import type { Profile } from "@/lib/database.types";
import { useSessionContext } from "~/lib/auth/session";
import { useMembers2 } from "~/lib/data/management";
import { usePendingInvites } from "~/lib/data/team";
import { StatusBadge } from "~/ui/Badge";
import { Button } from "~/ui/Button";
import { ErrorState, RowSkeleton } from "~/ui/Feedback";
import { ListGroup, ListRow } from "~/ui/List";
import { InlineHeader, Screen, ScrollScreen } from "~/ui/Screen";
import { Text } from "~/ui/Text";
import { InviteSheet, MemberSheet, PendingInviteDialog } from "~/features/settings-sheets";

/**
 * Kullanıcılar: rol / finans yetkisi / aktiflik (RLS + enforce_profile_guard) ve davet
 * (sunucu uç noktası: web /api/mobile/team; service_role anahtarı mobilde yok).
 */
export default function UsersSettings() {
  const { isAdmin } = useSessionContext();
  const members = useMembers2();
  const pending = usePendingInvites(isAdmin);
  const [invite, setInvite] = useState(false);
  const [member, setMember] = useState<Profile | null>(null);
  const [pendingMember, setPendingMember] = useState<Profile | null>(null);
  return (
    <Screen>
      <InlineHeader title="Kullanıcılar" />
      <ScrollScreen onRefresh={() => { members.refetch(); pending.refetch(); }} refreshing={members.isRefetching} bottomPad={40}>
        {isAdmin ? <Button label="Kullanıcı davet et" icon="user-plus" size="M" onPress={() => setInvite(true)} /> : null}
        {members.isError ? (
          <ErrorState message={members.error instanceof Error ? members.error.message : undefined} onRetry={() => members.refetch()} />
        ) : members.isLoading ? (
          <ListGroup><RowSkeleton /><RowSkeleton /></ListGroup>
        ) : (
          <ListGroup>
            {(members.data ?? []).map((m) => (
              <ListRow
                key={m.id} icon="user" title={m.full_name} subtitle={USER_ROLE_LABELS[m.role]}
                right={<>{pending.data?.has(m.id) ? <StatusBadge label="Davet bekliyor" tone="warning" size="S" /> : null}{m.role === "staff" && m.can_view_finance ? <StatusBadge label="Finans" tone="info" size="S" /> : null}{!m.is_active ? <StatusBadge label="Pasif" tone="neutral" size="S" /> : null}</>}
                onPress={isAdmin ? () => (pending.data?.has(m.id) ? setPendingMember(m) : setMember(m)) : undefined}
              />
            ))}
          </ListGroup>
        )}
        {isAdmin && pending.isError ? <Text variant="footnote" color="textTertiary">Bekleyen davetler okunamadı: {pending.error instanceof Error ? pending.error.message : "sunucuya ulaşılamadı"}</Text> : null}
      </ScrollScreen>
      <InviteSheet visible={invite} onClose={() => setInvite(false)} />
      <MemberSheet member={member} visible={!!member} onClose={() => setMember(null)} />
      <PendingInviteDialog member={pendingMember} onClose={() => setPendingMember(null)} />
    </Screen>
  );
}
