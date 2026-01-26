

const express = require("express");
const router = express.Router();

const { addCustomer , createShop,getShopsByUserId ,getCustomersByShopkeeper, updateCashbackToExistingCustomer, addCashbackToExistingCustomer, redeemCashbackToExistingCustomer, updateRedeemStatus} = require("../controller/shopkepperController")

router.post("/adduserToShop", addCustomer );
router.post("/createShop", createShop );
router.post("/getShopsByUserId", getShopsByUserId );
router.post("/getCustomerListByShopkeeperId", getCustomersByShopkeeper );
router.post("/updateCashbackToExistingCustomer", updateCashbackToExistingCustomer );
router.post("/addCashbackToExistingCustomer", addCashbackToExistingCustomer );
router.post("/redeemCashback", redeemCashbackToExistingCustomer );
router.post("/updateRedeemStatus", updateRedeemStatus );


module.exports = router;
