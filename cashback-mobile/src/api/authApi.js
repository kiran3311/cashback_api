import apiClient from "./client";

export const registerUser = payload => apiClient.post("/register", payload);
export const loginUser = payload => apiClient.post("/login", payload);
