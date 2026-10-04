

const express = require("express");
const router = express.Router();

const { addCustomer , createShop,getShopsByUserId ,getNearbyShops, createOffer, getOffersByShopkeeperId, getAllOffers, getCustomersByShopkeeper, updateCashbackToExistingCustomer, addCashbackToExistingCustomer, redeemCashbackToExistingCustomer, updateRedeemStatus} = require("../controller/shopkepperController")

router.post("/adduserToShop", addCustomer );
router.post("/createShop", createShop );
router.post("/getShopsByUserId", getShopsByUserId );
router.post("/getNearbyShops", getNearbyShops );
router.post("/createOffer", createOffer );
router.post("/getOffersByShopkeeperId", getOffersByShopkeeperId );
router.post("/getAllOffers", getAllOffers );
router.post("/getCustomerListByShopkeeperId", getCustomersByShopkeeper );
router.post("/updateCashbackToExistingCustomer", updateCashbackToExistingCustomer );
router.post("/addCashbackToExistingCustomer", addCashbackToExistingCustomer );
router.post("/redeemCashback", redeemCashbackToExistingCustomer );
router.post("/updateRedeemStatus", updateRedeemStatus );


module.exports = router;
