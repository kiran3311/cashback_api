import apiClient from "./client";

export const createShop = payload => apiClient.post("/createShop", payload);
export const getShopsByUserId = shopkeeperId => apiClient.post("/getShopsByUserId", { shopkeeperId });
export const addUserToShop = payload => apiClient.post("/adduserToShop", payload);
export const getCustomerListByShopkeeperId = shopkeeperId =>
  apiClient.post("/getCustomerListByShopkeeperId", { shopkeeperId });
export const addCashbackToExistingCustomer = payload =>
  apiClient.post("/addCashbackToExistingCustomer", payload);
export const updateCashbackToExistingCustomer = payload =>
  apiClient.post("/updateCashbackToExistingCustomer", payload);
export const redeemCashback = payload => apiClient.post("/redeemCashback", payload);
