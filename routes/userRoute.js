

const express = require("express");
const router = express.Router();

const { createUser, getAllUsers, register , login} = require("../controller/userController")

router.post("/adduser", createUser);
router.get("/getUsers", getAllUsers)

router.post("/register", register);
router.post("/login", login);
module.exports = router;
