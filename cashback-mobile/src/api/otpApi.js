import apiClient from "./client";

export const sendOtp = mobile => apiClient.post("/send-otp", { mobile });
export const verifyOtp = ({ mobile, otp }) => apiClient.post("/verify-otp", { mobile, otp });
