const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const Customer = require("../models/Customer");

const createToken = (customer) => {
  return jwt.sign(
    {
      id: customer._id.toString(),
      role: "customer",
      email: customer.email
    },
    process.env.JWT_SECRET,
    { expiresIn: "8h" }
  );
};

exports.register = async (req, res) => {
  try {
    const { name, email, phone, password } = req.body;

    if (!name || !email || !phone || !password) {
      return res.status(400).json({
        success: false,
        message: "Semua data registrasi wajib diisi"
      });
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({
        success: false,
        message: "Format email tidak valid"
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        message: "Password minimal 8 karakter"
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const existing = await Customer.findOne({
      email: normalizedEmail
    });

    if (existing) {
      return res.status(409).json({
        success: false,
        message: "Email sudah terdaftar"
      });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const customer = await Customer.create({
      name: name.trim(),
      email: normalizedEmail,
      phone: phone.trim(),
      password: hashedPassword
    });

    const token = createToken(customer);

    return res.status(201).json({
      success: true,
      message: "Registrasi berhasil",
      token,
      customer: {
        id: customer._id,
        name: customer.name,
        email: customer.email,
        phone: customer.phone
      }
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "Email sudah digunakan"
      });
    }

    return res.status(500).json({
      success: false,
      message: "Registrasi gagal",
      error: error.message
    });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email dan password wajib diisi"
      });
    }

    const customer = await Customer.findOne({
      email: email.trim().toLowerCase()
    });

    if (
      !customer ||
      !(await bcrypt.compare(password, customer.password))
    ) {
      return res.status(401).json({
        success: false,
        message: "Email atau password salah"
      });
    }

    const token = createToken(customer);

    return res.json({
      success: true,
      message: "Login pelanggan berhasil",
      token,
      customer: {
        id: customer._id,
        name: customer.name,
        email: customer.email,
        phone: customer.phone
      }
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Terjadi kesalahan saat login"
    });
  }
};
