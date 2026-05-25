import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import fs from 'fs';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { createServer as createViteServer } from 'vite';
import { User, Ruang, Gedung, Booking, Notification, Role, BookingStatus } from './src/types';

const app = express();
const PORT = 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'unimus-super-secret-key-2026';
const DB_FILE = path.join(process.cwd(), 'db.json');

// --- DATABASE STATE ---
interface DBState {
  users: User[];
  gedungs: Gedung[];
  ruangs: Ruang[];
  bookings: Booking[];
  notifications: Notification[];
}

// Check or pre-seed database
function loadDatabase(): DBState {
  let forceSeed = false;
  if (fs.existsSync(DB_FILE)) {
    try {
      const currentData = JSON.parse(fs.readFileSync(DB_FILE, 'utf-8'));
      if (!currentData.users.some((u: any) => u.email === 'iqbal@unimus.ac.id')) {
        forceSeed = true;
      }
    } catch (e) {
      forceSeed = true;
    }
  } else {
    forceSeed = true;
  }

  if (forceSeed) {
    const salt = bcrypt.genSaltSync(10);
    const passwordHash = bcrypt.hashSync('123', salt);

    const initialUsers: User[] = [
      { id: 1, email: 'taufik@unimus.ac.id', name: 'Taufik Hidayat (Mahasiswa)', role: 'MAHASISWA' },
      { id: 2, email: 'iqbal@unimus.ac.id', name: 'Iqbal Ramadhan (Admin RT - Master Data)', role: 'ADMIN_RT' },
      { id: 3, email: 'rifki@unimus.ac.id', name: 'Rifki Prasetyo (Admin RT - Validasi & Monitor)', role: 'ADMIN_RT' },
      { id: 4, email: 'avril@unimus.ac.id', name: 'Avril Lavigne (Kepala RT - Kelola Laporan)', role: 'KEPALA_RT' },
      { id: 5, email: 'mufti@unimus.ac.id', name: 'Mufti Anam (Kepala RT - Dashboard Stats)', role: 'KEPALA_RT' },
    ];

    const initialGedungs: Gedung[] = [
      { id: 1, kode: 'REK', nama: 'Gedung Rektorat UNIMUS', lokasi: 'Kampus 1, Jl. Kedungmundu' },
      { id: 2, kode: 'KAS', nama: 'Gedung Kasipah UNIMUS', lokasi: 'Kampus 3, Jl. Kasipah' },
      { id: 3, kode: 'KM2', nama: 'Gedung Kedungmundu II (GKB 2)', lokasi: 'Kampus 4, Jl. Kedungmundu' },
      { id: 4, kode: 'RUS110', nama: 'Rusunawa Kampus 110', lokasi: 'Kampus 1, Samping Rektorat' },
      { id: 5, kode: 'WON', nama: 'Gedung Fakultas Kedokteran (Wonodri)', lokasi: 'Kampus Wonodri, Jl. Wonodri Sendang No. 6' },
      { id: 6, kode: 'PDM', nama: 'Gedung PDM / Muhammadiyah', lokasi: 'Kampus 2, Jl. Kedungmundu' },
      { id: 7, kode: 'NRC', nama: 'Nursing Research Center (NRC)', lokasi: 'Kampus 1, Jl. Kedungmundu' },
      { id: 8, kode: 'RUS', nama: 'Asrama Mahasiswa (Rusunawa UNIMUS)', lokasi: 'Kampus 1, Samping Masjid Al-Azhar' }
    ];

    function getGedungId(ket: string): number {
      const k = ket.toLowerCase().trim();
      if (k.includes('rektorat')) return 1;
      if (k.includes('kasipah')) return 2;
      if (k.includes('kedungmundu 2')) return 3;
      if (k.includes('rusunawa 110')) return 4;
      if (k.includes('wonodri')) return 5;
      if (k.includes('gedung pdm') || k.includes('pdm')) return 6;
      if (k.includes('nrc')) return 7;
      if (k.includes('rusunawa')) return 8;
      return 1; // default to Rektorat
    }

    const initialRuangs: Ruang[] = [];
    try {
      const csvPath = path.join(process.cwd(), 'ruang.csv');
      if (fs.existsSync(csvPath)) {
        const csvContent = fs.readFileSync(csvPath, 'utf-8');
        const lines = csvContent.split(/\r?\n/);
        
        for (let i = 1; i < lines.length; i++) {
          const line = lines[i].trim();
          if (!line) continue;
          
          let cleanLine = line;
          if (line.startsWith('"') && line.endsWith('"')) {
            cleanLine = line.substring(1, line.length - 1);
          }
          const parts = cleanLine.split('","');
          if (parts.length >= 10) {
            const id = parseInt(parts[0]);
            const kode = parts[1];
            const lantaiStr = parts[4];
            let lantai = parseInt(lantaiStr);
            if (isNaN(lantai)) {
              lantai = lantaiStr.toLowerCase() === 'g' ? 0 : 1;
            }
            const jenis = parts[5];
            const pengguna = parts[6].trim();
            const luas = parts[7];
            const kapasitas = parseInt(parts[8]) || 30;
            const ket = parts[9];
            
            const gId = getGedungId(ket);
            const nama = `${kode} - ${jenis} (${pengguna || 'Umum'})`;
            const fasilitas = `Luas: ${luas} m², Digunakan untuk: ${pengguna || 'Umum'}`;
            
            initialRuangs.push({
              id,
              kode,
              nama,
              gedungId: gId,
              lantai,
              kapasitas,
              jenis,
              fasilitas
            });
          }
        }
      }
    } catch (err) {
      console.error("Gagal parse ruang.csv", err);
    }

    // Fallback if no csv or parsing failed
    if (initialRuangs.length === 0) {
      initialRuangs.push(
        { id: 101, kode: 'GKB-101', nama: 'Ruang Teori 101', gedungId: 1, lantai: 1, kapasitas: 40, jenis: 'Kelas Teori', fasilitas: 'AC, Proyektor, Papan Tulis' },
        { id: 102, kode: 'GKB-102', nama: 'Ruang Teori 102', gedungId: 1, lantai: 1, kapasitas: 40, jenis: 'Kelas Teori', fasilitas: 'AC, Proyektor, Papan Tulis' }
      );
    }

    const initialBookings: Booking[] = [
      // Pre-seed some mock bookings to populate reports and charts instantly of different statuses
      {
        id: 1,
        userId: 1,
        ruangId: initialRuangs[0]?.id || 1,
        tanggal: new Date().toISOString().substring(0, 10),
        waktuMulai: '08:00',
        waktuSelesai: '10:00',
        keperluan: 'Kuliah Tamu S1 Keperawatan UNIMUS',
        status: 'DISETUJUI',
        createdAt: new Date(Date.now() - 3 * 24 * 3600 * 1000).toISOString()
      },
      {
        id: 2,
        userId: 1,
        ruangId: initialRuangs[5]?.id || 2,
        tanggal: new Date().toISOString().substring(0, 10),
        waktuMulai: '11:00',
        waktuSelesai: '13:00',
        keperluan: 'Rapat Organisasi Mahasiswa BEM FIKKES',
        status: 'MENUNGGU_RT',
        createdAt: new Date().toISOString()
      },
      {
        id: 3,
        userId: 1,
        ruangId: initialRuangs[12]?.id || 3,
        tanggal: new Date(Date.now() + 24 * 3600 * 1000).toISOString().substring(0, 10),
        waktuMulai: '14:00',
        waktuSelesai: '16:00',
        keperluan: 'Ujian Praktikum Klinik Lab Keperawatan',
        status: 'MENUNGGU_KEPALA',
        createdAt: new Date(Date.now() - 12 * 3600 * 1000).toISOString()
      }
    ];
    
    const initialNotifications: Notification[] = [
      {
        id: 1,
        userId: 2,
        bookingId: 2,
        message: 'Mahasiswa Taufik Hidayat mengajukan peminjaman ruang BEM FIKKES.',
        isRead: false,
        createdAt: new Date().toISOString()
      },
      {
        id: 2,
        userId: 1,
        bookingId: 1,
        message: 'Peminjaman ruangan Kuliah Tamu S1 Keperawatan Anda telah disetujui penuh oleh Kepala RT.',
        isRead: false,
        createdAt: new Date().toISOString()
      }
    ];

    const authStore: Record<string, string> = {
      'taufik@unimus.ac.id': passwordHash,
      'iqbal@unimus.ac.id': passwordHash,
      'rifki@unimus.ac.id': passwordHash,
      'avril@unimus.ac.id': passwordHash,
      'mufti@unimus.ac.id': passwordHash,
    };

    const state: DBState & { auth: Record<string, string> } = {
      users: initialUsers,
      gedungs: initialGedungs,
      ruangs: initialRuangs,
      bookings: initialBookings,
      notifications: initialNotifications,
      auth: authStore
    };

    fs.writeFileSync(DB_FILE, JSON.stringify(state, null, 2), 'utf-8');
  }

  return JSON.parse(fs.readFileSync(DB_FILE, 'utf-8')) as DBState;
}

function saveDatabase(state: DBState) {
  const current = JSON.parse(fs.readFileSync(DB_FILE, 'utf-8'));
  const updated = {
    ...current,
    users: state.users,
    gedungs: state.gedungs,
    ruangs: state.ruangs,
    bookings: state.bookings,
    notifications: state.notifications
  };
  fs.writeFileSync(DB_FILE, JSON.stringify(updated, null, 2), 'utf-8');
}

const db = loadDatabase();

// --- BACKEND MIDDLEWARES & HELPERS ---
interface AuthRequest extends Request {
  user?: User;
}

function verifyToken(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token tidak ditemukan atau format salah' });
  }

  const token = authHeader.split(' ')[1];
  if (token === 'guest-token-session') {
    req.user = {
      id: 0,
      email: 'guest@unimus.ac.id',
      name: 'Pengunjung Umum (Guest)',
      role: 'GUEST'
    };
    return next();
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { id: number; email: string; role: Role };
    const user = db.users.find(u => u.id === decoded.id);
    if (!user) {
      return res.status(401).json({ error: 'Pengguna tidak valid' });
    }
    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Sesi kedaluwarsa atau token tidak valid' });
  }
}

function authorize(...roles: Role[]) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Hak akses ditolak' });
    }
    next();
  };
}

// Function to check if a room booking conflicts with existing APPROVED or PENDING bookings
function isRoomAvailable(ruangId: number, tanggal: string, mulai: string, selesai: string): boolean {
  return !db.bookings.some(booking => {
    // only active bookings cause conflicts (ignore rejected ones)
    const isConflictStatus = !['DITOLAK_RT', 'DITOLAK_KEPALA'].includes(booking.status);
    if (!isConflictStatus) return false;

    if (booking.ruangId !== ruangId) return false;
    if (booking.tanggal !== tanggal) return false;

    // Time overlap logic: (MulaiA < SelesaiB) AND (SelesaiA > MulaiB)
    return (mulai < booking.waktuSelesai) && (selesai > booking.waktuMulai);
  });
}

// --- EXPRESS APPLICATION SETUP ---
app.use(express.json());

// --- API ROUTES ---

// Auth Login
app.post('/api/auth/login', (req: Request, res: Response) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email dan password harus diisi' });
  }

  const fileData = JSON.parse(fs.readFileSync(DB_FILE, 'utf-8'));
  const user = db.users.find(u => u.email === email);
  if (!user) {
    return res.status(401).json({ error: 'Email tidak terdaftar' });
  }

  const passwordHash = fileData.auth[email];
  if (!passwordHash || !bcrypt.compareSync(password, passwordHash)) {
    return res.status(401).json({ error: 'Password yang Anda masukkan salah' });
  }

  const token = jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    JWT_SECRET,
    { expiresIn: '30d' }
  );

  res.json({
    token,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role
    }
  });
});

// Auth Get Me
app.get('/api/auth/me', verifyToken, (req: AuthRequest, res: Response) => {
  res.json({ user: req.user });
});

// Update Profile
app.put('/api/auth/profile', verifyToken, (req: AuthRequest, res: Response) => {
  const { name, email } = req.body;
  
  if (req.user!.role === 'GUEST') {
    return res.status(400).json({ error: 'Pengguna Guest tidak dapat menyimpan profil perubahan ke database.' });
  }

  const user = db.users.find(u => u.id === req.user!.id);
  if (!user) {
    return res.status(404).json({ error: 'Registrasi user tidak ditemukan.' });
  }

  if (name) user.name = name;
  if (email) {
    const emailExist = db.users.some(u => u.id !== req.user!.id && u.email.toLowerCase() === email.toLowerCase());
    if (emailExist) {
      return res.status(400).json({ error: 'Email tersebut sudah digunakan oleh akun Civitas UNIMUS lainnya' });
    }
    user.email = email;
  }

  saveDatabase(db);
  res.json({ message: 'Profil Anda berhasil diperbarui', user });
});

// Gedung list
app.get('/api/gedung', verifyToken, (req: AuthRequest, res: Response) => {
  res.json(db.gedungs);
});

// Create Gedung (ADMIN_RT only)
app.post('/api/gedung', verifyToken, authorize('ADMIN_RT'), (req: AuthRequest, res: Response) => {
  const { kode, nama, lokasi } = req.body;
  if (!kode || !nama || !lokasi) {
    return res.status(400).json({ error: 'Kode, Nama, dan Lokasi Gedung wajib diisi' });
  }

  const isExist = db.gedungs.some(g => g.kode.toLowerCase() === kode.toLowerCase());
  if (isExist) {
    return res.status(400).json({ error: `Gedung dengan kode "${kode}" sudah terdaftar` });
  }

  const newGedung = {
    id: db.gedungs.length > 0 ? Math.max(...db.gedungs.map(g => g.id)) + 1 : 1,
    kode,
    nama,
    lokasi
  };

  db.gedungs.push(newGedung);
  saveDatabase(db);
  res.status(201).json(newGedung);
});

// Update Gedung (ADMIN_RT only)
app.put('/api/gedung/:id', verifyToken, authorize('ADMIN_RT'), (req: AuthRequest, res: Response) => {
  const id = parseInt(req.params.id);
  const { kode, nama, lokasi } = req.body;

  const gedung = db.gedungs.find(g => g.id === id);
  if (!gedung) {
    return res.status(404).json({ error: 'Gedung tidak ditemukan' });
  }

  if (kode) gedung.kode = kode;
  if (nama) gedung.nama = nama;
  if (lokasi) gedung.lokasi = lokasi;

  saveDatabase(db);
  res.json(gedung);
});

// Delete Gedung (ADMIN_RT only)
app.delete('/api/gedung/:id', verifyToken, authorize('ADMIN_RT'), (req: AuthRequest, res: Response) => {
  const id = parseInt(req.params.id);

  const index = db.gedungs.findIndex(g => g.id === id);
  if (index === -1) {
    return res.status(404).json({ error: 'Gedung tidak ditemukan' });
  }

  const hasRooms = db.ruangs.some(r => r.gedungId === id);
  if (hasRooms) {
    return res.status(400).json({ error: 'Gedung tidak dapat dihapus karena masih dikaitkan dengan beberapa ruangan' });
  }

  db.gedungs.splice(index, 1);
  saveDatabase(db);
  res.json({ message: 'Gedung berhasil dihapus' });
});

// Ruang list (with filters)
app.get('/api/ruang', verifyToken, (req: AuthRequest, res: Response) => {
  const { gedungId } = req.query;
  let results = db.ruangs.map(r => ({
    ...r,
    gedung: db.gedungs.find(g => g.id === r.gedungId)
  }));

  if (gedungId) {
    results = results.filter(r => r.gedungId === parseInt(gedungId as string));
  }

  res.json(results);
});

// Create Ruang (ADMIN_RT only)
app.post('/api/ruang', verifyToken, authorize('ADMIN_RT'), (req: AuthRequest, res: Response) => {
  const { kode, nama, gedungId, lantai, kapasitas, jenis, fasilitas } = req.body;
  if (!kode || !nama || !gedungId || !lantai || !kapasitas || !jenis) {
    return res.status(400).json({ error: 'Kode, Nama, Gedung, Lantai, Kapasitas, dan Jenis Ruang wajib diisi' });
  }

  const isExist = db.ruangs.some(r => r.kode.toLowerCase() === kode.toLowerCase());
  if (isExist) {
    return res.status(400).json({ error: `Ruangan dengan kode "${kode}" sudah terdaftar` });
  }

  const newRuang = {
    id: db.ruangs.length > 0 ? Math.max(...db.ruangs.map(r => r.id)) + 1 : 1,
    kode,
    nama,
    gedungId: parseInt(gedungId),
    lantai: parseInt(lantai),
    kapasitas: parseInt(kapasitas),
    jenis,
    fasilitas: fasilitas || ''
  };

  db.ruangs.push(newRuang);
  saveDatabase(db);
  res.status(201).json(newRuang);
});

// Update Ruang (ADMIN_RT only)
app.put('/api/ruang/:id', verifyToken, authorize('ADMIN_RT'), (req: AuthRequest, res: Response) => {
  const id = parseInt(req.params.id);
  const { kode, nama, gedungId, lantai, kapasitas, jenis, fasilitas } = req.body;

  const ruang = db.ruangs.find(r => r.id === id);
  if (!ruang) {
    return res.status(404).json({ error: 'Ruangan tidak ditemukan' });
  }

  if (kode) ruang.kode = kode;
  if (nama) ruang.nama = nama;
  if (gedungId) ruang.gedungId = parseInt(gedungId);
  if (lantai !== undefined) ruang.lantai = parseInt(lantai);
  if (kapasitas !== undefined) ruang.kapasitas = parseInt(kapasitas);
  if (jenis) ruang.jenis = jenis;
  if (fasilitas !== undefined) ruang.fasilitas = fasilitas;

  saveDatabase(db);
  res.json(ruang);
});

// Delete Ruang (ADMIN_RT only)
app.delete('/api/ruang/:id', verifyToken, authorize('ADMIN_RT'), (req: AuthRequest, res: Response) => {
  const id = parseInt(req.params.id);

  const index = db.ruangs.findIndex(r => r.id === id);
  if (index === -1) {
    return res.status(404).json({ error: 'Ruangan tidak ditemukan' });
  }

  // Check if room has active approved/pending bookings
  const hasBookings = db.bookings.some(b => b.ruangId === id && ['DISETUJUI', 'MENUNGGU_RT', 'MENUNGGU_KEPALA'].includes(b.status));
  if (hasBookings) {
    return res.status(400).json({ error: 'Ruangan ini memiliki transaksi peminjaman aktif dan tidak dapat dihapus' });
  }

  db.ruangs.splice(index, 1);
  saveDatabase(db);
  res.json({ message: 'Ruangan berhasil dihapus' });
});

// Get Available Rooms for search page with recommendations
app.get('/api/ruang/available', verifyToken, (req: AuthRequest, res: Response) => {
  const { tanggal, waktuMulai, waktuSelesai, kapasitas, gedungId } = req.query;

  if (!tanggal || !waktuMulai || !waktuSelesai) {
    return res.status(400).json({ error: 'Parameter tanggal, waktuMulai, dan waktuSelesai wajib diisi' });
  }

  let filteredRooms = db.ruangs.map(r => ({
    ...r,
    gedung: db.gedungs.find(g => g.id === r.gedungId)
  }));

  // Filter capacity
  if (kapasitas) {
    filteredRooms = filteredRooms.filter(r => r.kapasitas >= parseInt(kapasitas as string));
  }

  // Filter gedung
  if (gedungId) {
    filteredRooms = filteredRooms.filter(r => r.gedungId === parseInt(gedungId as string));
  }

  // Filter availability
  const availableRooms = filteredRooms.filter(r =>
    isRoomAvailable(r.id, tanggal as string, waktuMulai as string, waktuSelesai as string)
  );

  res.json(availableRooms);
});

// Create Booking (Mahasiswa only)
app.post('/api/booking', verifyToken, authorize('MAHASISWA'), (req: AuthRequest, res: Response) => {
  const { ruangId, tanggal, waktuMulai, waktuSelesai, keperluan } = req.body;
  if (!ruangId || !tanggal || !waktuMulai || !waktuSelesai || !keperluan) {
    return res.status(400).json({ error: 'Semua kolom formulir peminjaman wajib diisi' });
  }

  const parsedRuangId = parseInt(ruangId);
  const targetRoom = db.ruangs.find(r => r.id === parsedRuangId);
  if (!targetRoom) {
    return res.status(404).json({ error: 'Ruangan tidak ditemukan' });
  }

  // Check collision
  const isAvailable = isRoomAvailable(parsedRuangId, tanggal, waktuMulai, waktuSelesai);
  if (!isAvailable) {
    // ⚠️ Room is busy! Let's find alternatives in the SAME building with CAPITAL >= targetRoom.kapasitas
    const alternatives = db.ruangs.filter(r =>
      r.id !== parsedRuangId &&
      r.gedungId === targetRoom.gedungId &&
      r.kapasitas >= targetRoom.kapasitas &&
      isRoomAvailable(r.id, tanggal, waktuMulai, waktuSelesai)
    );

    if (alternatives.length > 0) {
      // Find the smallest matching room (closest capacity)
      const sortedAlt = alternatives.sort((a, b) => a.kapasitas - b.kapasitas);
      const chosenAlt = sortedAlt[0];
      const altGedung = db.gedungs.find(g => g.id === chosenAlt.gedungId);

      return res.status(409).json({
        error: 'Ruang yang dipilih sudah dipesan untuk slot waktu tersebut.',
        alternatif: {
          ...chosenAlt,
          gedung: altGedung
        }
      });
    }

    return res.status(409).json({
      error: 'Ruang tidak tersedia dan tidak ada alternatif ruangan kosong lainnya di gedung yang sama.'
    });
  }

  // Save Booking
  const newBooking: Booking = {
    id: db.bookings.length > 0 ? Math.max(...db.bookings.map(b => b.id)) + 1 : 1,
    userId: req.user!.id,
    ruangId: parsedRuangId,
    tanggal,
    waktuMulai,
    waktuSelesai,
    keperluan,
    status: 'MENUNGGU_RT',
    createdAt: new Date().toISOString()
  };

  db.bookings.push(newBooking);
  saveDatabase(db);

  // Notify Admin RT
  const adminRTUsers = db.users.filter(u => u.role === 'ADMIN_RT');
  adminRTUsers.forEach(admin => {
    const newNotif: Notification = {
      id: db.notifications.length > 0 ? Math.max(...db.notifications.map(n => n.id)) + 1 : 1,
      userId: admin.id,
      bookingId: newBooking.id,
      message: `Mahasiswa ${req.user!.name} mengajukan peminjaman ruang ${targetRoom.nama} untuk keperluan ${keperluan}.`,
      isRead: false,
      createdAt: new Date().toISOString()
    };
    db.notifications.push(newNotif);
  });
  saveDatabase(db);

  res.status(201).json({
    message: 'Booking berhasil diajukan! Menunggu verifikasi tingkat 1 dari Admin RT.',
    booking: newBooking
  });
});

// Validate Booking (Admin RT & Kepala RT)
app.put('/api/booking/:id/validate', verifyToken, authorize('ADMIN_RT', 'KEPALA_RT'), (req: AuthRequest, res: Response) => {
  const id = parseInt(req.params.id);
  const { action, alasan } = req.body; // action: 'setuju' | 'tolak', alasan: string
  
  if (!['setuju', 'tolak'].includes(action)) {
    return res.status(400).json({ error: 'Action harus bernilai "setuju" atau "tolak"' });
  }

  const booking = db.bookings.find(b => b.id === id);
  if (!booking) {
    return res.status(404).json({ error: 'Pengajuan peminjaman tidak ditemukan' });
  }

  const userRole = req.user!.role;
  const currentStatus = booking.status;

  if (action === 'tolak') {
    if (!alasan) {
      return res.status(400).json({ error: 'Alasan penolakan harus diisi' });
    }
    booking.status = userRole === 'ADMIN_RT' ? 'DITOLAK_RT' : 'DITOLAK_KEPALA';
    booking.catatanPenolakan = alasan;

    // Notify student
    db.notifications.push({
      id: db.notifications.length > 0 ? Math.max(...db.notifications.map(n => n.id)) + 1 : 1,
      userId: booking.userId,
      bookingId: booking.id,
      message: `Peminjaman ruangan Anda telah DITOLAK oleh ${req.user!.name}. Alasan: "${alasan}"`,
      isRead: false,
      createdAt: new Date().toISOString()
    });
  } else {
    // action === 'setuju'
    if (userRole === 'ADMIN_RT') {
      if (currentStatus !== 'MENUNGGU_RT') {
        return res.status(400).json({ error: 'Status pengajuan tidak sesuai untuk validasi tingkat 1' });
      }
      booking.status = 'MENUNGGU_KEPALA';

      // Notify Kepala RT (Siprus)
      const kepalaRTUsers = db.users.filter(u => u.role === 'KEPALA_RT');
      kepalaRTUsers.forEach(kepala => {
        db.notifications.push({
          id: db.notifications.length > 0 ? Math.max(...db.notifications.map(n => n.id)) + 1 : 1,
          userId: kepala.id,
          bookingId: booking.id,
          message: `Booking pending: Validasi tingkat 2 diperlukan dari Kepala RT untuk ruang ${db.ruangs.find(r => r.id === booking.ruangId)?.nama}.`,
          isRead: false,
          createdAt: new Date().toISOString()
        });
      });
    } else if (userRole === 'KEPALA_RT') {
      if (currentStatus !== 'MENUNGGU_KEPALA') {
        return res.status(400).json({ error: 'Status pengajuan tidak sesuai untuk validasi tingkat 2' });
      }
      booking.status = 'DISETUJUI';

      // Notify student
      db.notifications.push({
        id: db.notifications.length > 0 ? Math.max(...db.notifications.map(n => n.id)) + 1 : 1,
        userId: booking.userId,
        bookingId: booking.id,
        message: `Peminjaman ruangan Anda telah DISETUJUI secara penuh oleh Kepala RT (${req.user!.name}).`,
        isRead: false,
        createdAt: new Date().toISOString()
      });
    }
  }

  saveDatabase(db);
  res.json({ message: 'Validasi berhasil disimpan!', booking });
});

// Peralihan Ruang (Relocate/Transfer Booking to Another Room)
app.put('/api/booking/:id/transfer', verifyToken, authorize('ADMIN_RT', 'KEPALA_RT'), (req: AuthRequest, res: Response) => {
  const id = parseInt(req.params.id);
  const { newRuangId, alasan } = req.body;

  if (!newRuangId) {
    return res.status(400).json({ error: 'Ruangan tujuan peralihan wajib dipilih' });
  }

  const booking = db.bookings.find(b => b.id === id);
  if (!booking) {
    return res.status(404).json({ error: 'Pengajuan peminjaman tidak ditemukan' });
  }

  const oldRoom = db.ruangs.find(r => r.id === booking.ruangId);
  const newRoom = db.ruangs.find(r => r.id === parseInt(newRuangId));
  if (!newRoom) {
    return res.status(404).json({ error: 'Ruangan tujuan peralihan tidak terdaftar' });
  }

  // Check if new room is available for that slot
  const isAvailable = isRoomAvailable(newRoom.id, booking.tanggal, booking.waktuMulai, booking.waktuSelesai);
  if (!isAvailable) {
    return res.status(400).json({ error: `Gagal! Ruangan "${newRoom.nama}" sudah berisi kegiatan lain pada slot waktu tersebut.` });
  }

  // Save the old room name in the transfer notes
  const explanation = alasan || 'Dialihkan otomatis oleh Biro RT karena kepentingan agenda Universitas Muhammadiyah Semarang';
  booking.ruangId = newRoom.id;
  booking.catatanPeralihan = explanation;

  // Add a specific notification to the student
  db.notifications.push({
    id: db.notifications.length > 0 ? Math.max(...db.notifications.map(n => n.id)) + 1 : 1,
    userId: booking.userId,
    bookingId: booking.id,
    message: `🔄 PERALIHAN RUANG: Peminjaman #${booking.id} (${booking.keperluan}) dialihkan dari "${oldRoom?.nama}" ke "${newRoom.nama}". Alasan: ${explanation}`,
    isRead: false,
    createdAt: new Date().toISOString()
  });

  saveDatabase(db);
  res.json({
    message: `Berhasil melakukan peralihan ruangan ke ${newRoom.nama}!`,
    booking,
    oldRoomName: oldRoom?.nama,
    newRoomName: newRoom.nama
  });
});

// Get User's own bookings
app.get('/api/booking/user', verifyToken, (req: AuthRequest, res: Response) => {
  const userBookings = db.bookings
    .filter(b => b.userId === req.user!.id)
    .map(b => {
      const room = db.ruangs.find(r => r.id === b.ruangId);
      const roomWithGedung = room ? {
        ...room,
        gedung: db.gedungs.find(g => g.id === room.gedungId)
      } : undefined;
      return {
        ...b,
        ruang: roomWithGedung
      };
    })
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  res.json(userBookings);
});

// Get all bookings (Admin RT & Kepala RT layout view list)
app.get('/api/booking/all', verifyToken, authorize('ADMIN_RT', 'KEPALA_RT'), (req: AuthRequest, res: Response) => {
  const { status } = req.query;
  let list = db.bookings;

  if (status) {
    list = list.filter(b => b.status === status);
  }

  const result = list.map(b => {
    const requester = db.users.find(u => u.id === b.userId);
    const room = db.ruangs.find(r => r.id === b.ruangId);
    const roomWithGedung = room ? {
      ...room,
      gedung: db.gedungs.find(g => g.id === room.gedungId)
    } : undefined;

    return {
      ...b,
      user: requester ? { id: requester.id, email: requester.email, name: requester.name, role: requester.role } : undefined,
      ruang: roomWithGedung
    };
  }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  res.json(result);
});

// Get user notifications
app.get('/api/notifications', verifyToken, (req: AuthRequest, res: Response) => {
  const list = db.notifications
    .filter(n => n.userId === req.user!.id)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  res.json(list);
});

// Mark notification as read
patchAsync('/api/notifications/:id/read');
function patchAsync(pathStr: string) {
  app.patch(pathStr, verifyToken, (req: AuthRequest, res: Response) => {
    const id = parseInt(req.params.id);
    const notif = db.notifications.find(n => n.id === id && n.userId === req.user!.id);
    
    if (notif) {
      notif.isRead = true;
      saveDatabase(db);
    }
    res.json({ success: true });
  });
}

// --- VITE DEV OR PROD RUN ---
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`UniRoom Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
