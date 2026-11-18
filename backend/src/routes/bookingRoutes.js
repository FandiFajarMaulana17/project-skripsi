const express = require("express");
const router = express.Router();

const bookingController = require("../controllers/bookingController");
const auth = require("../middleware/auth");
const requireRole = require("../middleware/requireRole");

// Pemesanan baru dan pelacakan kode booking dapat diakses publik.
router.post("/", bookingController.createBooking);
router.get("/:code", bookingController.getBookingByCode);

// Pengelolaan pemesanan hanya untuk admin.
router.get("/", auth, requireRole("admin"), bookingController.getBookings);
router.patch("/:code/approve", auth, requireRole("admin"), bookingController.approveBooking);
router.patch("/:code/reject", auth, requireRole("admin"), bookingController.rejectBooking);
router.patch("/:code/cancel", auth, requireRole("admin"), bookingController.cancelBooking);

module.exports = router;
