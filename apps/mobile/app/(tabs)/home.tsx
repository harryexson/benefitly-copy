import { Link } from "expo-router";
import { useEffect, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { listCampaigns, type CampaignSummary } from "../../lib/backend";
import { colors } from "../../lib/theme";

export default function Home() {
  const [featured, setFeatured] = useState<CampaignSummary | null>(null);

  useEffect(() => {
    listCampaigns()
      .then((rows) => setFeatured(rows[0] ?? null))
      .catch(() => setFeatured(null));
  }, []);

  return (
    <ScrollView contentContainerStyle={s.page}>
      <Text style={s.brand}>↗ Benefitly</Text>
      <Text style={s.title}>People helping people move forward.</Text>
      <Text style={s.copy}>Find a community cause, give with clarity, or start a fundraiser of your own.</Text>
      <View style={s.card}>
        <Text style={s.eyebrow}>Featured fundraiser</Text>
        {featured ? (
          <>
            <Text style={s.cardTitle}>{featured.title}</Text>
            <Text style={s.meta}>
              ${(featured.raised_amount / 100).toLocaleString()} raised of ${(featured.goal_amount / 100).toLocaleString()}
            </Text>
            <Link style={s.link} href={{ pathname: "/campaign/[slug]", params: { slug: featured.slug } }}>
              View this fundraiser
            </Link>
          </>
        ) : (
          <Text style={s.meta}>Discover fundraisers to find something to support.</Text>
        )}
        <Link style={s.link} href="/discover">
          Discover fundraisers
        </Link>
      </View>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  page: { padding: 24, gap: 20, backgroundColor: colors.paper, flexGrow: 1 },
  brand: { fontSize: 21, fontWeight: "700", color: colors.ink },
  title: { fontSize: 40, lineHeight: 44, fontWeight: "600", color: colors.ink },
  copy: { fontSize: 17, lineHeight: 25, color: colors.muted },
  card: { backgroundColor: "#edf3ff", padding: 22, borderRadius: 14, gap: 10 },
  eyebrow: { color: colors.sea, fontWeight: "700", fontSize: 12, textTransform: "uppercase" },
  cardTitle: { fontSize: 23, fontWeight: "600", color: colors.ink },
  meta: { color: colors.muted },
  link: { color: colors.blue, fontWeight: "700" },
});
