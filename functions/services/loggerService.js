const fs = require("fs");
const path = require("path");

const LOG_DIR = path.join(__dirname, "..", "logs");
const SENSITIVE_KEYS = [
    "password",
    "otp",
    "token",
    "fcmToken",
    "fcmTokens",
    "authorization",
    "apiKey",
    "FAST2SMS_API_KEY",
    "private_key"
];

const ensureLogDir = () => {
    if (!fs.existsSync(LOG_DIR)) {
        fs.mkdirSync(LOG_DIR, { recursive: true });
    }
};

const getDateStamp = () => new Date().toISOString().slice(0, 10);

const getLogFile = type => {
    ensureLogDir();
    return path.join(LOG_DIR, `${type}-${getDateStamp()}.txt`);
};

const isSensitiveKey = key => {
    const normalizedKey = String(key).toLowerCase();
    return SENSITIVE_KEYS.some(sensitiveKey => normalizedKey.includes(sensitiveKey.toLowerCase()));
};

const sanitize = value => {
    if (Array.isArray(value)) {
        return value.map(item => sanitize(item));
    }

    if (value && typeof value === "object") {
        return Object.keys(value).reduce((safeValue, key) => {
            safeValue[key] = isSensitiveKey(key) ? "[MASKED]" : sanitize(value[key]);
            return safeValue;
        }, {});
    }

    return value;
};

const writeLog = (type, payload) => {
    const logPayload = {
        timestamp: new Date().toISOString(),
        ...sanitize(payload)
    };

    const line = `${JSON.stringify(logPayload)}\n`;

    fs.appendFile(getLogFile(type), line, error => {
        if (error) {
            console.error("[LOGGER] Failed to write log:", error.message);
        }
    });
};

exports.logActivity = (message, data = {}) => {
    writeLog("activity", {
        level: "INFO",
        message,
        ...data
    });
};

exports.logError = (message, error, data = {}) => {
    writeLog("error", {
        level: "ERROR",
        message,
        errorMessage: error?.message || String(error),
        stack: error?.stack || null,
        ...data
    });
};

exports.sanitizeLogData = sanitize;
