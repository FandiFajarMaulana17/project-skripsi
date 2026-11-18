const express = require("express");
const router = express.Router();

const busController = require("../controllers/busController");
const auth = require("../middleware/auth");
const requireRole = require("../middleware/requireRole");

router.get("/", busController.getBuses);
router.get("/:id", busController.getBusById);

router.post("/", auth, requireRole("admin"), busController.createBus);
router.put("/:id", auth, requireRole("admin"), busController.updateBus);
router.delete("/:id", auth, requireRole("admin"), busController.deleteBus);

module.exports = router;
