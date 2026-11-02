const Bus = require("../models/Bus");

exports.getBuses = async (req, res) => {
  try {
    const filter = { status: "ACTIVE" };

    if (req.query.origin) {
      filter.origin = new RegExp(`^${req.query.origin}$`, "i");
    }

    if (req.query.destination) {
      filter.destination = new RegExp(`^${req.query.destination}$`, "i");
    }

    if (req.query.date) {
      filter.departureDate = req.query.date;
    }

    const buses = await Bus.find(filter).sort({
      departureDate: 1,
      departureTime: 1
    });

    res.json({ success: true, data: buses });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Gagal mengambil data bus",
      error: error.message
    });
  }
};

exports.getBusById = async (req, res) => {
  try {
    const bus = await Bus.findById(req.params.id);

    if (!bus) {
      return res.status(404).json({
        success: false,
        message: "Bus tidak ditemukan"
      });
    }

    res.json({ success: true, data: bus });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: "ID bus tidak valid"
    });
  }
};

exports.createBus = async (req, res) => {
  try {
    const {
      busName,
      busNumber,
      origin,
      destination,
      departureDate,
      departureTime,
      arrivalTime,
      price,
      totalSeats
    } = req.body;

    if (
      !busName || !busNumber || !origin || !destination ||
      !departureDate || !departureTime || !arrivalTime ||
      price === undefined
    ) {
      return res.status(400).json({
        success: false,
        message: "Semua data wajib harus diisi"
      });
    }

    const bus = await Bus.create({
      busName,
      busNumber,
      origin,
      destination,
      departureDate,
      departureTime,
      arrivalTime,
      price: Number(price),
      totalSeats: Number(totalSeats || 30)
    });

    res.status(201).json({
      success: true,
      message: "Jadwal bus berhasil ditambahkan",
      data: bus
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: "Gagal menambahkan bus",
      error: error.message
    });
  }
};

exports.updateBus = async (req, res) => {
  try {
    const allowed = [
      "busName",
      "busNumber",
      "origin",
      "destination",
      "departureDate",
      "departureTime",
      "arrivalTime",
      "price",
      "totalSeats",
      "status"
    ];

    const updates = {};

    for (const key of allowed) {
      if (req.body[key] !== undefined) {
        updates[key] = req.body[key];
      }
    }

    if (updates.totalSeats !== undefined) {
      const total = Number(updates.totalSeats);

      if (!Number.isInteger(total) || total < 1) {
        return res.status(400).json({
          success: false,
          message: "Jumlah kursi tidak valid"
        });
      }

      const current = await Bus.findById(req.params.id);

      if (!current) {
        return res.status(404).json({
          success: false,
          message: "Bus tidak ditemukan"
        });
      }

      if (total < current.bookedSeats.length) {
        return res.status(400).json({
          success: false,
          message: "Jumlah kursi tidak boleh lebih kecil dari kursi yang sudah dipesan"
        });
      }

      updates.totalSeats = total;
    }

    const bus = await Bus.findByIdAndUpdate(
      req.params.id,
      { $set: updates },
      { new: true, runValidators: true }
    );

    if (!bus) {
      return res.status(404).json({
        success: false,
        message: "Bus tidak ditemukan"
      });
    }

    res.json({
      success: true,
      message: "Jadwal bus berhasil diperbarui",
      data: bus
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: "Gagal memperbarui jadwal bus",
      error: error.message
    });
  }
};

exports.deleteBus = async (req, res) => {
  try {
    const bus = await Bus.findById(req.params.id);

    if (!bus) {
      return res.status(404).json({
        success: false,
        message: "Bus tidak ditemukan"
      });
    }

    const activeBookings = await require("../models/Booking").countDocuments({
      bus: bus._id,
      status: "CONFIRMED"
    });

    if (activeBookings > 0) {
      return res.status(409).json({
        success: false,
        message: "Jadwal tidak dapat dihapus karena masih memiliki pemesanan aktif"
      });
    }

    await bus.deleteOne();

    res.json({
      success: true,
      message: "Jadwal bus berhasil dihapus"
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Gagal menghapus jadwal bus",
      error: error.message
    });
  }
};
