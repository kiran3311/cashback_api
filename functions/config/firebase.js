const admin = require("firebase-admin");

//const serviceAccount = require("../serviceAccountKey.json")
// OR use env variables in production

//const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);


const serviceConnection =

  {
  type: "service_account",
  project_id: "my-cashback-app",
  private_key_id: "098ff12477e6020555ee5b8341fec70c9bd9cdd2",
  private_key: "-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQCgYMpCGejXS14e\nsgzMuYUY67kajLEueYoMWY+Yyn0ouCPK5gKBDNSpJGq0hSh238ZLapVS0df6fBwa\nAWbtoVh6ghsUDBPq4iOC8oJnaPOq+i/4XHmXIK+k9CNv/DW5AfOOa9ewOHnzR1vm\np1ieNNo8iOku+oCH91c1A7i2Fi0bsrBQNr2dA8nFhO3XnmSkhpI0tLaUmJbyGFpz\nyA+J7AYwg0ifTVMQbndTl6pPVcvrb6qdZ7W+7j0xs6zhEoW/Xvy9K1DjNPJ4RA2L\nEZthb11RCPT016Q4kL7mBPTiACe91erbK6WRSlkd9o5H2Jgh2ZmxKLOKofFYUFhx\nZnULcrzPAgMBAAECggEACKhxAtSHP2gwMpQGIN87EjdXjNlfj1S8YSJMoED+NL6M\nIB3+sJzStjbjE8/EeXZnLBca7JergzhEBBtjRRzau/JeJ9znDl0a8azJ4W9HCEnt\nYQkM/12iXdNYPmltNQmn7l5gDIFgBAQsL+2E2TWdOnthq0mWusBdkt0akans0Xvk\nGgWZToGgbDlzGQdB/9I2WmcdP9PT4Coy1EsThk6CPasRy5EjOLN+3lq8fMTP6kIl\ncnqwaCumgjWLT2MUaOy8k0npa0aJBF5PlWRl1+umVbE2FBkOmGGz1J3jboMBgMf+\nLHYb1tHQKkTh5usBeEc+nxAX7oG0sWA7IzeOYAq5EQKBgQDbl3G8nlvM3nqvzwY2\nP3ldIZHJlAukseVH3MQSR2gpNJGs+YXdriJmnKt5msXiK1Xy81TBVOS8lK0QYN9F\ng9bb0Ai0aTUn+8FwDtwlIJRd9TlRy/tAAaPTNM50p0vs6Z9uFQuOiH7GaYLiDu82\nk/VDGhMAQjMN4nCFJNQ4qLn6IwKBgQC6+AgOJ/oeV6McIsMWS0bvkTioe+oE62Q0\nIMpn9YZIo5K2zs+BaC201Og42Ft6GRhvsisO1bNZHdFkI7MMbKbYIhDCmGR9uOeh\nH+HfSwWreMluY4hoKZcW8FQp81P+WotdoJ+02cnD5uGktisyt/PB8jQEtrtbD6OW\nRP7yLRkPZQKBgCsFuNrji8jPrenT/buTJAwDD7UWtFFIKUuzDRcntlicXA4vtPKB\ns2u3NkFU+YAeTXCUC/70yvvHhUC4OgY8llPqpknyct+qi3OQ9cCwaWEfMmO8OzWH\nHLm8ltZ0EIQSIZJHvUPnqi7lbSctFeDzjBHhgeeDEM2fl7v+QzX2mLlRAoGBAKHV\nxWszcU1IQDg/YqvudrUw92Dm+TZO5go1A94eaKCBbaHsuzJhEYb/7w4dQHkcNcmg\n56JMmZQeujs6p2WuunBEdEtsCzfDkEMoTKOx1XOJ9pklcFHxBgXl+oPhSifVCeL+\nAJ9TEFEQjOm8gQHCtix/UEVwQhXdIJUWnbLUFGf9AoGAWK0O9WKUi8NyVOFL94tf\nssW8hB79kmj1u940evuWG33xioSgbfnaU4PdvTOnw5fv38WGOanjzQj2NobAvVzV\nplCiKrdAmm2gNhsL3lTOvbN2wLlC5KV2t4rsuz4PJWEp9V1iwj1ekMNN2FMIuuTL\nkfcwXT28u+Ps9YvrTL6C9Go=\n-----END PRIVATE KEY-----\n",
  client_email: "firebase-adminsdk-fbsvc@my-cashback-app.iam.gserviceaccount.com",
  client_id: "105798785608553371675",
  auth_uri: "https://accounts.google.com/o/oauth2/auth",
  token_uri: "https://oauth2.googleapis.com/token",
  auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
  client_x509_cert_url: "https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-fbsvc%40my-cashback-app.iam.gserviceaccount.com",
  universe_domain: "googleapis.com"
}



admin.initializeApp({
  credential: admin.credential.cert(serviceConnection),
});


// admin.initializeApp({
//     credential: admin.credential.cert({
//         projectId: process.env.FIREBASE_PROJECT_ID,
//         clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
//         privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
//     })
    
// });

//new with firefunction
// if (!admin.apps.length) {
//   admin.initializeApp();
// }

const db = admin.firestore();

module.exports = db;
