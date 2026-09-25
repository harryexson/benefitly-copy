import { useCallback, useEffect, useState } from "react";
import { useFocusEffect } from "expo-router";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { authClient } from "../../lib/auth-client";
import { getMyNotifications, markNotificationRead, type AppNotification } from "../../lib/backend";
import { registerForPushNotifications } from "../../lib/push";
import { colors } from "../../lib/theme";

function notificationText(notification: AppNotification): string {
  const payload = notification.payload;
  switch (notification.type) {
    case "donation_received":
      return `Someone just gave $${(Number(payload.amount ?? 0) / 100).toFixed(2)} to ${payload.campaignTitle ?? "your fundraiser"}.`;
    case "campaign_approved":
      return `${payload.campaignTitle ?? "Your fundraiser"} was approved and is now public.`;
    case "campaign_rejected":
      return `${payload.campaignTitle ?? "Your fundraiser"} needs changes before it can go live.`;
    case "payout_status":
      return `Your payout for ${payload.campaignTitle ?? "your fundraiser"} is now ${payload.status ?? "updated"}.`;
    default:
      return "You have a new update.";
  }
}

export default function Profile() {
  const { data: session, isPending } = authClient.useSession();
  const [mode, setMode] = useState<"sign-in" | "sign-up">("sign-in");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<"idle" | "submitting" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [notifications, setNotifications] = useState<AppNotification[]>([]);

  useEffect(() => {
    if (session?.user) registerForPushNotifications();
  }, [session?.user]);

  const loadNotifications = useCallback(() => {
    if (!session?.user) return;
    getMyNotifications()
      .then(setNotifications)
      .catch(() => {});
  }, [session?.user]);

  useFocusEffect(loadNotifications);

  async function submit() {
    setStatus("submitting");
    setErrorMessage("");
    const { error } = mode === "sign-up" ? await authClient.signUp.email({ name, email, password }) : await authClient.signIn.email({ email, password });
    if (error) {
      setStatus("error");
      setErrorMessage(error.message ?? "Something went wrong.");
      return;
    }
    setStatus("idle");
  }

  async function readNotification(id: string) {
    await markNotificationRead(id).catch(() => {});
    setNotifications((current) => current.map((n) => (n.id === id ? { ...n, read_at: new Date().toISOString() } : n)));
  }

  if (isPending) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.blue} />
      </View>
    );
  }

  if (session?.user) {
    return (
      <ScrollView contentContainerStyle={styles.page}>
        <Text style={styles.title}>Your profile</Text>
        <Text style={styles.copy}>{session.user.name || session.user.email}</Text>
        <Text style={styles.copyMuted}>{session.user.email}</Text>
        <Pressable accessibilityRole="button" style={styles.secondaryButton} onPress={() => authClient.signOut()}>
          <Text style={styles.secondaryButtonText}>Sign out</Text>
        </Pressable>

        <Text style={styles.section}>Notifications</Text>
        {notifications.length === 0 && <Text style={styles.copyMuted}>You&apos;re all caught up.</Text>}
        {notifications.map((notification) => (
          <Pressable key={notification.id} onPress={() => readNotification(notification.id)} style={[styles.notification, !notification.read_at && styles.notificationUnread]}>
            <Text style={styles.notificationText}>{notificationText(notification)}</Text>
            <Text style={styles.copyMuted}>{new Date(notification.created_at).toLocaleDateString()}</Text>
          </Pressable>
        ))}

        <View style={styles.info}>
          <Text style={styles.infoTitle}>Coming soon</Text>
          <Text style={styles.infoCopy}>Payment/payout status details and account settings will live here.</Text>
        </View>
      </ScrollView>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.page} keyboardShouldPersistTaps="handled">
      <Text style={styles.title}>{mode === "sign-up" ? "Create your account" : "Sign in to Benefitly"}</Text>
      {mode === "sign-up" && <TextInput accessibilityLabel="Full name" placeholder="Full name" value={name} onChangeText={setName} style={styles.input} />}
      <TextInput accessibilityLabel="Email" placeholder="Email" autoCapitalize="none" keyboardType="email-address" value={email} onChangeText={setEmail} style={styles.input} />
      <TextInput accessibilityLabel="Password" placeholder="Password" secureTextEntry value={password} onChangeText={setPassword} style={styles.input} />
      <Pressable accessibilityRole="button" onPress={submit} disabled={status === "submitting"} style={styles.button}>
        <Text style={styles.buttonText}>{status === "submitting" ? "Please wait…" : mode === "sign-up" ? "Create account" : "Sign in"}</Text>
      </Pressable>
      {status === "error" && <Text style={styles.error}>{errorMessage}</Text>}
      <Pressable onPress={() => setMode(mode === "sign-up" ? "sign-in" : "sign-up")}>
        <Text style={styles.switchText}>{mode === "sign-up" ? "Already have an account? Sign in" : "New here? Create an account"}</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.paper },
  page: { padding: 24, gap: 14, backgroundColor: colors.paper, flexGrow: 1 },
  title: { fontSize: 34, fontWeight: "700", color: colors.ink },
  section: { fontSize: 20, fontWeight: "700", color: colors.ink, marginTop: 16 },
  copy: { fontSize: 18, fontWeight: "600", color: colors.ink },
  copyMuted: { fontSize: 15, color: colors.muted },
  input: { borderWidth: 1, borderColor: colors.line, borderRadius: 12, padding: 14, fontSize: 16, color: colors.ink },
  button: { backgroundColor: colors.blue, borderRadius: 12, padding: 16, marginTop: 4 },
  buttonText: { color: "#FFFFFF", fontWeight: "800", fontSize: 16, textAlign: "center" },
  secondaryButton: { borderWidth: 1, borderColor: colors.line, borderRadius: 12, paddingVertical: 14, alignItems: "center", marginTop: 8 },
  secondaryButtonText: { color: colors.ink, fontWeight: "700" },
  error: { color: "#B42318" },
  switchText: { color: colors.blue, fontWeight: "700", textAlign: "center", marginTop: 4 },
  notification: { borderWidth: 1, borderColor: colors.line, borderRadius: 10, padding: 12, gap: 4 },
  notificationUnread: { backgroundColor: "#EDF3FF", borderColor: colors.blue },
  notificationText: { color: colors.ink, fontSize: 14 },
  info: { backgroundColor: colors.mist, borderRadius: 14, padding: 16, gap: 6, marginTop: 20 },
  infoTitle: { color: colors.ink, fontWeight: "800" },
  infoCopy: { color: colors.muted, lineHeight: 20 },
});
