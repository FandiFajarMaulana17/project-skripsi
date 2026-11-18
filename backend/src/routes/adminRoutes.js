const express = require("express");
const router = express.Router();
const adminController = require("../controllers/adminController");

// Login admin tetap tersedia.
router.post("/login", adminController.login);

// Endpoint setup admin dinonaktifkan karena akun admin awal sudah tersedia.

module.exports = router;
