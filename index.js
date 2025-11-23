//require("dotenv").config();
const express = require("express");
const admin = require("firebase-admin");
const cors = require("cors");

const app = express();
app.use(express.json());
app.use(cors());

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





const PORT = 5000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});





const userRoutes = require("./routes/userRoute");
app.use("/", userRoutes);
