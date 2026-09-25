import { Stack, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import * as Crypto from "expo-crypto";
import { getCampaignBySlug, createDonation, type CampaignSummary, type DonationResult } from "../../lib/backend";
import { colors } from "../../lib/theme";

const amounts = [2500, 5000, 10000, 25000];
const contributionRates = [0, 0.1, 0.15, 0.18];

export default function Donate() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const [campaign, setCampaign] = useState<CampaignSummary | null>(null);
  const [amount, setAmount] = useState(5000);
  const [rate, setRate] = useState(0.15);
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"loading" | "idle" | "submitting" | "done" | "error">("loading");
  const [errorMessage, setErrorMessage] = useState("");
  const [result, setResult] = useState<DonationResult | null>(null);

  useEffect(() => {
    if (!slug) return;
    getCampaignBySlug(slug)
      .then((data) => {
        setCampaign(data);
        setStatus("idle");
      })
      .catch(() => setStatus("error"));
  }, [slug]);

  const contribution = Math.round(amount * rate);

  async function submit() {
    if (!campaign) return;
    setStatus("submitting");
    setErrorMessage("");
    try {
      const donation = await createDonation({
        campaignId: campaign.id,
        amount,
        currency: campaign.currency,
        platformContribution: contribution,
        idempotencyKey: Crypto.randomUUID(),
        donorEmail: email || undefined,
      });
      setResult(donation);
      setStatus("done");
    } catch (error) {
      setStatus("error");
      setErrorMessage(error instanceof Error ? error.message : "Something went wrong.");
    }
  }

  if (status === "loading") {
    return (
      <View style={styles.center}>
        <Stack.Screen options={{ headerShown: true, title: "Donate" }} />
        <ActivityIndicator color={colors.blue} />
      </View>
    );
  }

  if (!campaign) {
    return (
      <View style={styles.center}>
        <Stack.Screen options={{ headerShown: true, title: "Donate" }} />
        <Text style={styles.copy}>This campaign can&apos;t be loaded right now.</Text>
      </View>
    );
  }

  if (status === "done" && result) {
    return (
      <ScrollView contentContainerStyle={styles.page}>
        <Stack.Screen options={{ headerShown: true, title: "Donate" }} />
        <Text style={styles.title}>Almost there</Text>
        <Text style={styles.copy}>
          Charging ${(result.grossCharge / 100).toLocaleString()} — ${(result.netToCampaign / 100).toLocaleString()} to the campaign
          {result.platformContribution > 0 ? ` and $${(result.platformContribution / 100).toLocaleString()} as your optional contribution.` : "."}
        </Text>
        <View style={styles.info}>
          <Text style={styles.infoTitle}>Next step</Text>
          <Text style={styles.infoCopy}>
            A production build would now open {result.provider === "stripe_connect" ? "the Stripe payment sheet" : "the Adyen Drop-in"} to collect
            card details and complete this charge.
          </Text>
        </View>
      </ScrollView>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.page} keyboardShouldPersistTaps="handled">
      <Stack.Screen options={{ headerShown: true, title: "Donate" }} />
      <Text style={styles.eyebrow}>YOU ARE SUPPORTING</Text>
      <Text style={styles.title}>{campaign.title}</Text>
      <Text style={styles.label}>Donation amount (USD)</Text>
      <View style={styles.amountRow}>
        <Text style={styles.currency}>$</Text>
        <TextInput
          accessibilityLabel="Donation amount in US dollars"
          keyboardType="decimal-pad"
          value={(amount / 100).toString()}
          onChangeText={(text) => setAmount(Math.max(100, Math.round(Number(text || 0) * 100)))}
          style={styles.amountInput}
        />
      </View>
      <View style={styles.pills}>
        {amounts.map((value) => (
          <Pressable key={value} accessibilityRole="button" onPress={() => setAmount(value)} style={[styles.pill, amount === value && styles.pillActive]}>
            <Text style={[styles.pillText, amount === value && styles.pillTextActive]}>${(value / 100).toLocaleString()}</Text>
          </Pressable>
        ))}
      </View>

      <Text style={styles.label}>Add an optional contribution to keep Benefitly free</Text>
      <View style={styles.pills}>
        {contributionRates.map((value) => (
          <Pressable key={value} accessibilityRole="button" onPress={() => setRate(value)} style={[styles.pill, rate === value && styles.pillActive]}>
            <Text style={[styles.pillText, rate === value && styles.pillTextActive]}>
              {value === 0 ? "No thanks" : `${Math.round(value * 100)}%`}
            </Text>
          </Pressable>
        ))}
      </View>

      <Text style={styles.label}>Email (for your receipt)</Text>
      <TextInput accessibilityLabel="Email" keyboardType="email-address" autoCapitalize="none" value={email} onChangeText={setEmail} style={styles.amountRow} />

      <View style={styles.info}>
        <Text style={styles.infoTitle}>Total today: ${((amount + contribution) / 100).toLocaleString()}</Text>
        <Text style={styles.infoCopy}>Benefitly never deducts a fee from the campaign -- only your optional contribution above supports the platform.</Text>
      </View>

      <Pressable accessibilityRole="button" onPress={submit} disabled={status === "submitting"} style={styles.button}>
        <Text style={styles.buttonText}>{status === "submitting" ? "Processing…" : "Continue to secure payment"}</Text>
      </Pressable>
      {status === "error" && <Text style={styles.notice}>{errorMessage}</Text>}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.paper, padding: 24 },
  page: { padding: 22, gap: 14, backgroundColor: colors.paper, flexGrow: 1 },
  eyebrow: { color: colors.seaDark, fontWeight: "800", fontSize: 12, letterSpacing: 0.8, marginTop: 6 },
  title: { color: colors.ink, fontWeight: "700", fontSize: 28 },
  copy: { color: colors.muted, fontSize: 16, lineHeight: 24 },
  label: { color: colors.ink, fontWeight: "700", fontSize: 15 },
  amountRow: { flexDirection: "row", alignItems: "center", borderWidth: 1, borderColor: "#CCD6E5", borderRadius: 12, paddingHorizontal: 16 },
  currency: { fontSize: 24, color: colors.ink, fontWeight: "700" },
  amountInput: { color: colors.ink, fontWeight: "700", fontSize: 28, padding: 14, flex: 1 },
  pills: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  pill: { borderColor: "#CCD6E5", borderWidth: 1, borderRadius: 99, paddingHorizontal: 16, paddingVertical: 10 },
  pillActive: { backgroundColor: "#E8EEFF", borderColor: colors.blue },
  pillText: { color: "#42526A", fontWeight: "700" },
  pillTextActive: { color: "#2148C9" },
  info: { backgroundColor: colors.mist, borderRadius: 14, padding: 16, gap: 6, marginTop: 10 },
  infoTitle: { color: colors.ink, fontWeight: "800" },
  infoCopy: { color: colors.muted, lineHeight: 20 },
  button: { backgroundColor: colors.blue, borderRadius: 12, padding: 16, marginTop: 12 },
  buttonText: { color: "#FFFFFF", fontWeight: "800", fontSize: 16, textAlign: "center" },
  notice: { color: "#42526A", backgroundColor: "#FFF7DD", padding: 12, borderRadius: 10, lineHeight: 20 },
});
