import { Link, Stack, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, Image, Pressable, ScrollView, Share, StyleSheet, Text, View } from "react-native";
import { getCampaignBySlug, type CampaignSummary } from "../../lib/backend";
import { colors } from "../../lib/theme";

const FALLBACK_IMAGE = "https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?auto=format&fit=crop&w=1200&q=85";
const WEB_ORIGIN = process.env.EXPO_PUBLIC_APP_URL || "https://benefitly.app";

export default function CampaignDetail() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const [campaign, setCampaign] = useState<CampaignSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    if (!slug) return;
    getCampaignBySlug(slug)
      .then(setCampaign)
      .catch(() => setErrorMessage("This campaign can't be loaded right now."))
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading) {
    return (
      <View style={styles.center}>
        <Stack.Screen options={{ headerShown: true, title: "Campaign" }} />
        <ActivityIndicator color={colors.blue} />
      </View>
    );
  }

  if (!campaign) {
    return (
      <View style={styles.center}>
        <Stack.Screen options={{ headerShown: true, title: "Campaign" }} />
        <Text style={styles.copy}>{errorMessage || "Campaign not found."}</Text>
      </View>
    );
  }

  const funded = campaign.goal_amount > 0 ? Math.min(100, Math.round((campaign.raised_amount / campaign.goal_amount) * 100)) : 0;
  const shareUrl = `${WEB_ORIGIN}/f/${campaign.slug}`;
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(shareUrl)}`;

  return (
    <ScrollView contentContainerStyle={styles.page}>
      <Stack.Screen options={{ headerShown: true, title: "Campaign" }} />
      <Image source={{ uri: campaign.image ?? FALLBACK_IMAGE }} accessibilityLabel="" style={styles.image} />
      <View style={styles.category}>
        <Text style={styles.categoryText}>{campaign.category.toUpperCase()}</Text>
      </View>
      <Text style={styles.title}>{campaign.title}</Text>
      <Text style={styles.organizer}>
        Organized by {campaign.organizer}
        {campaign.location ? ` in ${campaign.location}` : ""}
      </Text>
      <View style={styles.progressTrack}>
        <View style={[styles.progress, { width: `${funded}%` }]} />
      </View>
      <View style={styles.stats}>
        <Text style={styles.raised}>${(campaign.raised_amount / 100).toLocaleString()}</Text>
        <Text style={styles.goal}> raised of ${(campaign.goal_amount / 100).toLocaleString()}</Text>
      </View>
      <Text style={styles.supporters}>{campaign.supporter_count} supporters</Text>
      <Text style={styles.section}>Why this matters</Text>
      <Text style={styles.copy}>{campaign.story}</Text>

      <Link href={{ pathname: "/donate/[slug]", params: { slug: campaign.slug } }} style={styles.button}>
        Donate securely
      </Link>

      <View style={styles.row}>
        <Pressable
          accessibilityRole="button"
          onPress={() => Share.share({ message: `${campaign.title} — ${shareUrl}`, url: shareUrl })}
          style={styles.secondaryButton}
        >
          <Text style={styles.secondaryButtonText}>Share fundraiser</Text>
        </Pressable>
        <Link href={{ pathname: "/campaign/[slug]/report", params: { slug: campaign.slug } }} style={styles.secondaryButton}>
          <Text style={styles.secondaryButtonText}>Report</Text>
        </Link>
      </View>

      <View style={styles.qrCard}>
        <Text style={styles.qrLabel}>Scan to share this fundraiser</Text>
        <Image source={{ uri: qrUrl }} style={styles.qrImage} accessibilityLabel={`QR code linking to ${shareUrl}`} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.paper, padding: 24 },
  page: { padding: 20, gap: 12, backgroundColor: colors.paper, flexGrow: 1 },
  image: { width: "100%", height: 230, borderRadius: 18, backgroundColor: colors.mist },
  category: { alignSelf: "flex-start", paddingHorizontal: 10, paddingVertical: 6, borderRadius: 30, backgroundColor: "#E4F7F1" },
  categoryText: { color: colors.seaDark, fontWeight: "800", fontSize: 12 },
  title: { color: colors.ink, fontSize: 30, lineHeight: 36, fontWeight: "700" },
  organizer: { color: colors.muted, fontSize: 15 },
  progressTrack: { height: 8, backgroundColor: "#E7ECF4", borderRadius: 99, marginTop: 8 },
  progress: { height: 8, backgroundColor: colors.blue, borderRadius: 99 },
  stats: { flexDirection: "row", alignItems: "baseline" },
  raised: { color: colors.ink, fontSize: 22, fontWeight: "800" },
  goal: { color: colors.muted, fontSize: 15 },
  supporters: { color: colors.muted, fontSize: 14 },
  section: { color: colors.ink, fontSize: 20, fontWeight: "700", marginTop: 18 },
  copy: { color: "#42526A", fontSize: 16, lineHeight: 24 },
  button: { overflow: "hidden", textAlign: "center", backgroundColor: colors.blue, color: "#FFFFFF", paddingVertical: 16, borderRadius: 12, fontWeight: "800", fontSize: 16, marginTop: 18 },
  row: { flexDirection: "row", gap: 10, marginTop: 4 },
  secondaryButton: { flex: 1, borderWidth: 1, borderColor: colors.line, borderRadius: 12, paddingVertical: 14, alignItems: "center" },
  secondaryButtonText: { color: colors.ink, fontWeight: "700" },
  qrCard: { alignItems: "center", gap: 10, marginTop: 20, backgroundColor: colors.mist, borderRadius: 14, padding: 18 },
  qrLabel: { color: colors.muted, fontWeight: "700" },
  qrImage: { width: 160, height: 160 },
});
