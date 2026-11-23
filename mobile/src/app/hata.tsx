import { View } from "react-native";
import { useSessionContext } from "~/lib/auth/session";
import { Button } from "~/ui/Button";
import { ErrorState } from "~/ui/Feedback";
import { Screen } from "~/ui/Screen";

export default function SessionErrorScreen() {
  const { state, reload, signOut } = useSessionContext();
  return (
    <Screen bottomInset>
      <View style={{ flex: 1, justifyContent: "center", padding: 16, gap: 12 }}>
        <ErrorState message={state.status === "error" ? state.message : undefined} onRetry={reload} />
        <Button label="Çıkış yap" variant="ghost" onPress={signOut} />
      </View>
    </Screen>
  );
}
