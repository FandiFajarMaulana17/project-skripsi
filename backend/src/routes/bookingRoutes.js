const express = require("express");
const router = express.Router();

const bookingController = require("../controllers/bookingController");
const auth = require("../middleware/auth");

router.post("/", bookingController.createBooking);
router.get("/", auth, bookingController.getBookings);
router.get("/:code", bookingController.getBookingByCode);
router.patch("/:code/cancel", auth, bookingController.cancelBooking);

module.exports = router;
