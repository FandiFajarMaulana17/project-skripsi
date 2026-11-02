const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const Admin = require("../models/Admin");

exports.createInitialAdmin = async (req, res) => {
  try {
    const existing = await Admin.findOne({
      username: process.env.ADMIN_USERNAME
    });

    if (existing) {
      return res.status(409).json({
        success: false,
        message: "Admin awal sudah dibuat"
      });
    }

    const password = await bcrypt.hash(process.env.ADMIN_PASSWORD, 12);

    const admin = await Admin.create({
      name: "Administrator",
      username: process.env.ADMIN_USERNAME,
      password
    });

    res.status(201).json({
      success: true,
      message: "Admin awal berhasil dibuat",
      username: admin.username
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Gagal membuat admin",
      error: error.message
    });
  }
};

exports.login = async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: "Username dan password wajib diisi"
      });
    }

    const admin = await Admin.findOne({ username });

    if (!admin || !(await bcrypt.compare(password, admin.password))) {
      return res.status(401).json({
        success: false,
        message: "Username atau password salah"
      });
    }

    const token = jwt.sign(
      { id: admin._id, username: admin.username },
      process.env.JWT_SECRET,
      { expiresIn: "8h" }
    );

    res.json({
      success: true,
      message: "Login berhasil",
      token,
      admin: {
        name: admin.name,
        username: admin.username
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Terjadi kesalahan saat login"
    });
  }
};
