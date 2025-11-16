const admin = require("firebase-admin");

const serviceAccount = require("../serviceAccountKey.json"); 
// OR use env variables in production

//const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

module.exports = db;
