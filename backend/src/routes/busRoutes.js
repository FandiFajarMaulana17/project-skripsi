const express = require("express");
const router = express.Router();
const busController = require("../controllers/busController");
const auth = require("../middleware/auth");

router.get("/", busController.getBuses);
router.get("/:id", busController.getBusById);
router.post("/", auth, busController.createBus);
router.put("/:id", auth, busController.updateBus);
router.delete("/:id", auth, busController.deleteBus);

module.exports = router;
