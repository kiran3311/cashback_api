
const functions = require("firebase-functions");
const express = require("express");
const admin = require("firebase-admin");
const cors = require("cors");
const path = require("path");
const activityLogger = require("./middleware/activityLogger");
const { logActivity, logError } = require("./services/loggerService");

const app = express();
app.use(express.json());
app.use(cors());
app.use(activityLogger);

app.get("/swagger.json", (req, res) => {
    res.sendFile(path.join(__dirname, "docs", "swagger.json"));
});

app.get("/api-docs", (req, res) => {
    res.sendFile(path.join(__dirname, "docs", "swagger.html"));
});

// Local browser test utilities, including the FCM service worker.
// These must be served over HTTP(S); opening the HTML file directly will not work.
app.use("/test", express.static(path.join(__dirname, "docs")));

// initialize firebase admin
//const serviceAccount = require("./serviceAccountKey.json");


//For local 
// admin.initializeApp({
//   credential: admin.credential.cert(serviceAccount)
// });



//for Live
// admin.initializeApp({
//   credential: admin.credential.cert({
//     type: process.env.FB_TYPE,
//     project_id: process.env.FB_PROJECT_ID,
//     private_key_id: process.env.FB_PRIVATE_KEY_ID,
//     private_key: process.env.FB_PRIVATE_KEY.replace(/\\n/g, '\n'),
//     client_email: process.env.FB_CLIENT_EMAIL,
//     client_id: process.env.FB_CLIENT_ID,
//   })
// });







const userRoutes = require("./routes/userRoute");
app.use("/", userRoutes);

const shopkeeperRoute = require("./routes/shopkeeperRoute")
app.use("/", shopkeeperRoute);

const customerRoute = require("./routes/customerRoute")
app.use("/", customerRoute)

const otpRoute = require("./routes/otpRoute")
app.use("/", otpRoute)

const notificationRoute = require("./routes/notificationRoute")
app.use("/", notificationRoute)

app.use((err, req, res, next) => {
    logError("Unhandled Express error", err, {
        type: "EXPRESS_ERROR",
        method: req.method,
        url: req.originalUrl,
        userId: req.body?.userId || req.body?.shopkeeperId || null,
        mobile: req.body?.mobile || req.body?.customerMobile || null,
        body: req.body
    });

    res.status(500).json({
        success: false,
        message: "Internal server error"
    });
});


const PORT = 5001;
app.listen(PORT, () => {
    logActivity("Server started", {
        type: "SERVER",
        port: PORT
    });
    console.log(`Server is running on port ${PORT}`);
});

process.on("unhandledRejection", reason => {
    logError("Unhandled promise rejection", reason instanceof Error ? reason : new Error(String(reason)), {
        type: "UNHANDLED_REJECTION"
    });
});

process.on("uncaughtException", error => {
    logError("Uncaught exception", error, {
        type: "UNCAUGHT_EXCEPTION"
    });
    console.error(error);
});




// exports.api = functions.https.onRequest(app);
