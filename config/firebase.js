const admin = require("firebase-admin");

//const serviceAccount = require("../../serviceAccountKey.json"); 
// OR use env variables in production

//const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);

// admin.initializeApp({
//   credential: admin.credential.cert(serviceAccount),
// });


admin.initializeApp({
    credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    })
    
});

//new with firefunction
// if (!admin.apps.length) {
//   admin.initializeApp();
// }

const db = admin.firestore();

module.exports = db;
