function bookingAlgorithm(bookedSeats, selectedSeats, totalSeats = 40) {
    if (!Array.isArray(bookedSeats) || !Array.isArray(selectedSeats)) {
        return { success: false, message: "Data kursi tidak valid." };
    }

    if (selectedSeats.length === 0) {
        return { success: false, message: "Silakan pilih kursi terlebih dahulu." };
    }

    const booked = bookedSeats.map(seat => String(seat).toUpperCase());
    const selected = selectedSeats.map(seat => String(seat).toUpperCase());

    if (new Set(selected).size !== selected.length) {
        return { success: false, message: "Ada kursi yang dipilih lebih dari satu kali." };
    }

    const validSeats = Array.from({ length: totalSeats }, (_, i) => String(i + 1));
    const invalidSeats = selected.filter(seat => !validSeats.includes(seat));

    if (invalidSeats.length > 0) {
        return {
            success: false,
            message: `Nomor kursi tidak valid: ${invalidSeats.join(", ")}`
        };
    }

    const unavailableSeats = selected.filter(seat => booked.includes(seat));

    if (unavailableSeats.length > 0) {
        return {
            success: false,
            message: `Kursi ${unavailableSeats.join(", ")} sudah dipesan.`
        };
    }

    return {
        success: true,
        message: "Pemesanan kursi berhasil diproses.",
        selectedSeats: selected,
        bookedSeats: [...booked, ...selected]
    };
}

module.exports = bookingAlgorithm;
