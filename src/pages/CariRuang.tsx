import React, { useState, useEffect } from 'react';
import { 
  Calendar, Clock, Users, School, Search, HelpCircle, ArrowRight, 
  CheckCircle2, AlertTriangle, Armchair, Layers, Sparkles, SlidersHorizontal,
  CalendarDays, X, Check, Building, BookmarkCheck, ChevronRight, Info, Layers3, Flame, Bookmark,
  History
} from 'lucide-react';

// --- MOCK DEPENDENCIES & TYPES UNTUK LINGKUNGAN PREVIEW ---
// Catatan: Hapus bagian ini dan gunakan import asli Anda di environment produksi.
interface Gedung {
  id: number;
  kode: string;
  nama: string;
}

interface Ruang {
  id: number;
  kode: string;
  nama: string;
  gedungId: number;
  lantai: number;
  kapasitas: number;
  jenis: string;
  fasilitas?: string;
  gedung?: Gedung;
}

const useAuth = () => {
  return { user: { role: 'MAHASISWA', name: 'Mahasiswa UNIMUS' } };
};

const DUMMY_GEDUNG: Gedung[] = [{ id: 1, kode: 'GKB', nama: 'Gedung Kuliah Bersama' }];
const DUMMY_RUANG: Ruang[] = [
  { id: 1, kode: '1A101', nama: 'Ruang Kelas 1A101', gedungId: 1, lantai: 1, kapasitas: 40, jenis: 'Kelas', fasilitas: 'AC, Proyektor', gedung: DUMMY_GEDUNG[0] },
  { id: 2, kode: '1A102', nama: 'Ruang Kelas 1A102', gedungId: 1, lantai: 1, kapasitas: 30, jenis: 'Kelas', fasilitas: 'AC, Whiteboard', gedung: DUMMY_GEDUNG[0] }
];

const api = {
  get: async (url: string) => {
    if (url.includes('/gedung')) return DUMMY_GEDUNG;
    if (url.includes('/ruang')) return DUMMY_RUANG;
    if (url.includes('/ruang/available')) return DUMMY_RUANG;
    return [];
  },
  post: async (url: string, data: any) => {
    return { success: true };
  }
};
// ---------------------------------------------------------

// Fungsi Helper: Mendapatkan tanggal hari ini sesuai zona waktu lokal
const getLocalDateStr = () => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// Fungsi Helper: Mendapatkan jam:menit saat ini (format 24 jam)
const getCurrentTimeStr = () => {
  const d = new Date();
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
};

export default function CariRuang() {
  const { user } = useAuth();
  
  // Basic states
  const [gedungs, setGedungs] = useState<Gedung[]>([]);
  const [allRuangs, setAllRuangs] = useState<Ruang[]>([]);
  const [ruangList, setRuangList] = useState<Ruang[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  
  // Booking Form Inputs
  const [keperluan, setKeperluan] = useState('');
  const [alternatif, setAlternatif] = useState<any>(null);

  // Tanggal Hari Ini untuk validasi
  const todayStr = getLocalDateStr();

  // Main filters for date and time slot
  const [filters, setFilters] = useState({
    tanggal: todayStr, // Default ke hari ini
    waktuMulai: '08:00',
    waktuSelesai: '10:00',
    kapasitas: '',
    gedungId: '',
  });

  // Active View Tab
  const [activeTab, setActiveTab ] = useState<'list' | 'weekly'>('list');

  // Display size limits
  const [limitAvailable, setLimitAvailable] = useState(6);
  const [limitWeekly, setLimitWeekly] = useState(6);

  // Advanced Client-Side Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLantai, setSelectedLantai] = useState<string>('');
  const [selectedJenis, setSelectedJenis] = useState<string>('');
  const [onlyLargeCapacity, setOnlyLargeCapacity] = useState<boolean>(false);

  // Weekly availability statuses
  const [weeklyDates, setWeeklyDates] = useState<string[]>([]);
  const [weeklyAvailability, setWeeklyAvailability] = useState<{ [dateStr: string]: Ruang[] }>({});
  const [loadingWeekly, setLoadingWeekly] = useState(false);

  // Format date helper for Indonesian locales
  const getFormatIndoDay = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
      return `${days[date.getDay()]}, ${date.getDate()} ${months[date.getMonth()]}`;
    } catch {
      return dateStr;
    }
  };

  // Generate 7-day timeline array whenever filters.tanggal changes
  useEffect(() => {
    const dates = [];
    const baseDate = new Date(filters.tanggal);
    for (let i = 0; i < 7; i++) {
      const d = new Date(baseDate);
      d.setDate(baseDate.getDate() + i);
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      dates.push(`${year}-${month}-${day}`);
    }
    setWeeklyDates(dates);
  }, [filters.tanggal]);

  // Load buildings and initial data
  useEffect(() => {
    async function loadInitialDataset() {
      setLoading(true);
      try {
        const buildingsData: any = await api.get('/gedung');
        setGedungs(Array.isArray(buildingsData) ? buildingsData : []);

        const roomsAll: any = await api.get('/ruang');
        setAllRuangs(Array.isArray(roomsAll) ? roomsAll : []);
      } catch (err) {
        console.error('Failed to load initial dataset', err);
      } finally {
        setLoading(false);
      }
    }
    loadInitialDataset();
  }, []);

  // Fetch 7-day availability concurrently when Tab 2 is active
  useEffect(() => {
    if (activeTab === 'weekly' && weeklyDates.length > 0) {
      const datesToFetch = [...weeklyDates];
      
      const fetchWeekly = async () => {
        setLoadingWeekly(true);
        const map: { [dateStr: string]: Ruang[] } = {};
        
        try {
          await Promise.all(
            datesToFetch.map(async (d) => {
              try {
                const queryParams = new URLSearchParams({
                  tanggal: d,
                  waktuMulai: filters.waktuMulai,
                  waktuSelesai: filters.waktuSelesai,
                  kapasitas: filters.kapasitas,
                  gedungId: filters.gedungId,
                }).toString();
                const res: any = await api.get(`/ruang/available?${queryParams}`);
                map[d] = Array.isArray(res) ? res : [];
              } catch (e) {
                map[d] = [];
              }
            })
          );
          setWeeklyAvailability(map);
        } catch (error) {
          console.error("error fetching weekly", error);
        } finally {
          setLoadingWeekly(false);
        }
      };
      
      fetchWeekly();
    }
  }, [activeTab, weeklyDates, filters.waktuMulai, filters.waktuSelesai, filters.kapasitas, filters.gedungId]);

  // On standard Search Form Submit
  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // VALIDASI 1: Cek Kelengkapan Data
    if (!filters.tanggal || !filters.waktuMulai || !filters.waktuSelesai) {
      setStatusMessage({ type: 'error', text: 'Mohon tentukan tanggal, waktu mulai, dan waktu selesai peminjaman.' });
      return;
    }

    // VALIDASI 2: Tidak boleh pinjam ruang di masa lalu (Mencegah Backdate)
    if (filters.tanggal < todayStr) {
      setStatusMessage({ type: 'error', text: 'Peringatan: Anda tidak dapat memesan ruangan di tanggal yang sudah berlalu.' });
      return;
    }

    // VALIDASI 3: Proteksi Waktu Lewat (Mencegah pesan di jam yang sudah lewat pada hari ini)
    const currentTimeStr = getCurrentTimeStr();
    if (filters.tanggal === todayStr && filters.waktuMulai < currentTimeStr) {
      setStatusMessage({ type: 'error', text: `Validasi Gagal: Jam mulai (${filters.waktuMulai}) sudah terlewat untuk hari ini. Waktu saat ini menunjukkan pukul ${currentTimeStr} WIB.` });
      setRuangList([]); // Kosongkan list karena waktu tidak valid
      setHasSearched(true);
      return;
    }

    // VALIDASI 4: Jam Mulai harus lebih awal dari Jam Selesai
    if (filters.waktuMulai >= filters.waktuSelesai) {
      setStatusMessage({ type: 'error', text: 'Kesalahan Input: Jam selesai harus lebih lambat dari jam mulai peminjaman.' });
      return;
    }

    setLoading(true);
    setStatusMessage(null);
    setAlternatif(null);
    try {
      const queryParams = new URLSearchParams({
        tanggal: filters.tanggal,
        waktuMulai: filters.waktuMulai,
        waktuSelesai: filters.waktuSelesai,
        kapasitas: filters.kapasitas,
        gedungId: filters.gedungId,
      }).toString();

      const res: any = await api.get(`/ruang/available?${queryParams}`);
      setRuangList(Array.isArray(res) ? res : []);
      setHasSearched(true);
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'Gagal mencari ketersediaan ruangan' });
    } finally {
      setLoading(false);
    }
  };

  const fetchAlternativesAttempt = async (ruangId: number) => {
    try {
      let token = localStorage.getItem('token') || '';
      token = token.replace(/['"]+/g, '');
      
      const res = await fetch(`/api/booking`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          ruangId,
          tanggal: filters.tanggal,
          waktuMulai: filters.waktuMulai,
          waktuSelesai: filters.waktuSelesai,
          keperluan: keperluan.trim()
        })
      });

      if (res.status === 409) {
        const body = await res.json().catch(() => ({}));
        if (body.alternatif) {
          setAlternatif(body.alternatif);
        } else {
          setStatusMessage({ type: 'error', text: body.error || 'Ruang sudah penuh dan tidak ada alternatif yang lowong.' });
        }
      } else {
        const body = await res.json().catch(() => ({}));
        setStatusMessage({ type: 'error', text: body.error || 'Maaf, bentrok jadwal terdeteksi.' });
      }
    } catch (e: any) {
      setStatusMessage({ type: 'error', text: e.message || 'Gagal terhubung ke server.' });
    }
  };

  const executePinjam = async (ruangId: number, asAlternative = false) => {
    if (user?.role === 'GUEST') {
      alert('Sesi Anda saat ini adalah Guest (Terbatas). Silakan login dengan akun UNIMUS Anda.');
      return;
    }

    if (filters.tanggal < todayStr) {
      setStatusMessage({ type: 'error', text: 'Validasi Gagal: Anda mencoba memesan ruangan untuk tanggal yang sudah lewat.' });
      return;
    }

    // Proteksi Waktu Lewat saat Tombol Eksekusi Ditekan (Double Check)
    const currentTimeStr = getCurrentTimeStr();
    if (filters.tanggal === todayStr && filters.waktuMulai < currentTimeStr) {
      setStatusMessage({ type: 'error', text: `Validasi Gagal: Jam mulai (${filters.waktuMulai}) sudah terlewat untuk hari ini.` });
      return;
    }

    if (filters.waktuMulai >= filters.waktuSelesai) {
      setStatusMessage({ type: 'error', text: 'Validasi Gagal: Waktu selesai tidak boleh mendahului waktu mulai.' });
      return;
    }

    if (!keperluan.trim()) {
      setStatusMessage({ type: 'error', text: 'Mohon isi detail keperluan acara Anda terlebih dahulu.' });
      const textElement = document.getElementById("input-purpose");
      if (textElement) {
        textElement.focus();
        textElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      return;
    }

    setLoading(true);
    setStatusMessage(null);
    try {
      await api.post('/booking', {
        ruangId,
        tanggal: filters.tanggal,
        waktuMulai: filters.waktuMulai,
        waktuSelesai: filters.waktuSelesai,
        keperluan: keperluan.trim(),
      });

      setStatusMessage({
        type: 'success',
        text: asAlternative
          ? 'Reservasi ruangan alternatif berhasil diajukan! Verifikasi tingkat 1 diteruskan ke Admin RT.'
          : 'Pengajuan peminjaman ruangan berhasil dikirim! Silakan pantau status persetujuan di halaman Riwayat.',
      });
      
      setKeperluan('');
      setAlternatif(null);
      
      const queryParams = new URLSearchParams({
        tanggal: filters.tanggal,
        waktuMulai: filters.waktuMulai,
        waktuSelesai: filters.waktuSelesai,
        kapasitas: filters.kapasitas,
        gedungId: filters.gedungId,
      }).toString();
      
      const refetched: any = await api.get(`/ruang/available?${queryParams}`);
      setRuangList(Array.isArray(refetched) ? refetched : []);

      const topInfo = document.getElementById("cari-status-banner");
      if (topInfo) topInfo.scrollIntoView({ behavior: 'smooth', block: 'center' });
    } catch (err: any) {
      if (err.message && err.message.toLowerCase().includes('dipesan')) {
        fetchAlternativesAttempt(ruangId);
      } else {
        setStatusMessage({ type: 'error', text: err.message || 'Gagal mengajukan peminjaman ruangan.' });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSelectWeeklyCell = (dateStr: string, ruang: Ruang) => {
    if (dateStr < todayStr) {
       setStatusMessage({ type: 'error', text: 'Tidak dapat memilih tanggal di masa lalu.' });
       return;
    }
    
    // Cegah klik otomatis jika jam sudah terlewat di hari ini
    if (dateStr === todayStr && filters.waktuMulai < getCurrentTimeStr()) {
      setStatusMessage({ type: 'error', text: 'Tidak dapat memilih jadwal ini karena jam peminjaman sudah terlewat.' });
      return;
    }

    setFilters(prev => ({ ...prev, tanggal: dateStr }));
    setStatusMessage({
      type: 'success',
      text: `Tanggal ${getFormatIndoDay(dateStr)} dan Ruangan [ ${ruang.kode} ] terpilih! Silakan ketik detail di kolom Keperluan.`
    });

    setTimeout(() => {
      const element = document.getElementById("input-purpose-container") || document.getElementById("filters-card");
      if (element) element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      const txtArea = document.getElementById("input-purpose");
      if (txtArea) txtArea.focus();
    }, 150);

    setActiveTab('list');
  };

  useEffect(() => {
    setLimitAvailable(6);
    setLimitWeekly(6);
  }, [searchQuery, selectedLantai, selectedJenis, onlyLargeCapacity, filters]);

  const safeAllRuangs = Array.isArray(allRuangs) ? allRuangs : [];
  const uniqueJenis = Array.from(new Set(safeAllRuangs.map(r => r?.jenis).filter(Boolean))) as string[];
  const uniqueLantai = (Array.from(new Set(safeAllRuangs.map(r => String(r?.lantai)).filter(Boolean))) as string[]).sort((a: string, b: string) => parseInt(a) - parseInt(b));

  const safeRuangList = Array.isArray(ruangList) ? ruangList : [];
  const filteredAvailableList = safeRuangList.filter(ruang => {
    if (!ruang) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const codeMatch = ruang.kode?.toLowerCase().includes(q) || false;
      const nameMatch = ruang.nama?.toLowerCase().includes(q) || false;
      const jenisMatch = ruang.jenis?.toLowerCase().includes(q) || false;
      const facilitiesMatch = ruang.fasilitas?.toLowerCase().includes(q) || false;
      const buildingName = ruang?.gedung?.nama?.toLowerCase() || '';
      if (!codeMatch && !nameMatch && !jenisMatch && !facilitiesMatch && !buildingName.includes(q)) return false;
    }
    if (selectedLantai && String(ruang.lantai) !== selectedLantai) return false;
    if (selectedJenis && ruang.jenis !== selectedJenis) return false;
    if (onlyLargeCapacity && (ruang.kapasitas || 0) < 30) return false;
    return true;
  });

  const filteredWeeklyRows = safeAllRuangs.filter(ruang => {
    if (!ruang) return false;
    if (filters.gedungId && String(ruang.gedungId) !== filters.gedungId) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const codeMatch = ruang.kode?.toLowerCase().includes(q) || false;
      const nameMatch = ruang.nama?.toLowerCase().includes(q) || false;
      const jenisMatch = ruang.jenis?.toLowerCase().includes(q) || false;
      const facilitiesMatch = ruang.fasilitas?.toLowerCase().includes(q) || false;
      const buildingName = safeAllRuangs.find(r => r?.id === ruang.id)?.gedung?.nama?.toLowerCase() || '';
      if (!codeMatch && !nameMatch && !jenisMatch && !facilitiesMatch && !buildingName.includes(q)) return false;
    }
    if (selectedLantai && String(ruang.lantai) !== selectedLantai) return false;
    if (selectedJenis && ruang.jenis !== selectedJenis) return false;
    if (onlyLargeCapacity && (ruang.kapasitas || 0) < 30) return false;
    return true;
  });

  return (
    <div className="space-y-6 max-w-6xl mx-auto px-1 animate-fade-in" id="cari-ruang-page">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-white border border-slate-200/60 rounded-3xl p-5 shadow-[0_4px_30px_rgba(0,0,0,0.015)]">
        <div>
          <div className="flex items-center gap-2 text-indigo-600 mb-0.5">
            <Sparkles className="w-4.5 h-4.5 text-amber-500 animate-pulse" />
            <span className="text-xs font-bold uppercase tracking-widest font-mono">Real-time Scheduler Engine</span>
          </div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight font-sans">Cari & Cek Ketersediaan Ruangan</h2>
          <p className="text-xs text-slate-500 font-medium font-sans">Mencakup ketersediaan harian dan ketersediaan sepekan terintegrasi.</p>
        </div>

        <div className="flex bg-slate-100 p-1 rounded-2xl w-full lg:w-auto border border-slate-200/30">
          <button
            onClick={() => setActiveTab('list')}
            className={`flex-1 lg:flex-none px-4 py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer border-none ${
              activeTab === 'list' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            Pencarian & Booking
          </button>
          <button
            onClick={() => setActiveTab('weekly')}
            className={`flex-1 lg:flex-none px-4 py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer relative border-none ${
              activeTab === 'weekly' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <CalendarDays className="w-3.5 h-3.5 text-emerald-500" />
            Ketersediaan Sepekan
            {/* Perbaikan posisi titik hijau agar tidak melayang ke luar tombol */}
            <span className="absolute top-1.5 right-1.5 flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
          </button>
        </div>
      </div>

      {statusMessage && (
        <div
          className={`p-4 rounded-2xl border flex gap-3 items-start text-xs animate-fade-in shadow-sm ${
            statusMessage.type === 'success'
              ? 'bg-emerald-50/80 border-emerald-200 text-emerald-800'
              : 'bg-rose-50/80 border-rose-200 text-rose-800'
          }`}
          id="cari-status-banner"
        >
          {statusMessage.type === 'success' ? (
            <CheckCircle2 className="w-4.5 h-4.5 text-emerald-600 flex-shrink-0 mt-0.5 animate-bounce" />
          ) : (
            <AlertTriangle className="w-4.5 h-4.5 text-rose-600 flex-shrink-0 mt-0.5" />
          )}
          <div className="flex-1">
            <span className="font-bold block mb-0.5">
              {statusMessage.type === 'success' ? 'Informasi Berhasil / Terpilih' : 'Pemberitahuan Sistem'}
            </span>
            <span className="leading-relaxed font-semibold">{statusMessage.text}</span>
          </div>
          <button 
            onClick={() => setStatusMessage(null)} 
            className="p-1 hover:bg-black/5 rounded-lg text-slate-400 hover:text-slate-705 cursor-pointer border-none bg-transparent"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      <div className="bg-white border border-slate-200/60 rounded-3xl shadow-[0_4px_30px_rgba(0,0,0,0.015)] overflow-hidden" id="filters-card">
        <div className="p-4 md:p-5 border-b border-slate-100">
          <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 block mb-3 font-mono">
            ⚙️ LANGKAH 1: ATUR JADWAL PENGAJUAN
          </span>
          <form onSubmit={handleSearch} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3">
              <div className="space-y-1.5 lg:col-span-3">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1.5 font-mono">
                  <Calendar className="w-3.5 h-3.5 text-indigo-500" />
                  Tanggal Pemakaian
                </label>
                <input
                  type="date"
                  min={todayStr} 
                  className="w-full p-3 bg-slate-50 border border-slate-200 hover:bg-slate-100/50 rounded-xl text-slate-800 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500/25 font-semibold transition-all focus:bg-white"
                  value={filters.tanggal}
                  onChange={e => {
                    if (e.target.value < todayStr) {
                      setStatusMessage({ type: 'error', text: 'Tanggal tidak boleh di masa lalu.' });
                      return;
                    }
                    setStatusMessage(null);
                    setFilters({ ...filters, tanggal: e.target.value });
                  }}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3 sm:col-span-2 lg:col-span-4 lg:grid-cols-2 lg:contents">
                <div className="space-y-1.5 lg:col-span-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1.5 font-mono">
                    <Clock className="w-3.5 h-3.5 text-indigo-500" />
                    Mulai Jam
                  </label>
                  <input
                    type="time"
                    className="w-full p-3 bg-slate-50 border border-slate-200 hover:bg-slate-100/50 rounded-xl text-slate-800 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500/25 font-semibold transition-all focus:bg-white"
                    value={filters.waktuMulai}
                    onChange={e => {
                      setStatusMessage(null);
                      setFilters({ ...filters, waktuMulai: e.target.value });
                    }}
                    required
                  />
                </div>

                <div className="space-y-1.5 lg:col-span-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1.5 font-mono">
                    <Clock className="w-3.5 h-3.5 text-indigo-500" />
                    Selesai Jam
                  </label>
                  <input
                    type="time"
                    className="w-full p-3 bg-slate-50 border border-slate-200 hover:bg-slate-100/50 rounded-xl text-slate-800 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500/25 font-semibold transition-all focus:bg-white"
                    value={filters.waktuSelesai}
                    onChange={e => {
                      setStatusMessage(null);
                      setFilters({ ...filters, waktuSelesai: e.target.value });
                    }}
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5 sm:col-span-1 lg:col-span-3">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1.5 font-mono">
                  <School className="w-3.5 h-3.5 text-indigo-500" />
                  Target Gedung
                </label>
                <select
                  className="w-full p-3 bg-slate-50 border border-slate-200 hover:bg-slate-100/50 focus:bg-white rounded-xl text-slate-800 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500/25 font-semibold transition-all cursor-pointer"
                  value={filters.gedungId}
                  onChange={e => setFilters({ ...filters, gedungId: e.target.value })}
                >
                  <option value="">Semua Gedung Kampus</option>
                  {gedungs.map(g => <option key={g.id} value={g.id}>{g.nama}</option>)}
                </select>
              </div>

              <div className="flex items-end sm:col-span-1 lg:col-span-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white font-bold text-xs rounded-xl transition-all shadow-md shadow-indigo-100 flex items-center justify-center gap-1.5 h-11 cursor-pointer border-none disabled:opacity-50"
                >
                  <Search className="w-3.5 h-3.5" /> Cari
                </button>
              </div>
            </div>
          </form>
        </div>

        <div className="bg-slate-50/60 p-4 space-y-3 border-t border-slate-100">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-1.5 font-mono">
              <SlidersHorizontal className="w-3.5 h-3.5 text-indigo-500" />
              Saring Hasil Instan (Tanpa Reload)
            </span>
            {(searchQuery || selectedLantai || selectedJenis || onlyLargeCapacity) && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setSelectedLantai('');
                  setSelectedJenis('');
                  setOnlyLargeCapacity(false);
                }}
                className="text-[10px] text-rose-600 hover:text-rose-800 font-bold flex items-center gap-1 cursor-pointer border-none bg-transparent"
              >
                <X className="w-3 h-3" /> Bersihkan
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5">
            <div className="lg:col-span-4 relative">
              <input
                type="text"
                placeholder="Cari kelas, jenis, fasilitas..."
                className="w-full pl-9 pr-3 py-3 bg-white border border-slate-200 focus:border-indigo-500 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500/20 font-semibold"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            </div>

            <div className="lg:col-span-8 flex flex-col sm:flex-row gap-3 sm:items-center overflow-hidden">
              <div className="overflow-x-auto scrollbar-none pb-0.5 flex-1 shrink-0">
                <div className="flex bg-slate-100 p-1 rounded-xl text-[10.5px] font-semibold text-slate-600 min-w-max items-center">
                  <span className="px-2 text-slate-400 font-black text-[9px] uppercase font-mono">Lantai</span>
                  <button onClick={() => setSelectedLantai('')} className={`px-2.5 py-1.5 rounded-lg font-bold transition-all border-none cursor-pointer ${selectedLantai === '' ? 'bg-white text-indigo-600 shadow-xs' : 'hover:bg-white/40 text-slate-500'}`}>Semua</button>
                  {uniqueLantai.map(fl => (
                    <button key={fl} onClick={() => setSelectedLantai(fl)} className={`px-2.5 py-1.5 rounded-lg font-bold transition-all border-none cursor-pointer ${selectedLantai === fl ? 'bg-white text-indigo-600 shadow-xs' : 'hover:bg-white/40 text-slate-500'}`}>Lt {fl}</button>
                  ))}
                </div>
              </div>

              <div className="overflow-x-auto scrollbar-none pb-0.5 flex-1 shrink-0">
                <div className="flex bg-slate-100 p-1 rounded-xl text-[10.5px] font-semibold text-slate-600 min-w-max items-center">
                  <span className="px-2 text-slate-400 font-black text-[9px] uppercase font-mono">Tipe</span>
                  <button onClick={() => setSelectedJenis('')} className={`px-2.5 py-1.5 rounded-lg font-bold transition-all border-none cursor-pointer ${selectedJenis === '' ? 'bg-white text-indigo-600 shadow-xs' : 'hover:bg-white/40 text-slate-500'}`}>Semua Tipe</button>
                  {uniqueJenis.map(t => (
                    <button key={t} onClick={() => setSelectedJenis(t)} className={`px-2.5 py-1.5 rounded-lg font-bold transition-all border-none cursor-pointer ${selectedJenis === t ? 'bg-white text-indigo-600 shadow-xs' : 'hover:bg-white/40 text-slate-500'}`}>{t}</button>
                  ))}
                </div>
              </div>

              <button
                onClick={() => setOnlyLargeCapacity(!onlyLargeCapacity)}
                className={`py-2 px-3.5 rounded-xl border text-[10.5px] font-extrabold transition-all flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap border-none active:scale-95 ${onlyLargeCapacity ? 'bg-amber-500 text-white shadow-xs border-amber-500' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100/50'}`}
              >
                <Flame className={`w-3.5 h-3.5 ${onlyLargeCapacity ? 'text-white' : 'text-amber-500'}`} /> Kapasitas ≥ 30
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white border border-emerald-100 rounded-3xl p-4 md:p-5 shadow-[0_4px_30px_rgba(0,0,0,0.01)]" id="input-purpose-container">
        <label className="text-[10px] font-black text-slate-800 uppercase tracking-widest flex items-center gap-1.5 mb-2.5 font-mono">
          <BookmarkCheck className="w-4.5 h-4.5 text-emerald-600 animate-pulse shrink-0" />
          Detail Peminjaman Ruang (Tulis Keperluan Disini)
        </label>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch lg:items-center font-sans">
          <div className="lg:col-span-9">
            <textarea
              placeholder="Tulis keperluan detil peminjaman ruang di sini..."
              className="w-full p-3.5 bg-slate-50 hover:bg-slate-100/50 focus:bg-white border border-slate-200 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/25 rounded-2xl text-slate-800 text-xs focus:outline-none min-h-[54px] font-semibold leading-relaxed transition-all resize-none"
              rows={1}
              value={keperluan}
              onChange={e => setKeperluan(e.target.value)}
              id="input-purpose"
            />
          </div>
          <div className="lg:col-span-3 flex items-start gap-2.5 text-[10.5px] text-slate-500 leading-relaxed bg-emerald-50/50 p-3.5 rounded-2xl border border-emerald-100/20">
            <Info className="w-4.5 h-4.5 text-emerald-600 flex-shrink-0 mt-0.5" />
            <p className="font-semibold text-slate-600">
              Ketik rincian keperluan terlebih dahulu, kemudian tekan tombol hijau <strong>"Ajukan"</strong>.
            </p>
          </div>
        </div>
      </div>

      {activeTab === 'list' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center bg-slate-100/70 p-3 rounded-2xl border border-slate-200/50 gap-2">
            <h3 className="text-[10px] font-black text-slate-700 uppercase tracking-widest flex items-center gap-2 font-mono">
              <Layers className="w-4 h-4 text-indigo-600" /> RUBAH FILTER / HASIL ({filteredAvailableList.length} Ruang Tersedia)
            </h3>
            <span className="text-[10.5px] text-indigo-700 bg-white border border-slate-200 rounded-xl px-3 py-1.5 font-bold shadow-xs text-center font-sans">
              🗓 {getFormatIndoDay(filters.tanggal)} • {filters.waktuMulai} - {filters.waktuSelesai}
            </span>
          </div>

          {loading ? (
            <div className="text-center py-20 bg-white rounded-3xl border border-slate-200/60 shadow-xs">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-indigo-600 border-t-transparent mb-3.5"></div>
              <p className="text-xs text-slate-500 font-bold font-sans">Memindai ketersediaan...</p>
            </div>
          ) : hasSearched && filteredAvailableList.length === 0 ? (
            <div className="bg-amber-50/40 border border-amber-200 rounded-3xl p-8 md:p-12 text-center max-w-xl mx-auto space-y-3.5 shadow-sm">
              <div className="p-3 bg-amber-100 text-amber-700 rounded-full inline-block animate-pulse">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div className="space-y-1 font-sans">
                <h4 className="font-extrabold text-slate-800 text-sm">Tidak Ada Ruangan yang Sesuai / Jam Terlewat</h4>
                <p className="text-xs text-slate-500 leading-relaxed font-semibold">
                  Semua ruangan dengan kriteria yang Anda cari di jam ini sudah terisi, atau waktu peminjaman untuk hari ini sudah terlewat. Silakan geser jam atau pilih tanggal lain.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredAvailableList.slice(0, limitAvailable).map(ruang => (
                  <div key={ruang.id} className="bg-white border border-slate-200/60 hover:border-indigo-200 rounded-3xl shadow-[0_4px_25px_rgba(0,0,0,0.01)] hover:shadow-md transition-all duration-200 p-5 flex flex-col justify-between group">
                    <div className="space-y-3.5">
                      <div className="flex justify-between items-start gap-2 font-sans">
                        <span className="inline-block py-1 px-2.5 bg-gradient-to-r from-blue-50 to-indigo-50 text-indigo-700 font-bold font-mono text-[9px] rounded-lg border border-indigo-100 uppercase tracking-wider">
                          {ruang.kode}
                        </span>
                        <span className="text-[9.5px] text-indigo-600 font-extrabold bg-indigo-50/70 border border-indigo-100/30 px-2.5 py-1 rounded-full uppercase">
                          Lantai {ruang.lantai}
                        </span>
                      </div>

                      <div className="font-sans">
                        <h4 className="font-extrabold text-slate-900 leading-tight text-base group-hover:text-indigo-600 transition-colors">{ruang.nama}</h4>
                        <p className="text-xs text-slate-400 font-bold mt-0.5">{ruang.gedung?.nama || 'Gedung UNIMUS'}</p>
                      </div>

                      <div className="flex items-center gap-1.5 text-xs text-slate-700 py-2.5 px-3 font-bold bg-slate-50 rounded-2xl border border-slate-100 font-sans">
                        <Armchair className="w-4 h-4 text-slate-400 flex-shrink-0" />
                        <span>Kapasitas <strong>{ruang.kapasitas} org</strong> <span className="text-slate-400 font-medium">({ruang.jenis})</span></span>
                      </div>
                    </div>

                    <div className="pt-4 mt-4 border-t border-slate-100">
                      <button
                        onClick={() => executePinjam(ruang.id)}
                        className={`w-full py-3 px-4 font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-xs active:scale-95 border-none ${
                          user?.role === 'GUEST' ? 'bg-slate-600 hover:bg-slate-700 text-white' : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-100'
                        }`}
                      >
                        {user?.role === 'GUEST' ? 'Login Sesi Reservasi' : 'Ajukan Reservasi Ruang'}
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {filteredAvailableList.length > limitAvailable && (
                <div className="flex justify-center pt-2">
                  <button onClick={() => setLimitAvailable(prev => prev + 6)} className="px-5 py-3 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-extrabold text-xs rounded-xl cursor-pointer">
                    Tampilkan Lebih Banyak ({filteredAvailableList.length - limitAvailable} Ruang Lagi)
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {activeTab === 'weekly' && (
        <div className="space-y-4">
          <div className="bg-gradient-to-r from-emerald-50/70 to-teal-50/70 border border-emerald-100 rounded-3xl p-4 flex flex-col md:flex-row gap-3 justify-between items-start md:items-center font-sans">
            <div className="space-y-1">
              <h3 className="text-sm font-black text-emerald-900 tracking-tight flex items-center gap-1.5">
                <CalendarDays className="w-5 h-5 text-emerald-600 animate-pulse" />
                Mode Panel: Ketersediaan Sepekan (7 Hari Kedepan)
              </h3>
              <p className="text-xs text-emerald-700 font-medium">Pilih sel hijau mana saja untuk menyalin tanggal, ruang dan kembali ke form pendaftaran secara otomatis.</p>
            </div>
            <div className="text-slate-600 text-[10px] font-black font-mono bg-white border border-emerald-100/50 p-2 rounded-xl flex items-center gap-1">
              <SlidersHorizontal className="w-3.5 h-3.5 text-indigo-500 animate-pulse" />
              CEK JAM: <span className="text-indigo-600 font-bold">{filters.waktuMulai} - {filters.waktuSelesai}</span>
            </div>
          </div>

          {loadingWeekly ? (
            <div className="text-center py-20 bg-white rounded-2xl border border-slate-200">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-emerald-600 border-t-transparent mb-3"></div>
              <p className="text-xs text-slate-500 font-bold">Mengenerasikan data ketersediaan harian...</p>
            </div>
          ) : filteredWeeklyRows.length === 0 ? (
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-12 text-center text-slate-500 max-w-md mx-auto text-xs font-semibold">
              Tidak ada ruangan yang cocok dengan saringan / gedung aktif.
            </div>
          ) : (
            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50/80 text-slate-600 text-xs font-black uppercase tracking-wider border-b border-slate-100">
                      <th className="p-4 min-w-[210px] sticky left-0 bg-slate-50/90 backdrop-blur z-10 border-r border-slate-200 shadow-[2px_0_5px_rgba(0,0,0,0.02)]">
                        Ruangan Kampus
                      </th>
                      {weeklyDates.map((dateStr, i) => (
                        <th key={dateStr} className="p-4 text-center min-w-[130px] border-r border-slate-100 last:border-none">
                          <span className="block text-[11px] font-black text-slate-800">{getFormatIndoDay(dateStr)}</span>
                          <span className="text-[9px] text-slate-400 font-mono font-medium block mt-0.5">
                            {dateStr === todayStr ? 'HARI INI' : `Hari ke-${i+1}`}
                          </span>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                    {filteredWeeklyRows.slice(0, limitWeekly).map(ruang => {
                      return (
                        <tr key={ruang.id} className="hover:bg-slate-50/40 transition-colors">
                          <td className="p-4 bg-white sticky left-0 z-10 font-bold border-r border-slate-200 shadow-[2px_0_5px_rgba(0,0,0,0.015)]">
                            <span className="block text-[9px] text-indigo-700 font-mono font-black mb-0.5">{ruang.kode}</span>
                            <span className="block font-black text-slate-900 leading-snug">{ruang.nama.split(' - ')[1] || ruang.nama}</span>
                            <span className="block text-[10px] text-slate-400 font-semibold mt-0.5">{ruang.jenis} • Lantai {ruang.lantai}</span>
                          </td>
                          {weeklyDates.map(dateStr => {
                            const dayRooms = weeklyAvailability[dateStr] || [];
                            const isAvailableFromBackend = Array.isArray(dayRooms) && dayRooms.some(r => r.id === ruang.id);
                            
                            // LOGIKA UTAMA: Cek jika hari ini DAN jam mulai sudah terlewat
                            const isPastTimeToday = dateStr === todayStr && filters.waktuMulai < getCurrentTimeStr();
                            
                            // Ruangan hanya benar-benar tersedia jika backend bilang kosong DAN waktunya belum lewat
                            const isTrulyAvailable = isAvailableFromBackend && !isPastTimeToday;

                            return (
                              <td key={dateStr} className="p-3 text-center border-r border-slate-100 last:border-none align-middle">
                                {isTrulyAvailable ? (
                                  <button
                                    onClick={() => handleSelectWeeklyCell(dateStr, ruang)}
                                    className="w-full py-2 px-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200/65 rounded-xl font-black text-[10px] tracking-wide transition-all shadow-sm active:scale-[0.98] cursor-pointer flex flex-col items-center justify-center gap-1"
                                    title="Tersedia! Klik untuk mengisi tanggal, ruang dan ajukan reservasi."
                                  >
                                    <span className="p-0.5 bg-emerald-500 rounded-full text-white"><Check className="w-2.5 h-2.5 stroke-[3]" /></span>
                                    <span>Tersedia</span>
                                  </button>
                                ) : isPastTimeToday ? (
                                  <div className="py-2.5 px-1.5 bg-slate-100/80 text-slate-400 border border-slate-200 rounded-xl font-bold text-[10px] flex flex-col items-center justify-center gap-1 select-none">
                                    <span className="p-0.5 bg-slate-300 rounded-full text-slate-500"><History className="w-2.5 h-2.5 stroke-[3]" /></span>
                                    <span className="text-slate-500">Waktu Lewat</span>
                                  </div>
                                ) : (
                                  <div className="py-2.5 px-1.5 bg-rose-50/50 text-rose-800/80 border border-rose-100/60 rounded-xl font-bold text-[10px] flex flex-col items-center justify-center gap-1 select-none">
                                    <span className="p-0.5 bg-rose-200 rounded-full text-rose-700"><X className="w-2.5 h-2.5 stroke-[3]" /></span>
                                    <span className="text-rose-600">Terpakai</span>
                                  </div>
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {filteredWeeklyRows.length > limitWeekly && (
                <div className="p-4 border-t border-slate-100 flex justify-center bg-slate-50/50">
                  <button onClick={() => setLimitWeekly(prev => prev + 6)} className="px-5 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs rounded-xl cursor-pointer">
                    Tampilkan Lebih Banyak Ruang ({filteredWeeklyRows.length - limitWeekly} Baris Lagi)
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {alternatif && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4 z-[100] animate-fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-100 overflow-hidden transform scale-100 transition-transform">
            <div className="p-5 bg-amber-500 text-white flex items-center gap-3">
              <AlertTriangle className="w-6 h-6 flex-shrink-0 text-amber-50 animate-pulse" />
              <div>
                <h4 className="font-extrabold text-sm">Bentrok Jadwal Terdeteksi</h4>
                <p className="text-[11px] text-amber-100">Ruangan yang Anda inginkan sedang dipesan oleh agenda lain.</p>
              </div>
            </div>

            <div className="p-6 space-y-4">
              <div className="text-slate-600 text-xs leading-relaxed font-semibold">
                Siprus merekomendasikan ruangan kosong alternatif di gedung yang sama dengan kuota kapasitas yang sesuai dengan Anda:
              </div>

              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                <div className="flex justify-between items-center">
                  <span className="font-mono text-xs font-bold text-indigo-700 bg-indigo-50 border border-indigo-100 py-0.5 px-2 rounded">
                    {alternatif.kode}
                  </span>
                  <span className="text-[10px] font-black text-amber-600 bg-amber-100 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                    REKOMENDASI TERBAIK
                  </span>
                </div>
                <div>
                  <h5 className="font-black text-slate-900 text-sm leading-snug">{alternatif.nama}</h5>
                  <p className="text-[11px] text-slate-400 font-semibold">{alternatif.gedung?.nama || 'Gedung yang Sama'}</p>
                </div>
                <div className="flex gap-4 pt-1.5 border-t border-slate-200 text-xs text-slate-600 font-bold">
                  <span>Lantai: <strong>{alternatif.lantai}</strong></span>
                  <span>Kapasitas: <strong>{alternatif.kapasitas} Kursi</strong></span>
                </div>
              </div>
            </div>

            <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex gap-3">
              <button onClick={() => setAlternatif(null)} className="py-2.5 px-4 bg-white border border-slate-200 text-slate-700 font-bold text-xs rounded-xl flex-1 cursor-pointer">Batal</button>
              <button onClick={() => executePinjam(alternatif.id, true)} className="py-2.5 px-4 bg-amber-500 text-white font-bold text-xs rounded-xl flex-1 cursor-pointer border-none">Ganti ke Alternatif</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}