const mongoose = require("mongoose");
const crypto = require("crypto");
const Bus = require("../models/Bus");
const Booking = require("../models/Booking");

const createBooking = async (req, res) => {
  const {
    busId,
    passengerName,
    passengerPhone,
    passengerEmail,
    seats
  } = req.body;

  if (
    !busId ||
    !mongoose.isValidObjectId(busId) ||
    !passengerName?.trim() ||
    !passengerPhone?.trim() ||
    !Array.isArray(seats) ||
    seats.length === 0
  ) {
    return res.status(400).json({
      success: false,
      message: "Data pemesanan belum lengkap atau tidak valid"
    });
  }

  const selectedSeats = seats.map(seat =>
    String(seat).trim().toUpperCase()
  );

  if (
    selectedSeats.some(seat => !/^\d+[A-D]$/.test(seat)) ||
    new Set(selectedSeats).size !== selectedSeats.length
  ) {
    return res.status(400).json({
      success: false,
      message: "Nomor kursi tidak valid atau terdapat duplikasi"
    });
  }

  const session = await mongoose.startSession();

  try {
    let createdBooking;

    const bookingCode =
      `DP-${Date.now()}-${crypto.randomBytes(3).toString("hex").toUpperCase()}`;

    await session.withTransaction(async () => {
      const bus = await Bus.findOne({
        _id: busId,
        status: "ACTIVE"
      }).session(session);

      if (!bus) {
        const error = new Error("Bus tidak ditemukan atau tidak aktif");
        error.statusCode = 404;
        throw error;
      }

      const validSeats = [];

      for (let i = 1; i <= bus.totalSeats; i++) {
        const row = Math.ceil(i / 4);
        const column = ["A", "B", "C", "D"][(i - 1) % 4];
        validSeats.push(`${row}${column}`);
      }

      const invalidSeats = selectedSeats.filter(
        seat => !validSeats.includes(seat)
      );

      if (invalidSeats.length > 0) {
        const error = new Error("Nomor kursi tidak tersedia pada armada ini");
        error.statusCode = 400;
        error.invalidSeats = invalidSeats;
        throw error;
      }

      const reservedBus = await Bus.findOneAndUpdate(
        {
          _id: busId,
          status: "ACTIVE",
          bookedSeats: { $nin: selectedSeats }
        },
        {
          $addToSet: {
            bookedSeats: { $each: selectedSeats }
          }
        },
        {
          new: true,
          session
        }
      );

      if (!reservedBus) {
        const error = new Error(
          "Salah satu kursi sudah dipesan. Silakan pilih kursi lain."
        );
        error.statusCode = 409;
        throw error;
      }

      const booking = new Booking({
        bookingCode,
        bus: busId,
        passengerName: passengerName.trim(),
        passengerPhone: passengerPhone.trim(),
        passengerEmail: passengerEmail?.trim() || undefined,
        seats: selectedSeats,
        totalPrice: bus.price * selectedSeats.length,
        status: "PENDING"
      });

      await booking.save({ session });
      createdBooking = booking;
    });

    return res.status(201).json({
      success: true,
      message: "Pemesanan berhasil dikirim dan menunggu persetujuan Admin",
      booking: createdBooking
    });
  } catch (error) {
    console.error("Create booking error:", error);

    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.statusCode
        ? error.message
        : "Terjadi kesalahan saat membuat pemesanan",
      ...(error.invalidSeats ? { invalidSeats: error.invalidSeats } : {})
    });
  } finally {
    await session.endSession();
  }
};

const getBookings = async (req, res) => {
  try {
    const bookings = await Booking.find()
      .populate(
        "bus",
        "busName busNumber origin destination departureDate departureTime"
      )
      .sort({ createdAt: -1 });

    return res.json({ success: true, bookings });
  } catch (error) {
    console.error("Get bookings error:", error);
    return res.status(500).json({
      success: false,
      message: "Gagal mengambil data pemesanan"
    });
  }
};

const getBookingByCode = async (req, res) => {
  try {
    const booking = await Booking.findOne({
      bookingCode: req.params.code
    }).populate(
      "bus",
      "busName busNumber origin destination departureDate departureTime arrivalTime price"
    );

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Kode pemesanan tidak ditemukan"
      });
    }

    // Informasi kontak penumpang tidak ditampilkan pada pelacakan publik.
    const publicBooking = booking.toObject();
    delete publicBooking.passengerPhone;
    delete publicBooking.passengerEmail;

    return res.json({
      success: true,
      booking: publicBooking
    });
  } catch (error) {
    console.error("Get booking by code error:", error);
    return res.status(500).json({
      success: false,
      message: "Gagal mengambil informasi pemesanan"
    });
  }
};

const approveBooking = async (req, res) => {
  try {
    const booking = await Booking.findOneAndUpdate(
      {
        bookingCode: req.params.code,
        status: "PENDING"
      },
      {
        $set: {
          status: "APPROVED",
          adminMessage: req.body.message || "Pemesanan disetujui oleh Admin."
        }
      },
      { new: true, runValidators: true }
    );

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Pemesanan tidak ditemukan atau sudah diproses"
      });
    }

    return res.json({
      success: true,
      message: "Pemesanan berhasil disetujui",
      booking
    });
  } catch (error) {
    console.error("Approve booking error:", error);
    return res.status(500).json({
      success: false,
      message: "Gagal menyetujui pemesanan"
    });
  }
};

const rejectBooking = async (req, res) => {
  const session = await mongoose.startSession();

  try {
    let updatedBooking;

    await session.withTransaction(async () => {
      const booking = await Booking.findOneAndUpdate(
        {
          bookingCode: req.params.code,
          status: "PENDING"
        },
        {
          $set: {
            status: "REJECTED",
            adminMessage: req.body.message || "Pemesanan ditolak oleh Admin."
          }
        },
        {
          new: true,
          runValidators: true,
          session
        }
      );

      if (!booking) {
        const error = new Error(
          "Pemesanan tidak ditemukan atau sudah diproses"
        );
        error.statusCode = 404;
        throw error;
      }

      const releasedBus = await Bus.updateOne(
        { _id: booking.bus },
        { $pull: { bookedSeats: { $in: booking.seats } } },
        { session }
      );

      if (releasedBus.matchedCount !== 1) {
        throw new Error("Data bus tidak ditemukan; transaksi dibatalkan");
      }

      updatedBooking = booking;
    });

    return res.json({
      success: true,
      message: "Pemesanan ditolak dan kursi tersedia kembali",
      booking: updatedBooking
    });
  } catch (error) {
    console.error("Reject booking error:", error);
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.statusCode
        ? error.message
        : "Gagal menolak pemesanan"
    });
  } finally {
    await session.endSession();
  }
};

const cancelBooking = async (req, res) => {
  const session = await mongoose.startSession();

  try {
    let updatedBooking;

    await session.withTransaction(async () => {
      const booking = await Booking.findOneAndUpdate(
        {
          bookingCode: req.params.code,
          status: { $in: ["APPROVED", "CONFIRMED"] }
        },
        {
          $set: { status: "CANCELLED" }
        },
        {
          new: true,
          runValidators: true,
          session
        }
      );

      if (!booking) {
        const error = new Error(
          "Pemesanan tidak ditemukan atau tidak dapat dibatalkan"
        );
        error.statusCode = 404;
        throw error;
      }

      const releasedBus = await Bus.updateOne(
        { _id: booking.bus },
        { $pull: { bookedSeats: { $in: booking.seats } } },
        { session }
      );

      if (releasedBus.matchedCount !== 1) {
        throw new Error("Data bus tidak ditemukan; transaksi dibatalkan");
      }

      updatedBooking = booking;
    });

    return res.json({
      success: true,
      message: "Pemesanan berhasil dibatalkan dan kursi tersedia kembali",
      booking: updatedBooking
    });
  } catch (error) {
    console.error("Cancel booking error:", error);
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.statusCode
        ? error.message
        : "Gagal membatalkan pemesanan"
    });
  } finally {
    await session.endSession();
  }
};

module.exports = {
  createBooking,
  getBookings,
  getBookingByCode,
  approveBooking,
  rejectBooking,
  cancelBooking
};
