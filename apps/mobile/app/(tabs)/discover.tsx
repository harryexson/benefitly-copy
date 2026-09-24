import { Link } from "expo-router";
import { ScrollView, StyleSheet, Text, View } from "react-native";

const campaigns = [
  { title: "Harbor House community kitchen", category: "COMMUNITY", slug: "harbor-house", progress: "$1,842 raised of $2,500" },
  { title: "Books and devices for Bright Futures", category: "EDUCATION", slug: "bright-futures", progress: "$4,310 raised of $7,000" },
  { title: "A medical bridge for the Ramirez family", category: "MEDICAL", slug: "ramirez-family", progress: "$2,125 raised of $9,000" },
];

export default function Discover() {
  return <ScrollView contentContainerStyle={styles.page}><Text style={styles.title}>Discover causes</Text><Text style={styles.copy}>Find a cause you care about and see where every gift is going.</Text>{campaigns.map((campaign) => <Link key={campaign.slug} href={{ pathname: "/campaign/[slug]", params: { slug: campaign.slug } }} style={styles.link}><View style={styles.card}><Text style={styles.category}>{campaign.category}</Text><Text style={styles.name}>{campaign.title}</Text><Text style={styles.meta}>{campaign.progress}</Text><Text style={styles.action}>View campaign ›</Text></View></Link>)}</ScrollView>;
}

const styles = StyleSheet.create({ page: { padding: 24, gap: 14, backgroundColor: "#FFFFFF", flexGrow: 1 }, title: { fontSize: 34, fontWeight: "700", color: "#12233F" }, copy: { fontSize: 16, lineHeight: 24, color: "#52627B", marginBottom: 6 }, link: { textDecorationLine: "none" }, card: { borderWidth: 1, borderColor: "#DCE3ED", padding: 18, borderRadius: 13, gap: 8 }, category: { fontSize: 11, fontWeight: "800", color: "#06755B", letterSpacing: 0.6 }, name: { fontSize: 20, fontWeight: "600", color: "#12233F" }, meta: { color: "#64748B" }, action: { color: "#315EF5", fontWeight: "800", marginTop: 5 } });
