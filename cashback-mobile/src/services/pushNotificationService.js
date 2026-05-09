import Constants from "expo-constants";
import * as Device from "expo-device";
import { Platform } from "react-native";
import { saveFcmToken } from "../api/notificationApi";

export async function registerForPushNotifications(userId) {
  if (Constants.appOwnership === "expo") {
    return { success: false, reason: "Push notifications require an EAS build on Android." };
  }

  if (!userId || !Device.isDevice) {
    return { success: false, reason: "Push notifications require a physical device." };
  }

  const Notifications = await import("expo-notifications");

  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });

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
