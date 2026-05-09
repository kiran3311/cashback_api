const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const axios = require("axios");

const app = express();
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*" }
});

/**
 * STEP 1: USER CONNECTS
 */
io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  /**
   * STEP 2: USER JOINS ROOM
   */
  socket.on("register", (userId) => {
    socket.join(userId);
    console.log(`User ${userId} joined room`);
  });

  /**
   * STEP 5: USER SENDS APPROVE / REJECT
   */
  socket.on("notification-response", async (data) => {
    console.log("Response received from client:", data);

    /**
     * STEP 6: UPDATE DB (SIMULATED)
     */
    console.log(
      `DB UPDATE → Notification ${data.notificationId} is ${data.action}`
    );

   // const url = "http://localhost:5001"
     const url = "http://72.62.195.21:5001"


    await axios.post(`${url}/updateRedeemStatus`, {
      cashbackId: data.notificationId,
      action: data.action,
      redeemAmount: data.redeemAmount

    });
  });

  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
  });
});

/**
 * STEP 3: SERVER EMITS NOTIFICATION
 * (Triggered via REST API)
 */
app.post("/send-notification", (req, res) => {
  debugger

  const { userId, notificationId, message , redeemAmount} = req.body;
  console.log("SEND NOTIFICATION API HIT:", req.body);

  io.to(userId).emit("notification", {
    notificationId,
    redeemAmount,
     message
  });

  res.json({ success: true });
});

server.listen(8000, () => {
  console.log("Server running on porthttp://localhost:8000");
});
