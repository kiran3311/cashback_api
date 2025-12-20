

const express = require("express");
const router = express.Router();

const {getCustomerCashbackDetails } = require("../controller/customerController")

router.post("/getCustCashbackListById", getCustomerCashbackDetails );


module.exports = router;
