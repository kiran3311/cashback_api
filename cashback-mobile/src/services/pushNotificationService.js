import Constants from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { saveFcmToken } from "../api/notificationApi";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export async function registerForPushNotifications(userId) {
  if (!userId || !Device.isDevice) {
    return { success: false, reason: "Push notifications require a physical device." };
  }

  const existingPermission = await Notifications.getPermissionsAsync();
  let finalStatus = existingPermission.status;

  if (existingPermission.status !== "granted") {
    const requestedPermission = await Notifications.requestPermissionsAsync();
    finalStatus = requestedPermission.status;
  }

  if (finalStatus !== "granted") {
    return { success: false, reason: "Notification permission was not granted." };
  }

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "CashBack",
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#18733b",
    });
  }

  const directToken = await Notifications.getDevicePushTokenAsync();
  const projectId = Constants.expoConfig?.extra?.eas?.projectId || Constants.easConfig?.projectId;
  let expoToken = null;

  if (projectId) {
    expoToken = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
  }

  const fcmToken = directToken?.data || expoToken;

  if (!fcmToken) {
    return { success: false, reason: "Unable to get a push token." };
  }

  await saveFcmToken({
    userId,
    fcmToken,
    expoPushToken: expoToken,
    tokenType: directToken?.type || "expo",
  });

  return { success: true, fcmToken, expoPushToken: expoToken };
}
