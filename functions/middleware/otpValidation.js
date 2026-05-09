const mobileRegex = /^\d{10}$/;
const otpRegex = /^\d{6}$/;

exports.validateSendOTP = (req, res, next) => {
    const { mobile } = req.body;

    if (!mobileRegex.test(String(mobile || ""))) {
        return res.status(400).json({
            success: false,
            error: "Enter valid 10-digit mobile number"
        });
    }

    next();
};

exports.validateVerifyOTP = (req, res, next) => {
    const { mobile, otp } = req.body;

    if (!mobileRegex.test(String(mobile || ""))) {
        return res.status(400).json({
            success: false,
            error: "Enter valid 10-digit mobile number"
        });
    }

    if (!otpRegex.test(String(otp || ""))) {
        return res.status(400).json({
            success: false,
            error: "Enter valid 6-digit OTP"
        });
    }

    next();
};
