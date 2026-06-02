import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../services/api';
import { CalendarRange, ClipboardCheck, Clock, FileSpreadsheet, Plus, Flame } from 'lucide-react';
import { motion } from 'motion/react';

export default function Dashboard({
  onNavigateTo,
}: {
  onNavigateTo: (page: string) => void;
}) {
  const { user } = useAuth();
  const [stats, setStats] = useState({ total: 0, pending: 0, approved: 0, rejected: 0 });
  const [popularRooms, setPopularRooms] = useState<any[]>([]);
  const [buildingCounts, setBuildingCounts] = useState<any[]>([]);
  const [recentBookings, setRecentBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Amankan dan standarkan format Role pengguna
  const safeRole = (user?.role || '').toString().toUpperCase().trim();
  const isAdminOrKepala = safeRole === 'ADMIN_RT' || safeRole === 'KEPALA_RT';

  const fetchStats = async () => {
    try {
      setLoading(true);
      
      if (!user) return;

      // Jika pengguna adalah GUEST, kembalikan data kosong agar tidak terjadi error 401 Unauthorized
      if (safeRole === 'GUEST') {
        setStats({ total: 0, pending: 0, approved: 0, rejected: 0 });
        setRecentBookings([]);
        setPopularRooms([]);
        setBuildingCounts([]);
        setLoading(false);
        return;
      }

      let allBookings: any[] = [];
      
      // Menggunakan safeRole untuk memastikan endpoint yang dipanggil 100% benar
      if (isAdminOrKepala) {
        allBookings = await api.get('/booking/all');
      } else {
        allBookings = await api.get('/booking/user');
      }

      if (!Array.isArray(allBookings)) {
        allBookings = [];
      }

      const total = allBookings.length;
      const pending = allBookings.filter((b: any) => b.status.includes('MENUNGGU')).length;
      const approved = allBookings.filter((b: any) => b.status === 'DISETUJUI').length;
      const rejected = allBookings.filter((b: any) => b.status.includes('DITOLAK')).length;

      setStats({ total, pending, approved, rejected });

      setRecentBookings(allBookings.slice(0, 4));

      const roomCounts: Record<number, { roomName: string; count: number; code: string }> = {};
      allBookings.forEach((b: any) => {
        if (b.ruang) {
          if (!roomCounts[b.ruangId]) {
            roomCounts[b.ruangId] = {
              roomName: b.ruang.nama,
              code: b.ruang.kode,
              count: 0
            };
          }
          roomCounts[b.ruangId].count++;
        }
      });

      const sortedRooms = Object.values(roomCounts)
        .sort((a, b) => b.count - a.count)
        .slice(0, 4);
      setPopularRooms(sortedRooms);

      const bldgCounts: Record<string, { name: string; count: number }> = {};
      allBookings.forEach((b: any) => {
        const buildName = b.ruang?.gedung?.nama || 'Rektorat';
        if (!bldgCounts[buildName]) {
          bldgCounts[buildName] = { name: buildName, count: 0 };
        }
        bldgCounts[buildName].count++;
      });
      setBuildingCounts(Object.values(bldgCounts));

    } catch (err: any) {
      console.error('Failed to load dashboard statistics', err);
      if (err.message?.includes('401') || err.message?.includes('Sesi')) {
        console.warn('Sesi tidak valid terdeteksi di Dashboard, API menolak akses.');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, [user]);

  const currentHour = new Date().getHours();
  let greetingMsg = 'Selamat Pagi';
  if (currentHour >= 11 && currentHour < 15) greetingMsg = 'Selamat Siang';
  else if (currentHour >= 15 && currentHour < 19) greetingMsg = 'Selamat Sore';
  else if (currentHour >= 19 || currentHour < 5) greetingMsg = 'Selamat Malam';

  return (
    <motion.div 
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: 'easeOut' }}
      className="space-y-6 max-w-5xl mx-auto" 
      id="dashboard-wrapper"
    >
      <div className="bg-gradient-to-r from-blue-700 via-indigo-600 to-indigo-800 text-white rounded-2xl p-6 shadow-xl relative overflow-hidden" id="dashboard-banner">
        <div className="absolute right-0 bottom-0 translate-y-1/3 translate-x-10 opacity-10">
          <CalendarRange className="w-96 h-96" />
        </div>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-2">
            <span className="inline-block py-1 px-3 bg-white/10 rounded-full text-xs font-semibold backdrop-blur-md text-yellow-300 tracking-wider">
              {safeRole === 'MAHASISWA' ? 'MAHASISWA WORKSPACE' 
                : safeRole === 'ADMIN_RT' ? 'ADMINISTRASI RT WORKSPACE' 
                : safeRole === 'KEPALA_RT' ? 'SIPRUS KEPALA RT WORKSPACE' 
                : 'GUEST WORKSPACE'}
            </span>
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight">
              {greetingMsg}, {user?.name || 'Tamu'}!
            </h2>
            <p className="text-sm text-indigo-100 max-w-xl">
              {safeRole === 'MAHASISWA' || safeRole === 'GUEST'
                ? 'Selamat datang di portal UniRoom. Cari dan ajukan izin peminjaman ruangan perkuliahan, laboratorium, atau aula secara instan di sini.'
                : 'Selamat datang di portal validasi Siprus. Silakan verifikasi, koreksi, dan koordinasikan jadwal peminjaman ruang perkuliahan untuk menghindari konflik jadwal.'}
            </p>
          </div>
          {(safeRole === 'MAHASISWA' || safeRole === 'GUEST') && (
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => onNavigateTo('cari')}
              className="py-3 px-5 bg-yellow-400 hover:bg-yellow-300 active:bg-yellow-500 text-slate-900 font-bold text-sm rounded-xl transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer border-none"
            >
              <Plus className="w-4 h-4 text-slate-900" />
              Pinjam Ruangan
            </motion.button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6" id="dashboard-stats-grid">
        <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm flex items-center gap-4 hover:shadow-md transition-shadow">
          <div className="p-3.5 bg-blue-50 text-blue-600 rounded-xl">
            <FileSpreadsheet className="w-6 h-6" />
          </div>
          <div>
            <span className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Peminjaman</span>
            {loading ? (
              <span className="block h-7 w-12 bg-slate-100 animate-pulse rounded mt-1"></span>
            ) : (
              <span className="text-3xl font-bold text-slate-800">{stats.total}</span>
            )}
            <span className="text-[10px] text-slate-500 block mt-0.5">Kumulatif seluruh riwayat</span>
          </div>
        </div>

        <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm flex items-center gap-4 hover:shadow-md transition-shadow">
          <div className="p-3.5 bg-amber-50 text-amber-600 rounded-xl">
            <Clock className="w-6 h-6 animate-spin-slow" />
          </div>
          <div>
            <span className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">
              {safeRole === 'MAHASISWA' ? 'Menunggu Validasi' : 'Perlu Validasi Anda'}
            </span>
            {loading ? (
              <span className="block h-7 w-12 bg-slate-100 animate-pulse rounded mt-1"></span>
            ) : (
              <span className={`text-3xl font-bold ${stats.pending > 0 ? 'text-amber-500' : 'text-slate-800'}`}>
                {stats.pending}
              </span>
            )}
            <span className="text-[10px] text-slate-500 block mt-0.5">
              {safeRole === 'MAHASISWA' ? 'Sedang ditinjau petugas' : 'Perlu tindakan verifikasi segera'}
            </span>
          </div>
        </div>

        <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm flex items-center gap-4 hover:shadow-md transition-shadow">
          <div className="p-3.5 bg-emerald-50 text-emerald-600 rounded-xl">
            <ClipboardCheck className="w-6 h-6" />
          </div>
          <div>
            <span className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">Izin Disetujui</span>
            {loading ? (
              <span className="block h-7 w-12 bg-slate-100 animate-pulse rounded mt-1"></span>
            ) : (
              <span className="text-3xl font-bold text-emerald-600">{stats.approved}</span>
            )}
            <span className="text-[10px] text-slate-500 block mt-0.5">Selesai terverifikasi penuh</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6" id="mufti-analytics">
        <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm lg:col-span-2 space-y-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <span className="h-2.5 w-2.5 bg-indigo-600 rounded-full inline-block"></span>
              Metrik Jumlah Booking per Gedung Unimus
            </h3>
            <p className="text-[11px] text-slate-400">Distribusi pemanfaatan ruang prasarana berdasarkan gedung terdata.</p>
          </div>

          {loading ? (
            <div className="h-44 flex items-center justify-center bg-slate-50 rounded-xl">
              <div className="animate-pulse text-xs text-slate-400">Menghitung statistik sebaran...</div>
            </div>
          ) : buildingCounts.length === 0 ? (
            <div className="h-44 flex items-center justify-center bg-slate-50 rounded-xl text-xs text-slate-400 italic">
              Belum ada riwayat booking yang disetujui/masuk.
            </div>
          ) : (
            <div className="space-y-3.5 pt-2">
              {buildingCounts.map((b, i) => {
                const maxCount = Math.max(...buildingCounts.map(bc => bc.count)) || 1;
                const percentage = Math.round((b.count / maxCount) * 100);
                const colors = ['bg-indigo-600', 'bg-emerald-500', 'bg-blue-500', 'bg-amber-500', 'bg-pink-500'];
                const bColor = colors[i % colors.length];

                return (
                  <div key={b.name} className="space-y-1">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-bold text-slate-700 truncate max-w-[240px] md:max-w-md block">{b.name}</span>
                      <span className="font-mono font-bold text-slate-900">{b.count} Reservasi</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden flex">
                      <div 
                        className={`h-full ${bColor} rounded-full transition-all duration-1000`} 
                        style={{ width: `${percentage}%` }}
                      ></div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div className="pt-3 border-t border-slate-100 grid grid-cols-3 gap-2 text-center text-[10px]">
            <div className="p-2 bg-emerald-50 rounded-lg">
              <span className="block font-sans text-emerald-800 font-bold">{stats.approved}</span>
              <span className="text-slate-500 uppercase tracking-widest font-mono">Disetujui</span>
            </div>
            <div className="p-2 bg-amber-50 rounded-lg">
              <span className="block font-sans text-amber-800 font-bold">{stats.pending}</span>
              <span className="text-slate-500 uppercase tracking-widest font-mono">Pending</span>
            </div>
            <div className="p-2 bg-rose-50 rounded-lg">
              <span className="block font-sans text-rose-800 font-bold">{stats.rejected}</span>
              <span className="text-slate-500 uppercase tracking-widest font-mono">Ditolak</span>
            </div>
          </div>
        </div>

        <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm space-y-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900 tracking-tight flex items-center gap-1.5">
              <Flame className="w-4 h-4 text-orange-500" />
              Ruang Terpopuler UNIMUS
            </h3>
            <p className="text-[11px] text-slate-400">Ruangan kelas / lab yang paling sering diajukan.</p>
          </div>

          {loading ? (
            <div className="space-y-4">
              <div className="h-5 bg-slate-100 animate-pulse rounded"></div>
              <div className="h-5 bg-slate-100 animate-pulse rounded"></div>
            </div>
          ) : popularRooms.length === 0 ? (
            <div className="h-36 flex items-center justify-center bg-slate-50 rounded-xl text-xs text-slate-400 italic">
              Belum ada data peminjaman.
            </div>
          ) : (
            <div className="space-y-3">
              {popularRooms.map((r, idx) => (
                <div key={r.code} className="flex items-center justify-between p-2.5 rounded-xl border border-slate-100 hover:bg-slate-50/50 transition-colors">
                  <div className="flex items-center gap-2.5 overflow-hidden">
                    <span className="h-5 w-5 rounded-full bg-indigo-50 text-indigo-700 font-mono font-bold text-[10px] flex items-center justify-center shrink-0">
                      {idx + 1}
                    </span>
                    <div className="overflow-hidden">
                      <span className="font-bold text-xs text-slate-800 block truncate leading-tight">{r.code}</span>
                      <span className="text-[10px] text-slate-400 block truncate">{r.roomName}</span>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 bg-indigo-100 text-indigo-800 text-[9px] font-extrabold rounded-lg shrink-0">
                    {r.count}x Dipinjam
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm space-y-4" id="recent-activity-feed">
        <div className="flex justify-between items-center pb-2 border-b border-slate-100">
          <h3 className="text-sm font-bold text-slate-900 tracking-tight">
            ⚡ Transaksi Reservasi Terbaru
          </h3>
          <span className="text-[10px] text-slate-400 font-mono">DIPERBARUI LIVE</span>
        </div>

        {loading ? (
          <div className="space-y-2">
            <div className="h-10 bg-slate-50 animate-pulse rounded-lg"></div>
            <div className="h-10 bg-slate-50 animate-pulse rounded-lg"></div>
          </div>
        ) : recentBookings.length === 0 ? (
          <p className="text-slate-400 text-xs italic text-center py-6">Belum ada pengajuan izin peminjaman ruangan.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {recentBookings.map((b) => (
              <div key={b.id} className="p-3 border border-slate-100 rounded-xl flex items-start justify-between gap-3 bg-slate-50/30">
                <div className="space-y-1 overflow-hidden text-xs">
                  <div className="flex items-center gap-1.5 font-bold text-slate-800">
                    <span className="px-1.5 py-0.5 bg-slate-100 font-mono text-[9px] text-slate-700 rounded block">
                      {b.ruang?.kode || 'Room'}
                    </span>
                    <span className="truncate block leading-tight">{b.ruang?.nama || 'Nama Ruang'}</span>
                  </div>
                  <p className="text-[10px] text-slate-500 max-w-[280px] truncate">
                     Pemohon: <strong>{b.user?.name || 'Mahasiswa'}</strong> • "{b.keperluan}"
                  </p>
                  <p className="text-[9px] text-slate-400 font-mono">
                    📆 {b.tanggal} | ⏰ {b.waktuMulai} - {b.waktuSelesai} WIB
                  </p>
                </div>
                
                <div className="shrink-0 text-right">
                  {b.status === 'DISETUJUI' ? (
                    <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 text-[8px] font-extrabold rounded-lg">DISETUJUI</span>
                  ) : b.status.includes('MENUNGGU') ? (
                    <span className="px-2 py-0.5 bg-amber-50 text-amber-700 text-[8px] font-extrabold rounded-lg animate-pulse">PENDING</span>
                  ) : (
                    <span className="px-2 py-0.5 bg-rose-50 text-rose-700 text-[8px] font-extrabold rounded-lg">DITOLAK</span>
                  )}
                  <span className="text-[8px] text-slate-400 block mt-1 font-mono">ID: #{b.id}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}