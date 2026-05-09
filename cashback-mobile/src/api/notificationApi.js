import apiClient from "./client";

export const saveFcmToken = payload => apiClient.post("/save-fcm-token", payload);
