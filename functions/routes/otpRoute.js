const express = require("express");
const router = express.Router();

const { sendOTPController, verifyOTPController } = require("../controller/otpController");
const { validateSendOTP, validateVerifyOTP } = require("../middleware/otpValidation");

router.post("/send-otp", validateSendOTP, sendOTPController);
router.post("/verify-otp", validateVerifyOTP, verifyOTPController);

module.exports = router;
