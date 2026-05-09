import axios from "axios";
import { API_BASE_URL } from "../config/env";

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 20000,
  headers: {
    "Content-Type": "application/json",
  },
});

const RETRY_LIMIT = 2;
const RETRY_DELAY_MS = 650;
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

apiClient.interceptors.response.use(
  response => response,
  async error => {
    const config = error.config || {};
    const status = error.response?.status;
    const shouldRetry = !config.__skipRetry
      && (error.code === "ECONNABORTED" || !error.response || status >= 500)
      && (config.__retryCount || 0) < RETRY_LIMIT;

    if (shouldRetry) {
      config.__retryCount = (config.__retryCount || 0) + 1;
      await sleep(RETRY_DELAY_MS * config.__retryCount);
      return apiClient(config);
    }

    const message = error.response?.data?.message || error.response?.data?.error || error.message;
    return Promise.reject({
      ...error,
      friendlyMessage: message || "Something went wrong. Please try again.",
    });
  }
);

export default apiClient;
