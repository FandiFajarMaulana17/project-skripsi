import { useEffect, useState } from "react";
import "./App.css";


const API = "http://localhost:5000/api";

function App() {
  const [page, setPage] = useState(window.location.pathname);
  const [buses, setBuses] = useState([]);
  const [search, setSearch] = useState({
    origin: "Jakarta",
    destination: "Bandung",
    date: new Date().toISOString().slice(0, 10)
  });
  const [selectedBus, setSelectedBus] = useState(null);
  const [selectedSeats, setSelectedSeats] = useState([]);
  const [passenger, setPassenger] = useState({
    passengerName: "",
    passengerPhone: "",
    passengerEmail: ""
  });
  const [bookingResult, setBookingResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState("");

  const [token, setToken] = useState(localStorage.getItem("dp_token") || "");
  const [adminUser, setAdminUser] = useState("admin");
  const [adminPassword, setAdminPassword] = useState("");
  const [adminTab, setAdminTab] = useState("dashboard");
  const [adminBuses, setAdminBuses] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [busForm, setBusForm] = useState({
    busName: "Dwi Permata Executive",
    busNumber: "",
    origin: "Jakarta",
    destination: "Bandung",
    departureDate: new Date().toISOString().slice(0, 10),
    departureTime: "08:00",
    arrivalTime: "12:00",
    price: 150000,
    totalSeats: 30
  });

  useEffect(() => {
    const onPopState = () => setPage(window.location.pathname);
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  const navigate = (path) => {
    window.history.pushState({}, "", path);
    setPage(path);
    setNotice("");
  };

  const request = async (url, options = {}) => {
    const response = await fetch(`${API}${url}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(options.headers || {})
      }
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(data.message || "Permintaan gagal diproses");
    }

    return data;
  };

  const searchBuses = async (event) => {
    if (event) event.preventDefault();
    setLoading(true);
    setNotice("");
    setSelectedBus(null);
    setSelectedSeats([]);
    if (event) setBookingResult(null);

    try {
      const params = new URLSearchParams(search);
      const data = await request(`/buses?${params.toString()}`);
      setBuses(data.buses || data.data || []);
      if (!(data.buses || data.data || []).length) {
        setNotice("Bus belum tersedia untuk rute dan tanggal tersebut. Silakan coba rute lain.");
      }
    } catch (error) {
      setNotice(error.message);
    } finally {
      setLoading(false);
    }
  };

  const chooseBus = (bus) => {
    setSelectedBus(bus);
    setSelectedSeats([]);
    setBookingResult(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const toggleSeat = (seat) => {
    if (selectedBus?.bookedSeats?.includes(seat)) return;

    setSelectedSeats((current) =>
      current.includes(seat)
        ? current.filter((item) => item !== seat)
        : [...current, seat]
    );
  };

  const submitBooking = async (event) => {
    event.preventDefault();

    if (!selectedBus || selectedSeats.length === 0) {
      setNotice("Pilih minimal satu kursi terlebih dahulu.");
      return;
    }

    setLoading(true);
    setNotice("");

    try {
      const data = await request("/bookings", {
        method: "POST",
        body: JSON.stringify({
          busId: selectedBus._id,
          ...passenger,
          seats: selectedSeats
        })
      });

      setBookingResult(data.booking);
      setSelectedSeats([]);
      await searchBuses();
      setNotice("Pemesanan berhasil dibuat.");
    } catch (error) {
      setNotice(error.message);
      await searchBuses();
    } finally {
      setLoading(false);
    }
  };

  const adminHeaders = {
    Authorization: `Bearer ${token}`
  };

  const loadAdminData = async () => {
    try {
      const [busData, bookingData] = await Promise.all([
        request("/buses"),
        request("/bookings", { headers: adminHeaders })
      ]);

      setAdminBuses(busData.buses || busData.data || []);
      setBookings(bookingData.bookings || bookingData.data || []);
    } catch (error) {
      setNotice(error.message);
    }
  };

  useEffect(() => {
    if (page === "/admin" && token) loadAdminData();
  }, [page, token]);

  const loginAdmin = async (event) => {
    event.preventDefault();
    setLoading(true);
    setNotice("");

    try {
      const data = await request("/admin/login", {
        method: "POST",
        body: JSON.stringify({
          username: adminUser,
          password: adminPassword
        })
      });

      const newToken = data.token || data.accessToken;

      if (!newToken) {
        throw new Error("Token login tidak ditemukan pada respons server.");
      }

      localStorage.setItem("dp_token", newToken);
      setToken(newToken);
      setNotice("Login admin berhasil.");
    } catch (error) {
      setNotice(error.message);
    } finally {
      setLoading(false);
    }
  };

  const addBus = async (event) => {
    event.preventDefault();
    setLoading(true);
    setNotice("");

    try {
      await request("/buses", {
        method: "POST",
        headers: adminHeaders,
        body: JSON.stringify({
          ...busForm,
          price: Number(busForm.price),
          totalSeats: Number(busForm.totalSeats)
        })
      });

      setNotice("Data bus berhasil ditambahkan.");
      setBusForm({
        ...busForm,
        busNumber: ""
      });
      await loadAdminData();
    } catch (error) {
      setNotice(error.message);
    } finally {
      setLoading(false);
    }
  };

  const cancelBooking = async (code) => {
    if (!window.confirm(`Batalkan pemesanan ${code}?`)) return;

    try {
      await request(`/bookings/${encodeURIComponent(code)}/cancel`, {
        method: "PATCH",
        headers: adminHeaders
      });
      setNotice("Pemesanan berhasil dibatalkan.");
      await loadAdminData();
    } catch (error) {
      setNotice(error.message);
    }
  };

  const deleteBus = async (id) => {
    if (!window.confirm("Yakin ingin menghapus data bus ini?")) return;

    try {
      await request(`/buses/${id}`, {
        method: "DELETE",
        headers: adminHeaders
      });
      setNotice("Data bus berhasil dihapus.");
      await loadAdminData();
    } catch (error) {
      setNotice(error.message);
    }
  };

  const logout = () => {
    localStorage.removeItem("dp_token");
    setToken("");
    setNotice("Kamu sudah logout.");
  };

  const money = (value) =>
    new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0
    }).format(value || 0);

  const dateFormat = (value) => {
    if (!value) return "-";
    return new Date(value + "T00:00:00").toLocaleDateString("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric"
    });
  };

  const seats = Array.from(
    { length: Number(selectedBus?.totalSeats || 30) },
    (_, index) => {
      const row = Math.ceil((index + 1) / 4);
      const col = ["A", "B", "C", "D"][index % 4];
      return `${row}${col}`;
    }
  );

  if (page === "/admin") {
    if (!token) {
      return (
        <div className="admin-login-page">
          <form className="login-card" onSubmit={loginAdmin}>
            <img
  src="/images/bus-dwi-permata.jpeg"
  alt="PO Bus Dwi Permata"
  className="brand-logo"
/>
            <span className="eyebrow">AREA ADMINISTRATOR</span>
            <h1>Selamat Datang</h1>
            <p>Masuk untuk mengelola sistem PO Bus Dwi Permata.</p>
            <label>Username</label>
            <input value={adminUser} onChange={(e) => setAdminUser(e.target.value)} required />
            <label>Password</label>
            <input type="password" value={adminPassword} onChange={(e) => setAdminPassword(e.target.value)} required />
            {notice && <div className="notice">{notice}</div>}
            <button className="primary-btn full" disabled={loading}>
              {loading ? "Memproses..." : "Masuk Dashboard"}
            </button>
            <button type="button" className="text-btn" onClick={() => navigate("/")}>
              Kembali ke halaman utama
            </button>
          </form>
        </div>
      );
    }

    return (
      <div className="admin-layout">
        <aside className="sidebar">
          <div className="brand admin-brand">
            <img
  src="/images/bus-dwi-permata.jpeg"
  alt="PO Bus Dwi Permata"
  className="brand-logo"
/>
            <div><strong>DWI PERMATA</strong><small>ADMIN PANEL</small></div>
          </div>
          <p className="side-label">MENU UTAMA</p>
          {[
            ["dashboard", "▦", "Dashboard"],
            ["buses", "▣", "Data Bus"],
            ["bookings", "▤", "Data Pemesanan"]
          ].map(([key, icon, label]) => (
            <button key={key} className={`side-link ${adminTab === key ? "active" : ""}`} onClick={() => { setAdminTab(key); loadAdminData(); }}>
              <span>{icon}</span>{label}
            </button>
          ))}
          <button className="side-link logout-link" onClick={logout}>↪ Keluar</button>
        </aside>

        <main className="admin-main">
          <header className="admin-topbar">
            <div><span className="eyebrow">SISTEM MANAJEMEN</span><h2>Dashboard Admin</h2></div>
            <div className="admin-profile"><span className="avatar">A</span><div><strong>Administrator</strong><small>Pengelola sistem</small></div></div>
          </header>

          {notice && <div className="notice">{notice}</div>}

          {adminTab === "dashboard" && (
            <>
              <div className="welcome-panel welcome-modern">
                <div className="welcome-copy">
                  <span>PO BUS DWI PERMATA</span>
                  <h1>Kelola perjalanan dengan lebih mudah.</h1>
                  <p>Pantau armada bus dan pemesanan pelanggan dalam satu dashboard.</p>
                  <button className="welcome-action" onClick={() => setAdminTab("buses")}>
                    Kelola Armada Bus <span>→</span>
                  </button>
                </div>
                <div className="welcome-photo">
                  <img
  src="/images/bus-dwi-permata.jpeg"
  alt="Armada Bus PO Dwi Permata"
  className="bus-hero-image"
 />
                </div>
              </div>
              <div className="stat-grid">
                <div className="stat-card"><span>Total Bus</span><strong>{adminBuses.length}</strong><small>Data armada terdaftar</small></div>
                <div className="stat-card"><span>Total Pemesanan</span><strong>{bookings.length}</strong><small>Seluruh transaksi tercatat</small></div>
                <div className="stat-card"><span>Pemesanan Aktif</span><strong>{bookings.filter(b => b.status === "CONFIRMED").length}</strong><small>Status terkonfirmasi</small></div>
              </div>
              <section className="admin-panel">
                <div className="panel-heading"><div><h3>Pemesanan Terbaru</h3><p>Daftar transaksi pelanggan terbaru.</p></div><button className="outline-btn" onClick={() => setAdminTab("bookings")}>Lihat semua</button></div>
                <BookingTable bookings={bookings.slice(0, 5)} money={money} />
              </section>
            </>
          )}

          {adminTab === "buses" && (
            <>
              <section className="admin-panel">
                <div className="panel-heading"><div><h3>Tambah Data Bus</h3><p>Masukkan informasi armada dan jadwal perjalanan.</p></div></div>
                <form className="bus-form" onSubmit={addBus}>
                  {[
                    ["busName", "Nama Bus", "text"],
                    ["busNumber", "Nomor Bus", "text"],
                    ["origin", "Kota Asal", "text"],
                    ["destination", "Kota Tujuan", "text"],
                    ["departureDate", "Tanggal Berangkat", "date"],
                    ["departureTime", "Jam Berangkat", "time"],
                    ["arrivalTime", "Jam Tiba", "time"],
                    ["price", "Harga Tiket", "number"],
                    ["totalSeats", "Jumlah Kursi", "number"]
                  ].map(([key, label, type]) => (
                    <label key={key}>{label}<input type={type} min={type === "number" ? "1" : undefined} value={busForm[key]} onChange={(e) => setBusForm({ ...busForm, [key]: e.target.value })} required /></label>
                  ))}
                  <div className="form-action"><button className="primary-btn" disabled={loading}>{loading ? "Menyimpan..." : "Simpan Data Bus"}</button></div>
                </form>
              </section>
              <section className="admin-panel">
                <div className="panel-heading"><div><h3>Daftar Armada Bus</h3><p>Data bus yang tersedia di sistem.</p></div></div>
                <div className="table-wrap"><table><thead><tr><th>Bus</th><th>Rute</th><th>Tanggal</th><th>Harga</th><th>Kursi</th><th>Aksi</th></tr></thead><tbody>
                  {adminBuses.map(bus => <tr key={bus._id}><td><strong>{bus.busName}</strong><small>{bus.busNumber}</small></td><td>{bus.origin} – {bus.destination}</td><td>{dateFormat(bus.departureDate)}</td><td>{money(bus.price)}</td><td>{bus.bookedSeats?.length || 0}/{bus.totalSeats}</td><td><button className="danger-btn" onClick={() => deleteBus(bus._id)}>Hapus</button></td></tr>)}
                  {!adminBuses.length && <tr><td colSpan="6" className="empty">Belum ada data bus.</td></tr>}
                </tbody></table></div>
              </section>
            </>
          )}

          {adminTab === "bookings" && (
            <section className="admin-panel">
              <div className="panel-heading"><div><h3>Data Pemesanan</h3><p>Pantau dan kelola transaksi pelanggan.</p></div><button className="outline-btn" onClick={loadAdminData}>Muat ulang</button></div>
              <div className="table-wrap"><table><thead><tr><th>Kode</th><th>Penumpang</th><th>Bus</th><th>Kursi</th><th>Total</th><th>Status</th><th>Aksi</th></tr></thead><tbody>
                {bookings.map(b => <tr key={b._id}><td><strong>{b.bookingCode}</strong></td><td>{b.passengerName}<small>{b.passengerPhone}</small></td><td>{b.bus?.busName || "-"}</td><td>{b.seats?.join(", ")}</td><td>{money(b.totalPrice)}</td><td><span className={`status ${b.status === "CONFIRMED" ? "confirmed" : "cancelled"}`}>{b.status}</span></td><td>{b.status === "CONFIRMED" && <button className="danger-btn" onClick={() => cancelBooking(b.bookingCode)}>Batalkan</button>}</td></tr>)}
                {!bookings.length && <tr><td colSpan="7" className="empty">Belum ada pemesanan.</td></tr>}
              </tbody></table></div>
            </section>
          )}
        </main>
      </div>
    );
  }

  return (
    <div className="customer-app">
      <header className="site-header">
        <div className="container nav-container">
          <button className="brand brand-button" onClick={() => navigate("/")}>
            <img
  src="/images/bus-dwi-permata.jpeg"
  alt="PO Bus Dwi Permata"
  className="brand-logo"
/>
            <div><strong>DWI PERMATA</strong><small>BUS & TRAVEL</small></div>
          </button>
          <nav><a href="#beranda">Beranda</a><a href="#layanan">Layanan</a><a href="#cara-pesan">Cara Pesan</a></nav>
          <button className="admin-nav-btn" onClick={() => navigate("/admin")}>Masuk Admin ↗</button>
        </div>
      </header>

      <main>
        <section className="hero" id="beranda">
          <div className="container hero-content">
            <div className="hero-copy">
              <span className="eyebrow hero-eyebrow">PERJALANAN NYAMAN BERSAMA KAMI</span>
              <h1>Perjalanan nyaman,<br /><em>tujuan lebih dekat.</em></h1>
              <p>Nikmati perjalanan yang aman dan nyaman bersama PO Bus Dwi Permata. Pesan tiket dan pilih kursi favoritmu dengan mudah.</p>
              <div className="hero-points"><span>✓ Pilih kursi sendiri</span><span>✓ Pemesanan online</span><span>✓ Informasi jadwal</span></div>
            </div>
            <div className="hero-art">
              <div className="hero-photo-frame">
                <img
                  src="/images/bus-dwi-permata.jpeg"
                  alt="Armada PO Bus Dwi Permata"
                  className="bus-hero-image"
                />
                <div className="hero-tag">
                  <strong>30</strong>
                  <span>Kursi tersedia<br />sesuai armada</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="search-section container">
          <div className="search-card">
            <div className="search-title"><div><span className="eyebrow">PESAN TIKET ONLINE</span><h2>Cari perjalananmu</h2></div><span className="search-icon">⌕</span></div>
            <form className="search-form" onSubmit={searchBuses}>
              <label>Kota asal<div className="input-icon"><span>⌖</span><input value={search.origin} onChange={e => setSearch({ ...search, origin: e.target.value })} placeholder="Contoh: Jakarta" required /></div></label>
              <label>Kota tujuan<div className="input-icon"><span>⌖</span><input value={search.destination} onChange={e => setSearch({ ...search, destination: e.target.value })} placeholder="Contoh: Bandung" required /></div></label>
              <label>Tanggal berangkat<div className="input-icon"><span>▦</span><input type="date" min={new Date().toISOString().slice(0, 10)} value={search.date} onChange={e => setSearch({ ...search, date: e.target.value })} required /></div></label>
              <button className="primary-btn search-btn" disabled={loading}>{loading ? "Mencari..." : "Cari Tiket →"}</button>
            </form>
          </div>
        </section>

        <section className="results-section container" id="hasil">
          {notice && <div className="notice">{notice}</div>}

          {bookingResult && (
            <div className="success-ticket">
              <div className="success-mark">✓</div><div><span className="eyebrow">PEMESANAN BERHASIL</span><h2>Tiket berhasil dipesan!</h2><p>Simpan kode pemesanan berikut untuk pemeriksaan lebih lanjut.</p><strong className="booking-code">{bookingResult.bookingCode}</strong><p>Penumpang: {bookingResult.passengerName} · Kursi: {bookingResult.seats?.join(", ")}</p></div>
            </div>
          )}

          {selectedBus && !bookingResult && (
            <div className="booking-workspace">
              <div className="section-heading"><div><span className="eyebrow">PILIH TEMPAT DUDUK</span><h2>Atur kursi perjalananmu</h2></div><button className="outline-btn" onClick={() => setSelectedBus(null)}>← Kembali ke bus</button></div>
              <div className="booking-grid">
                <div className="seat-panel">
                  <div className="bus-label">DEPAN BUS · SOPIR</div>
                  <div className="seat-grid">
                    {seats.map((seat, index) => {
                      const booked = selectedBus.bookedSeats?.includes(seat);
                      const selected = selectedSeats.includes(seat);
                      return <button key={seat} disabled={booked} className={`seat ${booked ? "booked" : ""} ${selected ? "selected" : ""}`} onClick={() => toggleSeat(seat)}>{seat}</button>;
                    })}
                  </div>
                  <div className="seat-legend"><span><i className="seat available"></i>Tersedia</span><span><i className="seat selected"></i>Pilihanmu</span><span><i className="seat booked"></i>Terisi</span></div>
                </div>
                <div className="passenger-panel">
                  <h3>Detail Pemesanan</h3>
                  <div className="route-summary"><strong>{selectedBus.origin}</strong><span>→</span><strong>{selectedBus.destination}</strong></div>
                  <p>{selectedBus.busName} · {selectedBus.departureTime}</p>
                  <div className="summary-row"><span>Tanggal</span><strong>{dateFormat(selectedBus.departureDate)}</strong></div>
                  <div className="summary-row"><span>Kursi dipilih</span><strong>{selectedSeats.join(", ") || "-"}</strong></div>
                  <div className="summary-row"><span>Jumlah kursi</span><strong>{selectedSeats.length}</strong></div>
                  <div className="summary-row total"><span>Total pembayaran</span><strong>{money(selectedBus.price * selectedSeats.length)}</strong></div>
                  <form onSubmit={submitBooking} className="passenger-form">
                    <h3>Data Penumpang</h3>
                    <label>Nama lengkap<input value={passenger.passengerName} onChange={e => setPassenger({ ...passenger, passengerName: e.target.value })} required placeholder="Nama sesuai identitas" /></label>
                    <label>Nomor telepon<input value={passenger.passengerPhone} onChange={e => setPassenger({ ...passenger, passengerPhone: e.target.value })} required placeholder="08xxxxxxxxxx" /></label>
                    <label>Email (opsional)<input type="email" value={passenger.passengerEmail} onChange={e => setPassenger({ ...passenger, passengerEmail: e.target.value })} placeholder="email@contoh.com" /></label>
                    <button className="primary-btn full" disabled={loading || selectedSeats.length === 0}>{loading ? "Memproses..." : "Konfirmasi Pemesanan"}</button>
                  </form>
                </div>
              </div>
            </div>
          )}

          {!selectedBus && !bookingResult && buses.length > 0 && (
            <div className="bus-results">
              <div className="section-heading"><div><span className="eyebrow">PILIH PERJALANAN</span><h2>Bus yang tersedia</h2></div><span className="result-count">{buses.length} bus ditemukan</span></div>
              {buses.map(bus => {
                const available = Number(bus.totalSeats || 30) - (bus.bookedSeats?.length || 0);
                return <div className="bus-card" key={bus._id}>
                  <div className="bus-card-icon">🚌</div>
                  <div className="bus-info"><h3>{bus.busName}</h3><span>{bus.busNumber}</span><div className="bus-route"><strong>{bus.origin}</strong><span>────────→</span><strong>{bus.destination}</strong></div><small>{dateFormat(bus.departureDate)} · {bus.departureTime} – {bus.arrivalTime}</small></div>
                  <div className="bus-price"><span>Harga per kursi</span><strong>{money(bus.price)}</strong><small>{available} kursi tersedia</small><button className="primary-btn" disabled={available <= 0} onClick={() => chooseBus(bus)}>{available > 0 ? "Pilih Kursi" : "Kursi Penuh"}</button></div>
                </div>;
              })}
            </div>
          )}
        </section>

        <section className="features-section" id="layanan">
          <div className="container"><div className="section-heading center"><div><span className="eyebrow">KENAPA MEMILIH KAMI?</span><h2>Perjalanan lebih praktis</h2><p>Kami hadir untuk membantu perjalananmu menjadi lebih mudah.</p></div></div>
            <div className="feature-grid"><div className="feature-card"><span>💺</span><h3>Pilih Kursi</h3><p>Pilih nomor kursi sesuai keinginan dan lihat status ketersediaannya.</p></div><div className="feature-card"><span>📱</span><h3>Pesan Online</h3><p>Proses pemesanan tiket dapat dilakukan melalui website.</p></div><div className="feature-card"><span>🛡️</span><h3>Validasi Kursi</h3><p>Sistem memeriksa kursi agar tidak dipesan lebih dari satu kali.</p></div></div>
          </div>
        </section>

        <section className="steps-section container" id="cara-pesan">
          <div className="section-heading center"><div><span className="eyebrow">MUDAH DAN SEDERHANA</span><h2>Bagaimana cara memesan?</h2></div></div>
          <div className="steps-grid"><div><b>01</b><h3>Cari Bus</h3><p>Masukkan kota asal, tujuan, dan tanggal perjalanan.</p></div><div><b>02</b><h3>Pilih Kursi</h3><p>Pilih kursi yang masih tersedia pada bus pilihanmu.</p></div><div><b>03</b><h3>Isi Data</h3><p>Masukkan data penumpang dengan benar.</p></div><div><b>04</b><h3>Selesai</h3><p>Simpan kode pemesanan sebagai bukti transaksi.</p></div></div>
        </section>
      </main>

      <section className="contact-section" id="kontak">
        <div className="container">
          <div className="contact-heading">
            <span className="eyebrow">HUBUNGI KAMI</span>
            <h2>Kami siap menemani perjalanan Anda</h2>
            <p>Hubungi PO Dewi Permata Pariwisata untuk informasi perjalanan dan layanan pemesanan.</p>
          </div>

          <div className="contact-grid">
            <div className="contact-card">
              <div className="contact-icon">📍</div>
              <h3>Alamat Kami</h3>
              <p>Sindangsari, Pasar Kemis, Tangerang Regency, Banten 15560, Indonesia.</p>
              <a href="https://maps.app.goo.gl/DBQXeVz468AGbLVF6" target="_blank" rel="noreferrer">Lihat Lokasi →</a>
            </div>

            <div className="contact-card">
              <div className="contact-icon">☎️</div>
              <h3>Telepon</h3>
              <p>Hubungi kami untuk mendapatkan informasi lebih lanjut.</p>
              <a href="tel:081297000978">0812-9700-0978 →</a>
            </div>

            <div className="contact-card">
              <div className="contact-icon">🕒</div>
              <h3>Jam Operasional</h3>
              <p>Informasi jam tutup layanan.</p>
              <strong className="contact-hours">Tutup pukul 17.00</strong>
            </div>
          </div>
        </div>
      </section>

      <footer className="site-footer">
        <div className="container footer-content">
          <div className="brand">
            <img src="/images/bus-dwi-permata.jpeg" alt="PO Bus Dwi Permata" className="brand-logo" />
            <div><strong>DWI PERMATA</strong><small>BUS & TRAVEL</small></div>
          </div>
          <p>© 2026 PO Dewi Permata Pariwisata. Selamat menikmati perjalanan Anda.</p>
          <button className="footer-admin" onClick={() => navigate("/admin")}>Admin ↗</button>
        </div>
      </footer>
    </div>
  );
}

function BookingTable({ bookings, money }) {
  return (
    <div className="table-wrap"><table><thead><tr><th>Kode</th><th>Penumpang</th><th>Kursi</th><th>Total</th><th>Status</th></tr></thead><tbody>
      {bookings.map(b => <tr key={b._id}><td><strong>{b.bookingCode}</strong></td><td>{b.passengerName}</td><td>{b.seats?.join(", ")}</td><td>{money(b.totalPrice)}</td><td><span className={`status ${b.status === "CONFIRMED" ? "confirmed" : "cancelled"}`}>{b.status}</span></td></tr>)}
      {!bookings.length && <tr><td colSpan="5" className="empty">Belum ada data pemesanan.</td></tr>}
    </tbody></table></div>
  );
}

export default App;
