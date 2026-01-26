const express = require("express");
const http = require("http");
const cors = require("cors");
const { Server } = require("socket.io");
const admin = require("firebase-admin");

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*" }
});

// 🔥 Initialize Firebase Admin (same project)
admin.initializeApp({
  credential: admin.credential.cert(
    require("./serviceAccountKey.json")
  )
});

const db = admin.firestore();

// store connected users
const users = new Map();

io.on("connection", (socket) => {
  console.log("Connected:", socket.id);

  socket.on("register", ({ userId, role }) => {
    users.set(userId, socket.id);
    console.log(role, "connected:", userId);
  });

  socket.on("disconnect", () => {
    for (let [key, value] of users.entries()) {
      if (value === socket.id) users.delete(key);
    }
  });
});

server.listen(4000, () =>
  console.log("Socket server running on 4000")
);
