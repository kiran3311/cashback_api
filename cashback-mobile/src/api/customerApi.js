import apiClient from "./client";

export const getCustomerCashbackList = payload => apiClient.post("/getCustCashbackListById", payload);
export const getCustomerByMobileNo = mobile => apiClient.post("/getCustomerByMobileNo", { mobile });
export const updateRedeemStatus = payload => apiClient.post("/updateRedeemStatus", payload);
