const express = require("express");
const router = express.Router();
const adminController = require("../controllers/adminController");

router.post("/setup", adminController.createInitialAdmin);
router.post("/login", adminController.login);

module.exports = router;
