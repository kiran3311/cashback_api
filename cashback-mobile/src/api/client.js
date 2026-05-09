import axios from "axios";
import { API_BASE_URL } from "../config/env";

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 20000,
  headers: {
    "Content-Type": "application/json",
  },
});

apiClient.interceptors.response.use(
  response => response,
  error => {
    const message = error.response?.data?.message || error.response?.data?.error || error.message;
    return Promise.reject({
      ...error,
      friendlyMessage: message || "Something went wrong. Please try again.",
    });
  }
);

export default apiClient;
