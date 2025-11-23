

const express = require("express");
const router = express.Router();

const { addCustomer , createShop,getShopsByUserId } = require("../controller/shopkepperController")

router.post("/adduserToShop", addCustomer );
router.post("/createShop", createShop );
router.post("/getShopsByUserId", getShopsByUserId );

module.exports = router;
