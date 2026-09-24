import { Stack, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

const amounts = [10, 25, 50, 100];

export default function Donate() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const [amount, setAmount] = useState("25");
  const [notice, setNotice] = useState("");

  return (
    <ScrollView contentContainerStyle={styles.page} keyboardShouldPersistTaps="handled">
      <Stack.Screen options={{ headerShown: true, title: "Donate" }} />
      <Text style={styles.eyebrow}>YOU ARE SUPPORTING</Text>
      <Text style={styles.title}>{slug === "harbor-house" ? "Harbor House Community" : "This campaign"}</Text>
      <Text style={styles.copy}>Choose a gift amount. Secure payment will be available after Benefitly completes its provider integration.</Text>
      <Text style={styles.label}>Donation amount (USD)</Text>
      <View style={styles.amountRow}><Text style={styles.currency}>$</Text><TextInput accessibilityLabel="Donation amount in US dollars" keyboardType="decimal-pad" value={amount} onChangeText={setAmount} style={styles.amountInput} /></View>
      <View style={styles.pills}>{amounts.map((value) => <Pressable key={value} accessibilityRole="button" onPress={() => setAmount(String(value))} style={[styles.pill, amount === String(value) && styles.pillActive]}><Text style={[styles.pillText, amount === String(value) && styles.pillTextActive]}>${value}</Text></Pressable>)}</View>
      <View style={styles.info}><Text style={styles.infoTitle}>Clear before you give</Text><Text style={styles.infoCopy}>Benefitly will show processing fees, optional platform support, receipt information, and payment terms before any live payment is submitted.</Text></View>
      <Pressable accessibilityRole="button" onPress={() => setNotice("Payments are not yet enabled. No charge has been created.")} style={styles.button}><Text style={styles.buttonText}>Continue to secure payment</Text></Pressable>
      {!!notice && <Text accessibilityLiveRegion="polite" style={styles.notice}>{notice}</Text>}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { padding: 22, gap: 14, backgroundColor: "#FFFFFF", flexGrow: 1 },
  eyebrow: { color: "#06755B", fontWeight: "800", fontSize: 12, letterSpacing: 0.8, marginTop: 6 },
  title: { color: "#12233F", fontWeight: "700", fontSize: 28 }, copy: { color: "#52627B", fontSize: 16, lineHeight: 24, marginBottom: 16 },
  label: { color: "#12233F", fontWeight: "700", fontSize: 15 }, amountRow: { flexDirection: "row", alignItems: "center", borderWidth: 1, borderColor: "#CCD6E5", borderRadius: 12, paddingHorizontal: 16 }, currency: { fontSize: 24, color: "#12233F", fontWeight: "700" },
  amountInput: { color: "#12233F", fontWeight: "700", fontSize: 28, padding: 14, flex: 1 }, pills: { flexDirection: "row", gap: 8, flexWrap: "wrap" }, pill: { borderColor: "#CCD6E5", borderWidth: 1, borderRadius: 99, paddingHorizontal: 16, paddingVertical: 10 }, pillActive: { backgroundColor: "#E8EEFF", borderColor: "#315EF5" }, pillText: { color: "#42526A", fontWeight: "700" }, pillTextActive: { color: "#2148C9" },
  info: { backgroundColor: "#F4F7FB", borderRadius: 14, padding: 16, gap: 6, marginTop: 10 }, infoTitle: { color: "#12233F", fontWeight: "800" }, infoCopy: { color: "#52627B", lineHeight: 20 }, button: { backgroundColor: "#315EF5", borderRadius: 12, padding: 16, marginTop: 12 }, buttonText: { color: "#FFFFFF", fontWeight: "800", fontSize: 16, textAlign: "center" }, notice: { color: "#42526A", backgroundColor: "#FFF7DD", padding: 12, borderRadius: 10, lineHeight: 20 },
});
