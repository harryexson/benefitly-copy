import { Link, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import * as Crypto from "expo-crypto";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { authClient } from "../../lib/auth-client";
import { getMyCampaigns, registerOrganizer, requestPayout, type MyCampaignsResult } from "../../lib/backend";
import { colors } from "../../lib/theme";

export default function Activity() {
  const { data: session } = authClient.useSession();
  const [data, setData] = useState<MyCampaignsResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [pendingPayout, setPendingPayout] = useState<string | null>(null);

  const load = useCallback(() => {
    if (!session?.user) {
      setLoading(false);
      return;
    }
    setLoading(true);
    getMyCampaigns()
      .then(setData)
      .catch(() => setErrorMessage("Your activity can't be loaded right now."))
      .finally(() => setLoading(false));
  }, [session?.user]);

  useFocusEffect(load);

  if (!session?.user) {
    return (
      <View style={styles.page}>
        <Text style={styles.title}>Activity</Text>
        <Text style={styles.copy}>Sign in from the Profile tab to see campaign updates, donation receipts and payout status.</Text>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.blue} />
      </View>
    );
  }

  async function startOnboarding() {
    try {
      const result = await registerOrganizer({ legalName: "Pending onboarding", country: "US", entityType: "individual", provider: "stripe_connect" });
      // A production build would open result.onboardingUrl via expo-web-browser here.
      setErrorMessage(`Onboarding link ready: ${result.onboardingUrl}`);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Payouts aren't configured on this server yet.");
    }
  }

  async function payout(campaignId: string, amount: number, currency: string) {
    if (!data?.paymentAccount) return;
    setPendingPayout(campaignId);
    try {
      await requestPayout({ campaignId, paymentAccountId: data.paymentAccount.id, amount, currency, idempotencyKey: Crypto.randomUUID() });
      load();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Payout request failed.");
    } finally {
      setPendingPayout(null);
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.page}>
      <Text style={styles.title}>Activity</Text>

      {!data?.paymentAccount ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Set up payouts</Text>
          <Text style={styles.copy}>Connect a payment account to receive funds raised on your campaigns.</Text>
          <Pressable accessibilityRole="button" onPress={startOnboarding} style={styles.button}>
            <Text style={styles.buttonText}>Connect a payment account</Text>
          </Pressable>
        </View>
      ) : (
        <Text style={styles.copy}>
          Payout account: {data.paymentAccount.provider} ({data.paymentAccount.status})
        </Text>
      )}

      {errorMessage !== "" && <Text style={styles.copy}>{errorMessage}</Text>}

      <Text style={styles.section}>Your campaigns</Text>
      {data?.campaigns.length === 0 && <Text style={styles.copy}>You haven&apos;t started a fundraiser yet.</Text>}
      {data?.campaigns.map((campaign) => (
        <Link key={campaign.id} href={{ pathname: "/campaign/[slug]", params: { slug: campaign.slug } }} style={{ textDecorationLine: "none" }}>
          <View style={styles.card}>
            <Text style={styles.eyebrow}>
              {campaign.status}
              {campaign.review_status ? ` · ${campaign.review_status}` : ""}
            </Text>
            <Text style={styles.cardTitle}>{campaign.title}</Text>
            <Text style={styles.copy}>
              ${(campaign.raised_amount / 100).toLocaleString()} raised of ${(campaign.goal_amount / 100).toLocaleString()}
            </Text>
            <Link href={{ pathname: "/campaign/[slug]/manage", params: { slug: campaign.slug } }} style={styles.secondaryButton}>
              <Text style={styles.secondaryButtonText}>Manage photos, video &amp; updates</Text>
            </Link>
            {campaign.status === "published" && data.paymentAccount?.status === "active" && campaign.raised_amount > 0 && (
              <Pressable
                accessibilityRole="button"
                onPress={(event) => {
                  event.preventDefault();
                  payout(campaign.id, campaign.raised_amount, campaign.currency);
                }}
                style={styles.secondaryButton}
              >
                <Text style={styles.secondaryButtonText}>
                  {pendingPayout === campaign.id ? "Requesting…" : `Request payout of $${(campaign.raised_amount / 100).toLocaleString()}`}
                </Text>
              </Pressable>
            )}
          </View>
        </Link>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.paper },
  page: { padding: 24, gap: 14, backgroundColor: colors.paper, flexGrow: 1 },
  title: { fontSize: 34, fontWeight: "700", color: colors.ink },
  section: { fontSize: 22, fontWeight: "700", color: colors.ink, marginTop: 10 },
  copy: { fontSize: 16, lineHeight: 24, color: colors.muted },
  card: { borderWidth: 1, borderColor: colors.line, borderRadius: 13, padding: 18, gap: 8 },
  eyebrow: { color: colors.seaDark, fontWeight: "800", fontSize: 11, textTransform: "uppercase" },
  cardTitle: { fontSize: 19, fontWeight: "600", color: colors.ink },
  button: { backgroundColor: colors.blue, borderRadius: 12, padding: 14, marginTop: 6 },
  buttonText: { color: "#FFFFFF", fontWeight: "800", textAlign: "center" },
  secondaryButton: { borderWidth: 1, borderColor: colors.line, borderRadius: 10, paddingVertical: 10, alignItems: "center", marginTop: 4 },
  secondaryButtonText: { color: colors.ink, fontWeight: "700", fontSize: 13 },
});
