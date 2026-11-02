const Bus = require("../models/Bus");
const Booking = require("../models/Booking");

const createBooking = async (req, res) => {
    try {
        const {
            busId,
            passengerName,
            passengerPhone,
            passengerEmail,
            seats
        } = req.body;

        if (!busId || !passengerName || !passengerPhone ||
            !Array.isArray(seats) || seats.length === 0) {
            return res.status(400).json({
                success: false,
                message: "Data pemesanan belum lengkap"
            });
        }

        const selectedSeats = seats.map(seat => String(seat).toUpperCase());

        if (new Set(selectedSeats).size !== selectedSeats.length) {
            return res.status(400).json({
                success: false,
                message: "Terdapat nomor kursi yang duplikat"
            });
        }

        const bus = await Bus.findOne({
            _id: busId,
            status: "ACTIVE"
        });

        if (!bus) {
            return res.status(404).json({
                success: false,
                message: "Bus tidak ditemukan atau tidak aktif"
            });
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
            return res.status(400).json({
                success: false,
                message: "Nomor kursi tidak valid",
                invalidSeats
            });
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
            { new: true }
        );

        if (!reservedBus) {
            return res.status(409).json({
                success: false,
                message: "Salah satu kursi sudah dipesan. Silakan pilih kursi lain."
            });
        }

        try {
            const booking = await Booking.create({
                bookingCode: `DP-${Date.now()}`,
                bus: busId,
                passengerName,
                passengerPhone,
                passengerEmail,
                seats: selectedSeats,
                totalPrice: bus.price * selectedSeats.length,
                status: "CONFIRMED"
            });

            return res.status(201).json({
                success: true,
                message: "Pemesanan tiket berhasil",
                booking
            });
        } catch (error) {
            await Bus.updateOne(
                { _id: busId },
                { $pull: { bookedSeats: { $in: selectedSeats } } }
            );
            throw error;
        }
    } catch (error) {
        console.error("Create booking error:", error);

        return res.status(500).json({
            success: false,
            message: "Terjadi kesalahan saat membuat pemesanan",
            error: error.message
        });
    }
};

const getBookings = async (req, res) => {
    try {
        const bookings = await Booking.find()
            .populate("bus", "busName busNumber origin destination departureDate departureTime")
            .sort({ createdAt: -1 });

        return res.json({
            success: true,
            bookings
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

const getBookingByCode = async (req, res) => {
    try {
        const booking = await Booking.findOne({
            bookingCode: req.params.code
        }).populate("bus");

        if (!booking) {
            return res.status(404).json({
                success: false,
                message: "Kode pemesanan tidak ditemukan"
            });
        }

        return res.json({
            success: true,
            booking
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

const cancelBooking = async (req, res) => {
    try {
        const booking = await Booking.findOneAndUpdate(
            {
                bookingCode: req.params.code,
                status: "CONFIRMED"
            },
            {
                $set: { status: "CANCELLED" }
            },
            { new: true }
        );

        if (!booking) {
            return res.status(404).json({
                success: false,
                message: "Pemesanan tidak ditemukan atau sudah dibatalkan"
            });
        }

        await Bus.updateOne(
            { _id: booking.bus },
            { $pull: { bookedSeats: { $in: booking.seats } } }
        );

        return res.json({
            success: true,
            message: "Pemesanan berhasil dibatalkan",
            booking
        });
    } catch (error) {
        console.error("Cancel booking error:", error);

        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

module.exports = {
    createBooking,
    getBookings,
    getBookingByCode,
    cancelBooking
};
