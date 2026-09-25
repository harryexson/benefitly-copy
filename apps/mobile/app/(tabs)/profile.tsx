import { useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { authClient } from "../../lib/auth-client";
import { colors } from "../../lib/theme";

export default function Profile() {
  const { data: session, isPending } = authClient.useSession();
  const [mode, setMode] = useState<"sign-in" | "sign-up">("sign-in");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<"idle" | "submitting" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");

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
        <View style={styles.info}>
          <Text style={styles.infoTitle}>Coming soon</Text>
          <Text style={styles.infoCopy}>Push notification preferences, payment/payout status and account settings will live here.</Text>
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
  copy: { fontSize: 18, fontWeight: "600", color: colors.ink },
  copyMuted: { fontSize: 15, color: colors.muted },
  input: { borderWidth: 1, borderColor: colors.line, borderRadius: 12, padding: 14, fontSize: 16, color: colors.ink },
  button: { backgroundColor: colors.blue, borderRadius: 12, padding: 16, marginTop: 4 },
  buttonText: { color: "#FFFFFF", fontWeight: "800", fontSize: 16, textAlign: "center" },
  secondaryButton: { borderWidth: 1, borderColor: colors.line, borderRadius: 12, paddingVertical: 14, alignItems: "center", marginTop: 8 },
  secondaryButtonText: { color: colors.ink, fontWeight: "700" },
  error: { color: "#B42318" },
  switchText: { color: colors.blue, fontWeight: "700", textAlign: "center", marginTop: 4 },
  info: { backgroundColor: colors.mist, borderRadius: 14, padding: 16, gap: 6, marginTop: 20 },
  infoTitle: { color: colors.ink, fontWeight: "800" },
  infoCopy: { color: colors.muted, lineHeight: 20 },
});
