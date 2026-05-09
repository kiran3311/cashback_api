const express = require("express");
const router = express.Router();

const {
    saveFcmTokenController,
    sendNotificationController
} = require("../controller/notificationController");

router.post("/save-fcm-token", saveFcmTokenController);
router.post("/send-push-notification", sendNotificationController);

module.exports = router;
