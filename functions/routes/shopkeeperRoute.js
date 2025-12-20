

const express = require("express");
const router = express.Router();

const { addCustomer , createShop,getShopsByUserId ,getCustomersByShopkeeper} = require("../controller/shopkepperController")

router.post("/adduserToShop", addCustomer );
router.post("/createShop", createShop );
router.post("/getShopsByUserId", getShopsByUserId );
router.post("/getCustomerListByShopkeeperId", getCustomersByShopkeeper );

module.exports = router;
