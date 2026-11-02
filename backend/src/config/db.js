const mongoose = require("mongoose");

const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);

        console.log("MongoDB berhasil terhubung!");
        console.log("Database: dwi_permata");
    } catch (error) {
        console.error("Koneksi MongoDB gagal:", error.message);
        process.exit(1);
    }
};

module.exports = connectDB;
