import { router } from "expo-router";
import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { authClient } from "../../lib/auth-client";
import { createCampaign } from "../../lib/backend";
import { colors } from "../../lib/theme";

const categories = ["emergency", "medical", "memorial", "education", "community", "faith", "disaster"];

export default function Create() {
  const { data: session } = authClient.useSession();
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("community");
  const [location, setLocation] = useState("");
  const [goal, setGoal] = useState("");
  const [story, setStory] = useState("");
  const [beneficiaryName, setBeneficiaryName] = useState("");
  const [status, setStatus] = useState<"idle" | "submitting" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");

  if (!session?.user) {
    return (
      <View style={styles.page}>
        <Text style={styles.title}>Start a fundraiser</Text>
        <Text style={styles.copy}>Sign in from the Profile tab to create a fundraiser, choose a beneficiary and set a clear goal.</Text>
      </View>
    );
  }

  async function submit() {
    setStatus("submitting");
    setErrorMessage("");
    try {
      const campaign = await createCampaign({
        title,
        category,
        location: location || undefined,
        currency: "USD",
        goalAmount: Math.round(Number(goal || 0) * 100),
        story,
        beneficiary: { name: beneficiaryName },
      });
      router.push({ pathname: "/campaign/[slug]", params: { slug: campaign.slug } });
    } catch (error) {
      setStatus("error");
      setErrorMessage(error instanceof Error ? error.message : "Something went wrong.");
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.page} keyboardShouldPersistTaps="handled">
      <Text style={styles.title}>Start a fundraiser</Text>
      <Text style={styles.label}>Campaign title</Text>
      <TextInput value={title} onChangeText={setTitle} style={styles.input} placeholder="Help Harbor House reopen its kitchen" />

      <Text style={styles.label}>Category</Text>
      <View style={styles.pills}>
        {categories.map((item) => (
          <Pressable key={item} onPress={() => setCategory(item)} style={[styles.pill, category === item && styles.pillActive]}>
            <Text style={[styles.pillText, category === item && styles.pillTextActive]}>{item}</Text>
          </Pressable>
        ))}
      </View>

      <Text style={styles.label}>Location (optional)</Text>
      <TextInput value={location} onChangeText={setLocation} style={styles.input} placeholder="City, State" />

      <Text style={styles.label}>Goal (USD)</Text>
      <TextInput value={goal} onChangeText={setGoal} style={styles.input} keyboardType="decimal-pad" placeholder="5000" />

      <Text style={styles.label}>Tell your story</Text>
      <TextInput value={story} onChangeText={setStory} style={styles.textarea} multiline numberOfLines={8} />

      <Text style={styles.label}>Who does this fundraiser benefit?</Text>
      <TextInput value={beneficiaryName} onChangeText={setBeneficiaryName} style={styles.input} />

      <Text style={styles.copy}>Every campaign is reviewed by our team before it goes live -- usually within one business day.</Text>

      <Pressable accessibilityRole="button" onPress={submit} disabled={status === "submitting"} style={styles.button}>
        <Text style={styles.buttonText}>{status === "submitting" ? "Submitting…" : "Submit for review"}</Text>
      </Pressable>
      {status === "error" && <Text style={styles.error}>{errorMessage}</Text>}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { padding: 24, gap: 12, backgroundColor: colors.paper, flexGrow: 1 },
  title: { fontSize: 34, fontWeight: "700", color: colors.ink },
  copy: { fontSize: 15, lineHeight: 22, color: colors.muted },
  label: { color: colors.ink, fontWeight: "700", fontSize: 15, marginTop: 6 },
  input: { borderWidth: 1, borderColor: colors.line, borderRadius: 12, padding: 14, fontSize: 16, color: colors.ink },
  textarea: { borderWidth: 1, borderColor: colors.line, borderRadius: 12, padding: 14, minHeight: 140, textAlignVertical: "top", color: colors.ink },
  pills: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  pill: { borderColor: colors.line, borderWidth: 1, borderRadius: 99, paddingHorizontal: 14, paddingVertical: 8 },
  pillActive: { backgroundColor: "#E8EEFF", borderColor: colors.blue },
  pillText: { color: "#42526A", fontWeight: "700", textTransform: "capitalize" },
  pillTextActive: { color: "#2148C9" },
  button: { backgroundColor: colors.blue, borderRadius: 12, padding: 16, marginTop: 8 },
  buttonText: { color: "#FFFFFF", fontWeight: "800", fontSize: 16, textAlign: "center" },
  error: { color: "#B42318" },
});
