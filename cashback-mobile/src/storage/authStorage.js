import * as SecureStore from "expo-secure-store";

const AUTH_USER_KEY = "cashback_auth_user";

export const saveAuthUser = user => SecureStore.setItemAsync(AUTH_USER_KEY, JSON.stringify(user));

export const getAuthUser = async () => {
  const value = await SecureStore.getItemAsync(AUTH_USER_KEY);
  return value ? JSON.parse(value) : null;
};

export const clearAuthUser = () => SecureStore.deleteItemAsync(AUTH_USER_KEY);
