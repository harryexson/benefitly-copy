import { Link } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, RefreshControl, StyleSheet, Text, TextInput, View } from "react-native";
import { listCampaigns, type CampaignSummary } from "../../lib/backend";
import { colors } from "../../lib/theme";

const categories = [
  { value: undefined, label: "All" },
  { value: "emergency", label: "Emergency" },
  { value: "medical", label: "Medical" },
  { value: "memorial", label: "Memorial" },
  { value: "education", label: "Education" },
  { value: "community", label: "Community" },
  { value: "faith", label: "Faith" },
  { value: "disaster", label: "Disaster" },
];

export default function Discover() {
  const [campaigns, setCampaigns] = useState<CampaignSummary[]>([]);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const load = useCallback(
    async (showSpinner = true) => {
      if (showSpinner) setLoading(true);
      setErrorMessage("");
      try {
        const rows = await listCampaigns({ q: query || undefined, category });
        setCampaigns(rows);
      } catch {
        setErrorMessage("Fundraisers can't be loaded right now.");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [query, category],
  );

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category]);

  return (
    <View style={styles.page}>
      <Text style={styles.title}>Discover causes</Text>
      <TextInput
        accessibilityLabel="Search fundraisers"
        placeholder="Search by cause, place or organizer"
        value={query}
        onChangeText={setQuery}
        onSubmitEditing={() => load()}
        returnKeyType="search"
        style={styles.search}
      />
      <FlatList
        horizontal
        data={categories}
        keyExtractor={(item) => item.label}
        showsHorizontalScrollIndicator={false}
        style={styles.chipRow}
        contentContainerStyle={{ gap: 8 }}
        renderItem={({ item }) => (
          <Pressable onPress={() => setCategory(item.value)} style={[styles.chip, category === item.value && styles.chipActive]}>
            <Text style={[styles.chipText, category === item.value && styles.chipTextActive]}>{item.label}</Text>
          </Pressable>
        )}
      />
      {loading && <ActivityIndicator style={{ marginTop: 24 }} color={colors.blue} />}
      {!loading && errorMessage !== "" && <Text style={styles.copy}>{errorMessage}</Text>}
      {!loading && errorMessage === "" && campaigns.length === 0 && <Text style={styles.copy}>No fundraisers match yet.</Text>}
      <FlatList
        data={campaigns}
        keyExtractor={(item) => item.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(false); }} />}
        contentContainerStyle={{ gap: 14, paddingBottom: 24 }}
        renderItem={({ item }) => {
          const funded = item.goal_amount > 0 ? Math.min(100, Math.round((item.raised_amount / item.goal_amount) * 100)) : 0;
          return (
            <Link href={{ pathname: "/campaign/[slug]", params: { slug: item.slug } }} style={styles.link}>
              <View style={styles.card}>
                <Text style={styles.category}>{item.category.toUpperCase()}</Text>
                <Text style={styles.name}>{item.title}</Text>
                <View style={styles.progressTrack}>
                  <View style={[styles.progress, { width: `${funded}%` }]} />
                </View>
                <Text style={styles.meta}>
                  ${(item.raised_amount / 100).toLocaleString()} raised of ${(item.goal_amount / 100).toLocaleString()}
                </Text>
                <Text style={styles.action}>View campaign ›</Text>
              </View>
            </Link>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, padding: 24, gap: 10, backgroundColor: colors.paper },
  title: { fontSize: 34, fontWeight: "700", color: colors.ink },
  copy: { fontSize: 16, lineHeight: 24, color: colors.muted, marginBottom: 6 },
  search: { borderWidth: 1, borderColor: colors.line, borderRadius: 12, padding: 14, fontSize: 16, color: colors.ink },
  chipRow: { flexGrow: 0, marginBottom: 4 },
  chip: { borderColor: colors.line, borderWidth: 1, borderRadius: 99, paddingHorizontal: 14, paddingVertical: 8 },
  chipActive: { backgroundColor: "#E8EEFF", borderColor: colors.blue },
  chipText: { color: "#42526A", fontWeight: "700", fontSize: 13 },
  chipTextActive: { color: "#2148C9" },
  link: { textDecorationLine: "none" },
  card: { borderWidth: 1, borderColor: colors.line, padding: 18, borderRadius: 13, gap: 8 },
  category: { fontSize: 11, fontWeight: "800", color: colors.seaDark, letterSpacing: 0.6 },
  name: { fontSize: 20, fontWeight: "600", color: colors.ink },
  progressTrack: { height: 6, backgroundColor: "#E7ECF4", borderRadius: 99 },
  progress: { height: 6, backgroundColor: colors.blue, borderRadius: 99 },
  meta: { color: "#64748B" },
  action: { color: colors.blue, fontWeight: "800", marginTop: 5 },
});
