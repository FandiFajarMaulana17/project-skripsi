require("dotenv").config();

const express = require("express");
const cors = require("cors");
const connectDB = require("./config/db");

const busRoutes = require("./routes/busRoutes");
const bookingRoutes = require("./routes/bookingRoutes");
const adminRoutes = require("./routes/adminRoutes");

const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.json({
    message: "API Sistem Pemesanan Tiket PO Bus Dwi Permata",
    status: "Online"
  });
});

app.get("/api/health", (req, res) => {
  const mongoose = require("mongoose");

  res.json({
    server: "Online",
    database:
      mongoose.connection.readyState === 1
        ? "Connected"
        : "Disconnected"
  });
});

app.use("/api/admin", adminRoutes);
app.use("/api/buses", busRoutes);
app.use("/api/bookings", bookingRoutes);

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Alamat API tidak ditemukan"
  });
});

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  await connectDB();

  app.listen(PORT, () => {
    console.log(`Server berjalan di http://localhost:${PORT}`);
  });
};

startServer();
