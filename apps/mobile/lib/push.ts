import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import Constants from "expo-constants";
import { Platform } from "react-native";
import { registerPushToken } from "./backend";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

/**
 * Requests permission and registers this device's Expo push token with the backend. Silently
 * gives up on a simulator (no push capability) or when permission is denied -- this is a
 * background nicety, not something that should ever interrupt or fail a screen.
 */
export async function registerForPushNotifications(): Promise<void> {
  if (!Device.isDevice) return;
  try {
    const existing = await Notifications.getPermissionsAsync();
    let status = existing.status;
    if (status !== "granted") {
      const requested = await Notifications.requestPermissionsAsync();
      status = requested.status;
    }
    if (status !== "granted") return;

    const projectId = Constants.expoConfig?.extra?.eas?.projectId;
    const token = await Notifications.getExpoPushTokenAsync(projectId ? { projectId } : undefined);
    await registerPushToken(token.data, Platform.OS === "android" ? "android" : "ios");
  } catch {
    // Push registration is best-effort; a failure here should never block the app.
  }
}
