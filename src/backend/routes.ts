import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from './db';
import { verifyToken, authorize, AuthRequest } from './middleware';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'unimus-super-secret-key-2026';

// --- FUNGSI HELPER ---
async function isRoomAvailable(ruangId: number, tanggal: string, mulai: string, selesai: string): Promise<boolean> {
  const conflictingBookings = await prisma.booking.findMany({
    where: { ruangId, tanggal, status: { notIn: ['DITOLAK_RT', 'DITOLAK_KEPALA'] } }
  });
  return !conflictingBookings.some(b => mulai < b.waktuSelesai && selesai > b.waktuMulai);
}

// ==========================================
// 1. AUTHENTICATION
// ==========================================
router.post('/auth/login', async (req: Request, res: Response): Promise<any> => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email dan password harus diisi' });

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !bcrypt.compareSync(password, user.password)) {
      return res.status(401).json({ error: 'Email atau Password salah' });
    }
    const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '30d' });
    res.json({ token, user: { id: user.id, email: user.email, name: user.name, role: user.role } });
  } catch (error) {
    res.status(500).json({ error: 'Terjadi kesalahan pada server saat login' });
  }
});

router.get('/auth/me', verifyToken, (req: AuthRequest, res: Response) => res.json({ user: req.user }));

// ==========================================
// 2. GEDUNG
// ==========================================
router.get('/gedung', verifyToken, async (req, res) => res.json(await prisma.gedung.findMany()));
router.post('/gedung', verifyToken, authorize('ADMIN_RT'), async (req, res) => {
  try { res.status(201).json(await prisma.gedung.create({ data: req.body })); } 
  catch (error) { res.status(400).json({ error: 'Kode gedung mungkin sudah terdaftar' }); }
});
router.put('/gedung/:id', verifyToken, authorize('ADMIN_RT'), async (req, res) => {
  try { res.json({ message: 'Diperbarui', gedung: await prisma.gedung.update({ where: { id: parseInt(req.params.id) }, data: { kode: req.body.kode, nama: req.body.nama, lokasi: req.body.lokasi } }) }); }
  catch (error) { res.status(400).json({ error: 'Gagal mengupdate gedung.' }); }
});
router.delete('/gedung/:id', verifyToken, authorize('ADMIN_RT'), async (req, res) => {
  try { await prisma.gedung.delete({ where: { id: parseInt(req.params.id) } }); res.json({ message: 'Gedung dihapus' }); } 
  catch (error) { res.status(400).json({ error: 'Gedung tidak dapat dihapus (masih ada ruangan).' }); }
});

// ==========================================
// 3. RUANG
// ==========================================
router.get('/ruang', verifyToken, async (req, res) => {
  const filter = req.query.gedungId ? { gedungId: parseInt(req.query.gedungId as string) } : {};
  res.json(await prisma.ruang.findMany({ where: filter, include: { gedung: true } }));
});
router.post('/ruang', verifyToken, authorize('ADMIN_RT'), async (req, res) => {
  try { res.status(201).json(await prisma.ruang.create({ data: { ...req.body, gedungId: parseInt(req.body.gedungId), kapasitas: parseInt(req.body.kapasitas), lantai: parseInt(req.body.lantai) } })); } 
  catch (error) { res.status(400).json({ error: 'Gagal membuat ruang.' }); }
});
router.put('/ruang/:id', verifyToken, authorize('ADMIN_RT'), async (req, res) => {
  try { res.json({ message: 'Diperbarui', ruang: await prisma.ruang.update({ where: { id: parseInt(req.params.id) }, data: { kode: req.body.kode, nama: req.body.nama, gedungId: parseInt(req.body.gedungId), lantai: parseInt(req.body.lantai), kapasitas: parseInt(req.body.kapasitas), jenis: req.body.jenis, fasilitas: req.body.fasilitas } }) }); }
  catch (error) { res.status(400).json({ error: 'Gagal update ruangan.' }); }
});
router.delete('/ruang/:id', verifyToken, authorize('ADMIN_RT'), async (req, res) => {
  try { await prisma.ruang.delete({ where: { id: parseInt(req.params.id) } }); res.json({ message: 'Ruang dihapus' }); } 
  catch (error) { res.status(400).json({ error: 'Gagal dihapus.' }); }
});
router.get('/ruang/available', verifyToken, async (req: Request, res: Response): Promise<any> => {
  const { tanggal, waktuMulai, waktuSelesai, kapasitas, gedungId } = req.query;
  if (!tanggal || !waktuMulai || !waktuSelesai) return res.status(400).json({ error: 'Parameter tidak lengkap' });
  let whereFilter: any = {};
  if (kapasitas) whereFilter.kapasitas = { gte: parseInt(kapasitas as string) };
  if (gedungId) whereFilter.gedungId = parseInt(gedungId as string);
  const ruangs = await prisma.ruang.findMany({ where: whereFilter, include: { gedung: true } });
  const availableRooms = [];
  for (const r of ruangs) {
    if (await isRoomAvailable(r.id, tanggal as string, waktuMulai as string, waktuSelesai as string)) availableRooms.push(r);
  }
  res.json(availableRooms);
});

// ==========================================
// 4. BOOKING & VALIDASI
// ==========================================
router.post('/booking', verifyToken, authorize('MAHASISWA'), async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    const { ruangId, tanggal, waktuMulai, waktuSelesai, keperluan } = req.body;
    if (!ruangId || !tanggal || !waktuMulai || !waktuSelesai || !keperluan) return res.status(400).json({ error: 'Semua data wajib diisi.' });

    const parsedRuangId = parseInt(ruangId);
    if (!(await isRoomAvailable(parsedRuangId, tanggal, waktuMulai, waktuSelesai))) {
      return res.status(409).json({ error: 'Ruang sudah dipesan pada jadwal tersebut.' });
    }

    // Eksekusi pembuatan booking
    const newBooking = await prisma.booking.create({
      data: { userId: req.user!.id, ruangId: parsedRuangId, tanggal, waktuMulai, waktuSelesai, keperluan, status: 'MENUNGGU_RT' }
    });
    
    const ruang = await prisma.ruang.findUnique({ where: { id: parsedRuangId } });

    // NOTIFIKASI 1 (Untuk Mahasiswa)
    try {
      await prisma.notification.create({
        data: {
          userId: req.user!.id,
          pesan: `Pengajuan peminjaman ruang ${ruang?.nama || 'Kelas'} pada tanggal ${tanggal} berhasil dikirim dan menunggu validasi Admin RT.`
        }
      });
    } catch (e) { console.error("Gagal notif mahasiswa:", e); }

    // NOTIFIKASI 1.5 (Untuk Admin RT) - Diubah menggunakan iterasi yang jauh lebih aman
    try {
      const adminRTs = await prisma.user.findMany({ where: { role: 'ADMIN_RT' } });
      for (const admin of adminRTs) {
        await prisma.notification.create({
          data: {
            userId: admin.id,
            pesan: `[Pengajuan Baru] ${req.user?.name || 'Mahasiswa'} meminjam ${ruang?.nama || 'Kelas'} untuk tanggal ${tanggal}. Silakan divalidasi.`
          }
        });
      }
    } catch (e) { console.error("Gagal notif admin RT:", e); }

    res.status(201).json({ message: 'Booking berhasil diajukan!', booking: newBooking });
  } catch (error: any) {
    console.error("Error saat booking:", error);
    res.status(500).json({ error: 'Terjadi kesalahan internal server.' });
  }
});

router.get('/booking/user', verifyToken, authorize('MAHASISWA'), async (req: AuthRequest, res: Response) => {
  try { res.json(await prisma.booking.findMany({ where: { userId: req.user!.id }, include: { ruang: { include: { gedung: true } } }, orderBy: { createdAt: 'desc' } })); } 
  catch (error) { res.status(500).json({ error: 'Gagal memuat data.' }); }
});

router.get('/booking/all', verifyToken, authorize('ADMIN_RT', 'KEPALA_RT'), async (req: AuthRequest, res: Response) => {
  try {
    const statusFilter = req.query.status ? { status: req.query.status as any } : {};
    res.json(await prisma.booking.findMany({ where: statusFilter, include: { user: { select: { id: true, name: true, email: true, role: true } }, ruang: { include: { gedung: true } } }, orderBy: { createdAt: 'desc' } }));
  } catch (error) { res.status(500).json({ error: 'Gagal memuat data seluruh peminjaman.' }); }
});

router.put('/booking/:id/validate', verifyToken, authorize('ADMIN_RT', 'KEPALA_RT'), async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    const { action, alasan } = req.body; 
    const bookingId = parseInt(req.params.id);
    
    // Perbaikan: Ambil juga relasi user (mahasiswa) untuk mendapatkan namanya
    const booking = await prisma.booking.findUnique({ 
      where: { id: bookingId }, 
      include: { ruang: true, user: true } 
    });
    
    if (!booking) return res.status(404).json({ error: 'Pengajuan tidak ditemukan' });

    let newStatus = booking.status;
    let pesanNotif = '';

    if (action === 'tolak') {
      newStatus = req.user!.role === 'ADMIN_RT' ? 'DITOLAK_RT' : 'DITOLAK_KEPALA';
      pesanNotif = `Pengajuan ruangan ${booking.ruang.nama} untuk tanggal ${booking.tanggal} DITOLAK. Alasan: ${alasan}`;
    } else {
      newStatus = req.user!.role === 'ADMIN_RT' ? 'MENUNGGU_KEPALA' : 'DISETUJUI';
      if (newStatus === 'MENUNGGU_KEPALA') {
        pesanNotif = `Pengajuan ruangan ${booking.ruang.nama} untuk tanggal ${booking.tanggal} DISETUJUI oleh Admin RT (Menunggu validasi akhir Kepala RT).`;
      } else {
        pesanNotif = `SELAMAT! Pengajuan ruangan ${booking.ruang.nama} untuk tanggal ${booking.tanggal} telah DISETUJUI penuh. Anda dapat melihat disposisi.`;
      }
    }

    const updatedBooking = await prisma.booking.update({ 
      where: { id: bookingId }, 
      data: { status: newStatus, catatanPenolakan: alasan || null } 
    });

    // NOTIFIKASI 2 (Kirim ke Mahasiswa peminjam)
    try {
      await prisma.notification.create({
        data: { userId: booking.userId, pesan: pesanNotif }
      });
    } catch (e) { console.error("Gagal kirim notif ke mahasiswa:", e); }

    // NOTIFIKASI 2.5 (Beri tahu Kepala RT secara spesifik)
    if (newStatus === 'MENUNGGU_KEPALA') {
      try {
        const kepalaRTs = await prisma.user.findMany({ where: { role: 'KEPALA_RT' } });
        for (const kepala of kepalaRTs) {
          await prisma.notification.create({
            data: {
              userId: kepala.id,
              pesan: `[Validasi Tahap 2] Pengajuan ruang ${booking.ruang.nama} (${booking.tanggal}) oleh ${booking.user?.name || 'Mahasiswa'} telah disetujui Admin. Menunggu validasi akhir Anda.`
            }
          });
        }
      } catch (e) { console.error("Gagal kirim notif ke kepala RT:", e); }
    }

    res.json({ message: 'Validasi berhasil disimpan!', booking: updatedBooking });
  } catch (error) { 
    console.error("Error saat validasi:", error);
    res.status(500).json({ error: 'Gagal memproses validasi.' }); 
  }
});

router.put('/booking/:id/transfer', verifyToken, authorize('ADMIN_RT', 'KEPALA_RT'), async (req: AuthRequest, res: Response) => {
  try { 
    const bookingId = parseInt(req.params.id);
    const newRuangId = parseInt(req.body.newRuangId);
    
    const bookingLama = await prisma.booking.findUnique({ where: { id: bookingId }, include: { ruang: true } });
    const ruangBaru = await prisma.ruang.findUnique({ where: { id: newRuangId } });

    const updatedBooking = await prisma.booking.update({ 
      where: { id: bookingId }, 
      data: { ruangId: newRuangId, catatanPeralihan: req.body.alasan || 'Dialihkan otomatis' } 
    });

    // NOTIFIKASI 3: Beri tahu mahasiswa jika ruangannya dipindahkan (Peralihan)
    if (bookingLama && ruangBaru) {
      try {
        await prisma.notification.create({
          data: {
            userId: bookingLama.userId,
            pesan: `Perhatian! Jadwal Anda pada ${bookingLama.tanggal} DIALIHKAN dari ruang ${bookingLama.ruang.nama} ke ruang ${ruangBaru.nama}. Alasan: ${req.body.alasan || 'Kebutuhan mendesak'}`
          }
        });
      } catch (e) { console.error("Gagal kirim notif peralihan:", e); }
    }

    res.json({ message: `Berhasil dialihkan!`, booking: updatedBooking });
  } catch (error) { 
    res.status(500).json({ error: 'Gagal mengalihkan ruangan.' }); 
  }
});

// ==========================================
// 5. DASHBOARD STATISTIK
// ==========================================
router.get('/dashboard/stats', verifyToken, async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    const totalGedung = await prisma.gedung.count();
    const totalRuang = await prisma.ruang.count();

    if (req.user!.role === 'MAHASISWA') {
      res.json({ role: 'MAHASISWA', totalGedung, totalRuang, totalPeminjaman: await prisma.booking.count({ where: { userId: req.user!.id } }), disetujui: await prisma.booking.count({ where: { userId: req.user!.id, status: 'DISETUJUI' } }), menunggu: await prisma.booking.count({ where: { userId: req.user!.id, status: { in: ['MENUNGGU_RT', 'MENUNGGU_KEPALA'] } } }) });
    } else {
      res.json({ role: req.user!.role, totalGedung, totalRuang, totalPeminjaman: await prisma.booking.count(), disetujui: await prisma.booking.count({ where: { status: 'DISETUJUI' } }), menungguRT: await prisma.booking.count({ where: { status: 'MENUNGGU_RT' } }), menungguKepala: await prisma.booking.count({ where: { status: 'MENUNGGU_KEPALA' } }) });
    }
  } catch (error) { res.status(500).json({ error: 'Gagal mengambil statistik dashboard.' }); }
});

// ==========================================
// 6. NOTIFICATIONS
// ==========================================
// Ambil semua notifikasi untuk user yang sedang login
router.get('/notifications', verifyToken, async (req: AuthRequest, res: Response) => {
  try {
    const notifs = await prisma.notification.findMany({
      where: { userId: req.user!.id },
      orderBy: { createdAt: 'desc' },
      take: 30 // Ambil 30 notifikasi terbaru
    });
    res.json(notifs);
  } catch (error) {
    res.status(500).json({ error: 'Gagal mengambil notifikasi' });
  }
});

// Tandai 1 notifikasi sudah dibaca
router.put('/notifications/:id/read', verifyToken, async (req: AuthRequest, res: Response) => {
  try {
    await prisma.notification.update({
      where: { id: parseInt(req.params.id) },
      data: { dibaca: true }
    });
    res.json({ message: 'Notifikasi dibaca' });
  } catch (error) {
    res.status(500).json({ error: 'Gagal update notifikasi' });
  }
});

// Tandai SEMUA notifikasi sudah dibaca
router.put('/notifications/read-all', verifyToken, async (req: AuthRequest, res: Response) => {
  try {
    await prisma.notification.updateMany({
      where: { userId: req.user!.id, dibaca: false },
      data: { dibaca: true }
    });
    res.json({ message: 'Semua notifikasi dibaca' });
  } catch (error) {
    res.status(500).json({ error: 'Gagal update notifikasi' });
  }
});

export default router;