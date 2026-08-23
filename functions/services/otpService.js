require("dotenv").config();

const axios = require("axios");
const { logActivity, logError } = require("./loggerService");

const OTP_TTL_MS = 5 * 60 * 1000;
const MAX_ATTEMPTS = 3;
const otpStore = new Map();

const generateOTP = () => Math.floor(100000 + Math.random() * 900000).toString();
const getOtpKey = mobile => `otp:${mobile}`;

const deleteOTP = mobile => {
    otpStore.delete(getOtpKey(mobile));
};

exports.sendOTP = async mobile => {
    const apiKey = process.env.FAST2SMS_API_KEY || "T5OhPJCIr3qLS2BoGZHmFWD1bgXpj7kEtfUxeMKN8zidYRsca47DnbAPzW8jRgJVMXqidIolvepwxkh6";

    if (!apiKey || apiKey === "your_key_here") {
        console.log("[OTP] FAST2SMS_API_KEY missing or not configured");
        logError("FAST2SMS API key missing or not configured", new Error("FAST2SMS_API_KEY missing"), {
            type: "OTP_CONFIG_ERROR",
            mobile
        });
        return {
            success: false,
            error: "Failed to send OTP. Please try again."
        };
    }

    const otp = generateOTP();
    const expiresAt = Date.now() + OTP_TTL_MS;

    console.log(`[OTP] Sending OTP to ${mobile}`);
    logActivity("Sending OTP via Fast2SMS", {
        type: "OTP_PROVIDER_REQUEST",
        mobile
    });

    try {
        const response = await axios.get("https://www.fast2sms.com/dev/bulkV2", {
            params: {
                authorization: apiKey,
                route: "dlt",
                sender_id: "TKKAPP",           // your registered sender ID
                message: "223653",             // DLT template ID, not raw text
                variables_values: otp,         // fills {#var#} in the template
                numbers: mobile
            }
        });
        // const response = await axios.post(
        //     "https://www.fast2sms.com/dev/bulkV2",
        //     {
        //         route: "dlt",
        //         message: `Your OTP is ${otp}. Valid for 5 minutes. Do not share with anyone.`,
        //         language: "english",
        //         flash: 0,
        //         numbers: mobile
        //     },
        //     {
        //         headers: {
        //             authorization: apiKey,
        //             "Content-Type": "application/json"
        //         }
        //     }
        // );

        console.log("[OTP] Fast2SMS response:", response.data);
        logActivity("Fast2SMS response received", {
            type: "OTP_PROVIDER_RESPONSE",
            mobile,
            providerResponse: response.data
        });

        if (!response.data || response.data.return !== true) {
            return {
                success: false,
                error: "Failed to send OTP. Please try again."
            };
        }

        otpStore.set(getOtpKey(mobile), {
            otp,
            expiresAt,
            attempts: MAX_ATTEMPTS
        });

        console.log(`[OTP] OTP stored for ${mobile}. Expires at ${new Date(expiresAt).toISOString()}`);
        logActivity("OTP stored", {
            type: "OTP_STORED",
            mobile,
            expiresAt: new Date(expiresAt).toISOString(),
            attempts: MAX_ATTEMPTS
        });

        return { success: true };
    } catch (error) {
        console.log("[OTP] Failed to send OTP:", error.response?.data || error.message);
        logError("Failed to send OTP via Fast2SMS", error, {
            type: "OTP_PROVIDER_ERROR",
            mobile,
            providerResponse: error.response?.data
        });

        return {
            success: false,
            error: "Failed to send OTP. Please try again."
        };
    }
};

exports.verifyOTP = (mobile, otp) => {
    const key = getOtpKey(mobile);
    const otpRecord = otpStore.get(key);

    console.log(`[OTP] Verifying OTP for ${mobile}`);

    if (!otpRecord) {
        console.log(`[OTP] No OTP found for ${mobile}`);
        logActivity("OTP verification failed: no OTP found", {
            type: "OTP_VERIFY_NOT_FOUND",
            mobile
        });
        return {
            success: false,
            error: "No OTP found. Please request again."
        };
    }

    if (Date.now() > otpRecord.expiresAt) {
        deleteOTP(mobile);
        console.log(`[OTP] OTP expired for ${mobile}`);
        logActivity("OTP verification failed: expired", {
            type: "OTP_VERIFY_EXPIRED",
            mobile
        });

        return {
            success: false,
            error: "OTP expired. Please request a new one."
        };
    }

    if (otpRecord.attempts <= 0) {
        deleteOTP(mobile);
        console.log(`[OTP] Too many wrong attempts for ${mobile}`);
        logActivity("OTP verification failed: too many attempts", {
            type: "OTP_VERIFY_TOO_MANY_ATTEMPTS",
            mobile
        });

        return {
            success: false,
            error: "Too many wrong attempts. Request a new OTP."
        };
    }

    if (otpRecord.otp !== otp) {
        otpRecord.attempts -= 1;

        if (otpRecord.attempts <= 0) {
            deleteOTP(mobile);
            console.log(`[OTP] Too many wrong attempts for ${mobile}`);
            logActivity("OTP verification failed: too many attempts", {
                type: "OTP_VERIFY_TOO_MANY_ATTEMPTS",
                mobile
            });

            return {
                success: false,
                error: "Too many wrong attempts. Request a new OTP."
            };
        }

        otpStore.set(key, otpRecord);
        console.log(`[OTP] Wrong OTP for ${mobile}. Attempts remaining: ${otpRecord.attempts}`);
        logActivity("OTP verification failed: wrong OTP", {
            type: "OTP_VERIFY_WRONG",
            mobile,
            attemptsRemaining: otpRecord.attempts
        });

        return {
            success: false,
            error: `Wrong OTP. ${otpRecord.attempts} attempts remaining.`
        };
    }

    deleteOTP(mobile);
    console.log(`[OTP] Phone verified successfully for ${mobile}`);
    logActivity("OTP verified successfully", {
        type: "OTP_VERIFY_SUCCESS",
        mobile
    });

    return {
        success: true,
        message: "Phone verified successfully"
    };
};
