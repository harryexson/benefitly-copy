import { Link, Stack, useLocalSearchParams } from "expo-router";
import { Image, ScrollView, StyleSheet, Text, View } from "react-native";

const image = require("../../assets/community-kitchen.png");

export default function CampaignDetail() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const title = slug === "harbor-house" ? "Help Harbor House reopen its kitchen" : "A community cause that needs your help";

  return (
    <ScrollView contentContainerStyle={styles.page}>
      <Stack.Screen options={{ headerShown: true, title: "Campaign" }} />
      <Image source={image} accessibilityLabel="Volunteers preparing a community meal" style={styles.image} />
      <View style={styles.category}><Text style={styles.categoryText}>COMMUNITY</Text></View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.organizer}>Organized by Harbor House Community</Text>
      <View style={styles.progressTrack}><View style={styles.progress} /></View>
      <View style={styles.stats}><Text style={styles.raised}>$1,842</Text><Text style={styles.goal}> raised of $2,500</Text></View>
      <Text style={styles.supporters}>48 supporters · 12 days left</Text>
      <Text style={styles.section}>Why this matters</Text>
      <Text style={styles.copy}>Harbor House provides warm meals and a place to connect for neighbors facing a difficult season. Gifts will help reopen the kitchen and cover the first month of supplies.</Text>
      <Link href={{ pathname: "/donate/[slug]", params: { slug: slug ?? "harbor-house" } }} style={styles.button}>Donate securely</Link>
      <Text style={styles.note}>Payment is not enabled in this build. You will never be charged from this preview.</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { padding: 20, gap: 12, backgroundColor: "#FFFFFF", flexGrow: 1 },
  image: { width: "100%", height: 230, borderRadius: 18 },
  category: { alignSelf: "flex-start", paddingHorizontal: 10, paddingVertical: 6, borderRadius: 30, backgroundColor: "#E4F7F1" },
  categoryText: { color: "#06755B", fontWeight: "800", fontSize: 12 },
  title: { color: "#12233F", fontSize: 30, lineHeight: 36, fontWeight: "700" },
  organizer: { color: "#52627B", fontSize: 15 },
  progressTrack: { height: 8, backgroundColor: "#E7ECF4", borderRadius: 99, marginTop: 8 },
  progress: { height: 8, width: "74%", backgroundColor: "#315EF5", borderRadius: 99 },
  stats: { flexDirection: "row", alignItems: "baseline" },
  raised: { color: "#12233F", fontSize: 22, fontWeight: "800" },
  goal: { color: "#52627B", fontSize: 15 },
  supporters: { color: "#52627B", fontSize: 14 },
  section: { color: "#12233F", fontSize: 20, fontWeight: "700", marginTop: 18 },
  copy: { color: "#42526A", fontSize: 16, lineHeight: 24 },
  button: { overflow: "hidden", textAlign: "center", backgroundColor: "#315EF5", color: "#FFFFFF", paddingVertical: 16, borderRadius: 12, fontWeight: "800", fontSize: 16, marginTop: 18 },
  note: { color: "#687891", fontSize: 12, lineHeight: 18, textAlign: "center" },
});
