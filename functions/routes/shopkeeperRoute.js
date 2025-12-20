

const express = require("express");
const router = express.Router();

const { addCustomer , createShop,getShopsByUserId ,getCustomersByShopkeeper, updateCashbackToExistingCustomer, addCashbackToExistingCustomer} = require("../controller/shopkepperController")

router.post("/adduserToShop", addCustomer );
router.post("/createShop", createShop );
router.post("/getShopsByUserId", getShopsByUserId );
router.post("/getCustomerListByShopkeeperId", getCustomersByShopkeeper );
router.post("/updateCashbackToExistingCustomer", updateCashbackToExistingCustomer );
router.post("/addCashbackToExistingCustomer", addCashbackToExistingCustomer );

module.exports = router;
