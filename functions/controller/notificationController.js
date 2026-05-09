const {
    saveFcmToken,
    sendPushNotification
} = require("../services/firebaseNotificationService");
const { logActivity, logError } = require("../services/loggerService");

exports.saveFcmTokenController = async (req, res) => {
    try {
        const { userId, fcmToken } = req.body;
        logActivity("Save FCM token requested", {
            type: "FCM_SAVE_TOKEN_REQUEST",
            userId,
            body: req.body
        });

        if (!userId || !fcmToken) {
            return res.status(400).json({
                success: false,
                message: "userId and fcmToken are required"
            });
        }

        const result = await saveFcmToken({ userId, fcmToken });

        return res.status(200).json(result);
    } catch (error) {
        console.log("[FCM] save token error:", error.message);
        logError("Save FCM token failed", error, {
            type: "FCM_SAVE_TOKEN_ERROR",
            userId: req.body?.userId,
            body: req.body
        });

        return res.status(500).json({
            success: false,
            message: "Failed to save FCM token",
            error: error.message
        });
    }
};

exports.sendNotificationController = async (req, res) => {
    try {
        const { userId, title, body, data } = req.body;
        logActivity("Send push notification requested", {
            type: "FCM_SEND_REQUEST",
            userId,
            title,
            body: req.body
        });

        if (!userId || !title || !body) {
            return res.status(400).json({
                success: false,
                message: "userId, title and body are required"
            });
        }

        const result = await sendPushNotification({
            userId,
            title,
            body,
            data
        });

        return res.status(result.success ? 200 : 400).json(result);
    } catch (error) {
        console.log("[FCM] send notification error:", error.message);
        logError("Send push notification failed", error, {
            type: "FCM_SEND_ERROR",
            userId: req.body?.userId,
            body: req.body
        });

        return res.status(500).json({
            success: false,
            message: "Failed to send notification",
            error: error.message
        });
    }
};
