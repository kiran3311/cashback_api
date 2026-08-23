// This service worker lets the browser receive background FCM messages.
// It must be served from the same origin as fcm-test.html.
importScripts("https://www.gstatic.com/firebasejs/10.14.1/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.14.1/firebase-messaging-compat.js");

firebase.initializeApp({
  apiKey: "REPLACE_WITH_WEB_API_KEY",
  authDomain: "REPLACE_WITH_PROJECT.firebaseapp.com",
  projectId: "my-cashback-app",
  storageBucket: "REPLACE_WITH_PROJECT.firebasestorage.app",
  messagingSenderId: "REPLACE_WITH_MESSAGING_SENDER_ID",
  appId: "REPLACE_WITH_WEB_APP_ID"
});

firebase.messaging();
