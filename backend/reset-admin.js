require("dotenv").config();

const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const Admin = require("./src/models/Admin");

async function resetPassword() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);

    const username = process.env.ADMIN_USERNAME || "admin";
    const newPassword = "DwiPermata2026!";

    const hashedPassword = await bcrypt.hash(newPassword, 12);

    const admin = await Admin.findOneAndUpdate(
      { username },
      { password: hashedPassword },
      { new: true }
    );

    if (!admin) {
      console.log("Akun admin tidak ditemukan.");
    } else {
      console.log("Password admin berhasil diperbarui.");
      console.log("Username:", username);
      console.log("Password:", newPassword);
    }
  } catch (error) {
    console.error("Gagal:", error.message);
  } finally {
    await mongoose.disconnect();
  }
}

resetPassword();
