const { sendOTP, verifyOTP } = require("../services/otpService");
const { logActivity, logError } = require("../services/loggerService");

exports.sendOTPController = async (req, res) => {
    try {
        const { mobile } = req.body;

        console.log("[OTP] /send-otp request:", { mobile });
        logActivity("Send OTP requested", {
            type: "OTP_SEND_REQUEST",
            mobile
        });

        const result = await sendOTP(mobile);

        if (!result.success) {
            return res.status(500).json(result);
        }

        return res.status(200).json({
            success: true
        });
    } catch (error) {
        console.log("[OTP] /send-otp error:", error.message);
        logError("Send OTP controller failed", error, {
            type: "OTP_SEND_ERROR",
            mobile: req.body?.mobile,
            body: req.body
        });

        return res.status(500).json({
            success: false,
            error: "Failed to send OTP. Please try again."
        });
    }
};

exports.verifyOTPController = (req, res) => {
    try {
        const { mobile, otp } = req.body;

        console.log("[OTP] /verify-otp request:", { mobile });
        logActivity("Verify OTP requested", {
            type: "OTP_VERIFY_REQUEST",
            mobile
        });

        const result = verifyOTP(mobile, otp);

        if (!result.success) {
            return res.status(400).json(result);
        }

        return res.status(200).json(result);
    } catch (error) {
        console.log("[OTP] /verify-otp error:", error.message);
        logError("Verify OTP controller failed", error, {
            type: "OTP_VERIFY_ERROR",
            mobile: req.body?.mobile,
            body: req.body
        });

        return res.status(500).json({
            success: false,
            error: "Failed to verify OTP. Please try again."
        });
    }
};
