

const express = require("express");
const router = express.Router();

const {getCustomerCashbackDetails, getCustomerByMobileNo } = require("../controller/customerController")

router.post("/getCustCashbackListById", getCustomerCashbackDetails );
router.post("/getCustomerByMobileNo", getCustomerByMobileNo );

module.exports = router;
