import { Stack, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { getCampaignBySlug, reportCampaign } from "../../../lib/backend";
import { colors } from "../../../lib/theme";

const reasons = [
  { value: "fraud", label: "Fraud or scam" },
  { value: "misuse_of_funds", label: "Misuse of funds" },
  { value: "inappropriate_content", label: "Inappropriate content" },
  { value: "impersonation", label: "Impersonation" },
  { value: "duplicate", label: "Duplicate campaign" },
  { value: "other", label: "Other" },
];

export default function ReportCampaign() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const [campaignId, setCampaignId] = useState<string | null>(null);
  const [reason, setReason] = useState("fraud");
  const [details, setDetails] = useState("");
  const [status, setStatus] = useState<"loading" | "idle" | "submitting" | "done" | "error">("loading");

  useEffect(() => {
    if (!slug) return;
    getCampaignBySlug(slug)
      .then((campaign) => {
        setCampaignId(campaign.id);
        setStatus("idle");
      })
      .catch(() => setStatus("error"));
  }, [slug]);

  async function submit() {
    if (!campaignId) return;
    setStatus("submitting");
    try {
      await reportCampaign(campaignId, { reason, details: details || undefined });
      setStatus("done");
    } catch {
      setStatus("error");
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.page}>
      <Stack.Screen options={{ headerShown: true, title: "Report campaign" }} />
      {status === "loading" && <ActivityIndicator color={colors.blue} />}
      {status === "done" && <Text style={styles.copy}>Thanks for the report. Our trust and safety team will review this campaign.</Text>}
      {status !== "loading" && status !== "done" && (
        <>
          <Text style={styles.title}>What&apos;s wrong?</Text>
          <View style={styles.pills}>
            {reasons.map((item) => (
              <Pressable key={item.value} onPress={() => setReason(item.value)} style={[styles.pill, reason === item.value && styles.pillActive]}>
                <Text style={[styles.pillText, reason === item.value && styles.pillTextActive]}>{item.label}</Text>
              </Pressable>
            ))}
          </View>
          <Text style={styles.label}>Details (optional)</Text>
          <TextInput value={details} onChangeText={setDetails} multiline numberOfLines={5} style={styles.textarea} maxLength={2000} />
          <Pressable accessibilityRole="button" onPress={submit} disabled={status === "submitting" || !campaignId} style={styles.button}>
            <Text style={styles.buttonText}>{status === "submitting" ? "Submitting…" : "Submit report"}</Text>
          </Pressable>
          {status === "error" && <Text style={styles.copy}>Something went wrong. Please try again.</Text>}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { padding: 22, gap: 14, backgroundColor: colors.paper, flexGrow: 1 },
  title: { color: colors.ink, fontWeight: "700", fontSize: 22 },
  copy: { color: colors.muted, fontSize: 16, lineHeight: 24 },
  label: { color: colors.ink, fontWeight: "700", fontSize: 15 },
  pills: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  pill: { borderColor: colors.line, borderWidth: 1, borderRadius: 99, paddingHorizontal: 14, paddingVertical: 10 },
  pillActive: { backgroundColor: "#E8EEFF", borderColor: colors.blue },
  pillText: { color: "#42526A", fontWeight: "700" },
  pillTextActive: { color: "#2148C9" },
  textarea: { borderWidth: 1, borderColor: colors.line, borderRadius: 12, padding: 14, minHeight: 120, textAlignVertical: "top", color: colors.ink },
  button: { backgroundColor: colors.blue, borderRadius: 12, padding: 16, marginTop: 8 },
  buttonText: { color: "#FFFFFF", fontWeight: "800", fontSize: 16, textAlign: "center" },
});
