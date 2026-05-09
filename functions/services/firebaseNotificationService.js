const admin = require("firebase-admin");
const db = require("../config/firebase");
const { logActivity, logError } = require("./loggerService");

const getUserTokens = async userId => {
    const userDoc = await db.collection("users").doc(userId).get();

    if (!userDoc.exists) {
        console.log("[FCM] User not found:", userId);
        logActivity("FCM user not found", {
            type: "FCM_USER_NOT_FOUND",
            userId
        });
        return [];
    }

    const userData = userDoc.data();
    const tokens = [];

    if (userData.fcmToken) {
        tokens.push(userData.fcmToken);
    }

    if (Array.isArray(userData.fcmTokens)) {
        tokens.push(...userData.fcmTokens);
    }

    return [...new Set(tokens.filter(Boolean))];
};

const saveNotificationLog = async ({ userId, title, body, data, status, error }) => {
    try {
        await db.collection("notifications").add({
            userId,
            title,
            body,
            data: data || {},
            status,
            error: error || null,
            createdAt: new Date()
        });
    } catch (error) {
        console.log("[FCM] Failed to save notification log:", error.message);
        logError("Failed to save notification Firestore log", error, {
            type: "FCM_FIRESTORE_LOG_ERROR",
            userId
        });
    }
};

exports.saveFcmToken = async ({ userId, fcmToken }) => {
    console.log("[FCM] Saving token for user:", userId);
    logActivity("Saving FCM token", {
        type: "FCM_SAVE_TOKEN",
        userId,
        fcmToken
    });

    await db.collection("users").doc(userId).set({
        fcmToken,
        fcmTokens: admin.firestore.FieldValue.arrayUnion(fcmToken),
        fcmTokenUpdatedAt: new Date()
    }, { merge: true });

    return {
        success: true,
        message: "FCM token saved successfully"
    };
};

exports.sendPushNotification = async ({ userId, title, body, data }) => {
    console.log("[FCM] Preparing notification:", { userId, title });
    logActivity("Preparing FCM notification", {
        type: "FCM_PREPARE",
        userId,
        title,
        body,
        data
    });

    const tokens = await getUserTokens(userId);

    if (!tokens.length) {
        const message = "No FCM token found for user";
        console.log("[FCM]", message, userId);
        logActivity("FCM notification skipped: no token", {
            type: "FCM_NO_TOKEN",
            userId,
            title,
            data
        });

        await saveNotificationLog({
            userId,
            title,
            body,
            data,
            status: "NO_TOKEN",
            error: message
        });

        return {
            success: false,
            error: message
        };
    }

    try {
        const response = await admin.messaging().sendEachForMulticast({
            tokens,
            notification: {
                title,
                body
            },
            data: Object.entries(data || {}).reduce((payload, [key, value]) => {
                payload[key] = String(value);
                return payload;
            }, {})
        });

        console.log("[FCM] Notification sent:", {
            userId,
            successCount: response.successCount,
            failureCount: response.failureCount
        });
        logActivity("FCM notification sent", {
            type: "FCM_SENT",
            userId,
            title,
            successCount: response.successCount,
            failureCount: response.failureCount,
            data
        });

        await saveNotificationLog({
            userId,
            title,
            body,
            data,
            status: response.failureCount ? "PARTIAL_SENT" : "SENT"
        });

        return {
            success: response.successCount > 0,
            successCount: response.successCount,
            failureCount: response.failureCount
        };
    } catch (error) {
        console.log("[FCM] Failed to send notification:", error.message);
        logError("FCM notification failed", error, {
            type: "FCM_SEND_ERROR",
            userId,
            title,
            data
        });

        await saveNotificationLog({
            userId,
            title,
            body,
            data,
            status: "FAILED",
            error: error.message
        });

        return {
            success: false,
            error: error.message
        };
    }
};

exports.sendCashbackReceivedNotification = async ({ userId, cashback, billAmount, cashbackId, shopkeeperId }) => {
    return exports.sendPushNotification({
        userId,
        title: "Cashback received",
        body: `You received Rs. ${cashback} cashback.`,
        data: {
            type: "CASHBACK_RECEIVED",
            cashback,
            billAmount,
            cashbackId,
            shopkeeperId
        }
    });
};

exports.sendRedeemStatusNotification = async ({ userId, cashbackId, action, redeemAmount }) => {
    const isApproved = action === "APPROVED";

    return exports.sendPushNotification({
        userId,
        title: isApproved ? "Cashback request approved" : "Cashback request rejected",
        body: isApproved
            ? `Cashback redeem request of Rs. ${redeemAmount} was approved.`
            : "Cashback redeem request was rejected.",
        data: {
            type: "REDEEM_STATUS",
            cashbackId,
            action,
            redeemAmount: redeemAmount || 0
        }
    });
};
