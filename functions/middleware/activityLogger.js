const { logActivity, logError, sanitizeLogData } = require("../services/loggerService");

const pickUserContext = req => ({
    userId: req.body?.userId || req.body?.shopkeeperId || req.body?.customerId || req.query?.userId || null,
    mobile: req.body?.mobile || req.body?.customerMobile || req.query?.mobile || null
});

module.exports = (req, res, next) => {
    const startedAt = Date.now();
    const context = pickUserContext(req);

    res.on("finish", () => {
        const logData = {
            type: "REQUEST",
            method: req.method,
            url: req.originalUrl,
            statusCode: res.statusCode,
            responseTimeMs: Date.now() - startedAt,
            ip: req.ip || req.socket?.remoteAddress,
            userAgent: req.get("user-agent") || null,
            ...context,
            body: sanitizeLogData(req.body || {})
        };

        if (res.statusCode >= 500) {
            logError("HTTP request failed", new Error(`HTTP ${res.statusCode}`), logData);
        } else {
            logActivity("HTTP request completed", logData);
        }
    });

    next();
};
