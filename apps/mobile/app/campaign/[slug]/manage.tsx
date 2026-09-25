import { Stack, useLocalSearchParams } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { useCallback, useState } from "react";
import { useFocusEffect } from "expo-router";
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { getCampaignBySlug, uploadCampaignMedia, postCampaignUpdate, type CampaignSummary } from "../../../lib/backend";
import { colors } from "../../../lib/theme";

export default function ManageCampaign() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const [campaign, setCampaign] = useState<CampaignSummary | null>(null);
  const [uploading, setUploading] = useState(false);
  const [updateBody, setUpdateBody] = useState("");
  const [postingUpdate, setPostingUpdate] = useState(false);
  const [message, setMessage] = useState("");

  const load = useCallback(() => {
    if (!slug) return;
    getCampaignBySlug(slug)
      .then(setCampaign)
      .catch(() => setMessage("This campaign can't be loaded right now."));
  }, [slug]);

  useFocusEffect(load);

  if (!campaign) {
    return (
      <View style={styles.center}>
        <Stack.Screen options={{ headerShown: true, title: "Manage" }} />
        <ActivityIndicator color={colors.blue} />
      </View>
    );
  }

  async function pickAndUpload() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setMessage("Photo library access is required to add media.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images", "videos"], quality: 0.8 });
    if (result.canceled || !result.assets[0]) return;
    const asset = result.assets[0];
    setUploading(true);
    setMessage("");
    try {
      await uploadCampaignMedia(campaign!.id, {
        uri: asset.uri,
        name: asset.fileName ?? `upload-${Date.now()}.${asset.uri.split(".").pop() ?? "jpg"}`,
        type: asset.mimeType ?? (asset.type === "video" ? "video/mp4" : "image/jpeg"),
      });
      load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Upload failed.");
    } finally {
      setUploading(false);
    }
  }

  async function submitUpdate() {
    if (!updateBody.trim()) return;
    setPostingUpdate(true);
    try {
      await postCampaignUpdate(campaign!.id, updateBody);
      setUpdateBody("");
      setMessage("Update posted.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not post update.");
    } finally {
      setPostingUpdate(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.page}>
      <Stack.Screen options={{ headerShown: true, title: "Manage" }} />
      <Text style={styles.title}>{campaign.title}</Text>

      <Text style={styles.section}>Photos &amp; video</Text>
      <Pressable accessibilityRole="button" onPress={pickAndUpload} disabled={uploading} style={styles.button}>
        <Text style={styles.buttonText}>{uploading ? "Uploading…" : "Add photo or video"}</Text>
      </Pressable>
      {campaign.image && <Image source={{ uri: campaign.image }} style={styles.preview} />}

      <Text style={styles.section}>Post an update</Text>
      <TextInput value={updateBody} onChangeText={setUpdateBody} multiline numberOfLines={5} style={styles.textarea} placeholder="Share progress with your supporters…" />
      <Pressable accessibilityRole="button" onPress={submitUpdate} disabled={postingUpdate} style={styles.button}>
        <Text style={styles.buttonText}>{postingUpdate ? "Posting…" : "Post update"}</Text>
      </Pressable>

      {message !== "" && <Text style={styles.copy}>{message}</Text>}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.paper },
  page: { padding: 22, gap: 12, backgroundColor: colors.paper, flexGrow: 1 },
  title: { color: colors.ink, fontWeight: "700", fontSize: 26 },
  section: { color: colors.ink, fontWeight: "700", fontSize: 18, marginTop: 16 },
  copy: { color: colors.muted, fontSize: 15, lineHeight: 22 },
  button: { backgroundColor: colors.blue, borderRadius: 12, padding: 14, alignItems: "center" },
  buttonText: { color: "#FFFFFF", fontWeight: "800" },
  preview: { width: "100%", height: 180, borderRadius: 12, marginTop: 10, backgroundColor: colors.mist },
  textarea: { borderWidth: 1, borderColor: colors.line, borderRadius: 12, padding: 14, minHeight: 110, textAlignVertical: "top", color: colors.ink },
});
