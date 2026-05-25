import React, { useEffect, useState } from 'react';
import { apiRequest } from '../services/api';
import { Booking, Gedung } from '../types';
import { FileSpreadsheet, Calendar, Filter, Printer, RefreshCw, FileText, CheckCircle, Clock, XCircle, Search, Building } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import SuratDisposisiModal from '../components/SuratDisposisiModal';

export default function Laporan() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [gedungs, setGedungs] = useState<Gedung[]>([]);
  const [limit, setLimit] = useState(10);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedDisposisi, setSelectedDisposisi] = useState<Booking | null>(null);

  // Filter States
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedGedung, setSelectedGedung] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Reset limit when target filters change
  useEffect(() => {
    setLimit(10);
  }, [startDate, endDate, selectedGedung, selectedStatus, searchQuery]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError('');
      // Fetch all bookings and buildings parallelly
      const [bookingsData, gedungsData] = await Promise.all([
        apiRequest<Booking[]>('/booking/all'),
        apiRequest<Gedung[]>('/gedung')
      ]);
      setBookings(bookingsData);
      setGedungs(gedungsData);
    } catch (err: any) {
      setError(err.message || 'Gagal mengambil data laporan.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handlePrint = () => {
    window.print();
  };

  const handleResetFilters = () => {
    setStartDate('');
    setEndDate('');
    setSelectedGedung('all');
    setSelectedStatus('all');
    setSearchQuery('');
  };

  // Filter & Search Logic
  const filteredBookings = bookings.filter((b) => {
    // 1. Filter Gedung ID
    if (selectedGedung !== 'all' && b.ruang?.gedungId !== parseInt(selectedGedung)) {
      return false;
    }

    // 2. Filter status
    if (selectedStatus !== 'all' && b.status !== selectedStatus) {
      return false;
    }

    // 3. Filter Date range
    if (startDate) {
      if (new Date(b.tanggal) < new Date(startDate)) {
        return false;
      }
    }
    if (endDate) {
      if (new Date(b.tanggal) > new Date(endDate)) {
        return false;
      }
    }

    // 4. Search query matching (requester name, room code, room name, reasons)
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = b.user?.name?.toLowerCase().includes(q) || false;
      const matchRoom = b.ruang?.nama?.toLowerCase().includes(q) || b.ruang?.kode?.toLowerCase().includes(q) || false;
      const matchPurpose = b.keperluan?.toLowerCase().includes(q) || false;
      return matchName || matchRoom || matchPurpose;
    }

    return true;
  });

  return (
    <motion.div 
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className="space-y-6" 
      id="laporan-page"
    >
      {/* Printable Report Header Panel (Only visible on browser print) */}
      <div className="hidden print:block text-center border-b-2 border-slate-900 pb-5 mb-6">
        <h1 className="text-xl font-bold uppercase font-sans tracking-wide">
          UNIVERSITAS MUHAMMADIYAH SEMARANG
        </h1>
        <h2 className="text-md font-bold text-slate-800 uppercase tracking-wide">
          SISTEM INFROMASI PRASARANA RUMAH TANGGA (SIPRUS)
        </h2>
        <p className="text-xs text-slate-500 mt-1 font-mono">
          Jl. Kedungmundu Raya No. 125, Semarang • Email: bauk@unimus.ac.id
        </p>
        <p className="text-[14px] font-bold mt-4 underline uppercase">
          LAPORAN AKTIVITAS PEMINJAMAN RUANGAN CAMPUS
        </p>
        <div className="text-[10px] text-slate-500 mt-1 text-right font-mono">
          Dicetak tanggal: {new Date().toLocaleDateString('id-ID', { dateStyle: 'full' })}
        </div>
      </div>

      {/* Screen Header Banner (hidden on print) */}
      <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-[0_4px_20px_rgba(0,0,0,0.02)] flex flex-col md:flex-row justify-between items-start md:items-center gap-4 print:hidden">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <FileSpreadsheet className="w-5 h-5 text-indigo-650" />
            <h2 className="text-xl font-black tracking-tight text-slate-900">
              Laporan Rekapitulasi Peminjaman
            </h2>
          </div>
          <p className="text-xs text-slate-500">
            Export rekap peminjaman ruangan dalam bentuk cetakan resmi untuk evaluasi berkala.
          </p>
        </div>

        <div className="flex gap-2.5 w-full sm:w-auto">
          <button
            onClick={fetchData}
            title="Refresh Data"
            className="p-2.5 border border-slate-200 bg-white hover:bg-slate-50 rounded-xl text-slate-500 hover:text-slate-700 transition-colors cursor-pointer"
          >
            <RefreshCw className="w-4.5 h-4.5" />
          </button>
          
          <button
            onClick={handlePrint}
            disabled={filteredBookings.length === 0}
            className="py-2.5 px-4 bg-slate-900 hover:bg-black text-white text-xs font-bold rounded-xl transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            <Printer className="w-4 h-4" />
            Cetak Laporan / PDF
          </button>
        </div>
      </div>

      {/* Filter panel (hidden on print) */}
      <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-[0_4px_20px_rgba(0,0,0,0.02)] space-y-4 print:hidden">
        <div className="flex items-center gap-2 text-slate-800 font-bold text-xs pb-3 border-b border-slate-100">
          <Filter className="w-4 h-4 text-indigo-650" />
          <span>Filter Laporan Khusus</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
          {/* Start Date */}
          <div className="space-y-1.5">
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider font-mono">Tanggal Mulai Rekap</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                <Calendar className="w-3.5 h-3.5" />
              </span>
              <input
                type="date"
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 font-medium focus:outline-none focus:ring-1.5 focus:ring-indigo-600 focus:bg-white transition-all"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
          </div>

          {/* End Date */}
          <div className="space-y-1.5">
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider font-mono">Tanggal Selesai Rekap</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                <Calendar className="w-3.5 h-3.5" />
              </span>
              <input
                type="date"
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 font-medium focus:outline-none focus:ring-1.5 focus:ring-indigo-600 focus:bg-white transition-all"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>

          {/* Filter Gedung */}
          <div className="space-y-1.5">
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider font-mono">Gedung / Fisik</label>
            <select
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 font-semibold focus:outline-none focus:ring-1.5 focus:ring-indigo-600 focus:bg-white transition-all cursor-pointer"
              value={selectedGedung}
              onChange={(e) => setSelectedGedung(e.target.value)}
            >
              <option value="all">Semua Gedung UNIMUS</option>
              {gedungs.map(g => (
                <option key={g.id} value={g.id}>{g.kode} - {g.nama}</option>
              ))}
            </select>
          </div>

          {/* Filter Status */}
          <div className="space-y-1.5">
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider font-mono">Status Verifikasi</label>
            <select
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 font-semibold focus:outline-none focus:ring-1.5 focus:ring-indigo-600 focus:bg-white transition-all cursor-pointer"
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
            >
              <option value="all">Semua Status</option>
              <option value="MENUNGGU_RT">Validasi Admin RT (Tingkat 1)</option>
              <option value="MENUNGGU_KEPALA">Validasi Kepala RT (Tingkat 2)</option>
              <option value="DISETUJUI">Disetujui Penuh</option>
              <option value="DITOLAK_RT">Ditolak Admin RT</option>
              <option value="DITOLAK_KEPALA">Ditolak Kepala RT</option>
            </select>
          </div>
        </div>

        {/* Search bar and clear options */}
        <div className="flex flex-col sm:flex-row gap-3 pt-2 text-xs">
          <div className="relative flex-1">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
              <Search className="w-3.5 h-3.5" />
            </span>
            <input
              type="text"
              placeholder="Cari kata kunci mahasiswa, keperluan, nama ruang..."
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 font-medium focus:outline-none focus:ring-1.5 focus:ring-indigo-600 focus:bg-white transition-all"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <button
            onClick={handleResetFilters}
            className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-600 font-bold rounded-xl transition-all cursor-pointer focus:outline-none"
          >
            Bersihkan Filter
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-100 rounded-xl text-rose-700 text-xs flex gap-2.5 items-center print:hidden">
          <XCircle className="w-4 h-4 text-rose-550 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Table list report */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-[0_4px_20px_rgba(0,0,0,0.02)] overflow-hidden print:shadow-none print:border-none">
        
        {/* Statistics headers on top of table but only in print */}
        <div className="hidden print:grid grid-cols-4 gap-4 p-4 mb-4 border border-slate-350 rounded-xl text-xs">
          <div>
            <span className="text-[10px] text-slate-500 font-bold uppercase block">Filter Rentang:</span>
            <span className="font-semibold">{startDate || 'Mulanya'} s/d {endDate || 'Sekarang'}</span>
          </div>
          <div>
            <span className="text-[10px] text-slate-500 font-bold uppercase block">Gedung Terpilih:</span>
            <span className="font-semibold">
              {selectedGedung === 'all' ? 'Semua Gedung' : gedungs.find(g => g.id === parseInt(selectedGedung))?.kode}
            </span>
          </div>
          <div>
            <span className="text-[10px] text-slate-500 font-bold uppercase block">Status Laporan:</span>
            <span className="font-semibold">{selectedStatus === 'all' ? 'Semua Status Peminjaman' : selectedStatus}</span>
          </div>
          <div>
            <span className="text-[10px] text-slate-500 font-bold uppercase block">Total Transaksi:</span>
            <span className="font-semibold text-slate-900 font-mono">{filteredBookings.length} Record</span>
          </div>
        </div>

        {loading ? (
          <div className="p-16 text-center print:hidden">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-3 border-indigo-650 border-t-transparent mb-2"></div>
            <p className="text-slate-400 text-xs font-semibold animate-pulse">Menghitung rekapitulasi data...</p>
          </div>
        ) : filteredBookings.length === 0 ? (
          <div className="p-16 text-center max-w-sm mx-auto space-y-3">
            <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto text-slate-400">
              <FileText className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-sm text-slate-800">Tidak ada pengajuan terekam</h3>
            <p className="text-xs text-slate-500">
              Tidak ada data reservasi peminjaman ruang yang sesuai dengan filter rincian terpilih.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs print:text-[10px]">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-[10px] text-slate-500 font-bold tracking-wider uppercase font-mono print:bg-transparent">
                  <th className="py-4 px-6 w-16">No/ID</th>
                  <th className="py-4 px-6">Nama Mahasiswa</th>
                  <th className="py-4 px-6">Ruangan Kampus</th>
                  <th className="py-4 px-6">Gedung</th>
                  <th className="py-4 px-6">Tanggal & Jam</th>
                  <th className="py-4 px-6">Tujuan / Keperluan</th>
                  <th className="py-4 px-6 text-center w-28">Status</th>
                  <th className="py-4 px-6 text-center print:hidden">Dokumen</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filteredBookings.slice(0, limit).map((b, index) => {
                  const build = gedungs.find(g => g.id === b.ruang?.gedungId);
                  
                  return (
                    <tr key={b.id} className="hover:bg-slate-50/50 transition-colors print:hover:bg-transparent">
                      <td className="py-3 px-6 font-mono text-slate-400 font-bold">
                        {index + 1}
                        <span className="block text-[8px] text-slate-400">#{b.id}</span>
                      </td>
                      <td className="py-3 px-6">
                        <p className="font-bold text-slate-900 leading-tight">{b.user ? b.user.name : 'Mahasiswa'}</p>
                        <p className="text-[10px] text-slate-500 font-mono print:hidden">{b.user ? b.user.email : ''}</p>
                      </td>
                      <td className="py-3 px-6">
                        <p className="font-semibold text-slate-800 leading-snug">{b.ruang ? b.ruang.nama : 'Ruang'}</p>
                        <span className="px-1.5 py-0.5 bg-slate-100 rounded text-[9px] font-mono select-all">
                          {b.ruang?.kode}
                        </span>
                      </td>
                      <td className="py-3 px-6">
                        <span className="font-mono text-indigo-755 font-bold uppercase">{build ? build.kode : ''}</span>
                        <span className="block text-[9px] text-slate-500">{build ? build.nama : ''}</span>
                      </td>
                      <td className="py-3 px-6">
                        <p className="font-bold text-slate-800 font-mono">
                          {new Date(b.tanggal).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </p>
                        <p className="text-[10px] text-slate-500 font-mono leading-none mt-0.5">
                          ⏰ {b.waktuMulai} - {b.waktuSelesai} WIB
                        </p>
                      </td>
                      <td className="py-3 px-6 font-medium text-slate-600 italic">
                        "{b.keperluan}"
                      </td>
                      <td className="py-3 px-6">
                        <div className="flex flex-col items-center">
                          {b.status === 'DISETUJUI' && (
                            <span className="px-2.5 py-1 bg-emerald-50 text-emerald-800 font-extrabold rounded-lg text-[9px] tracking-wide inline-flex items-center gap-1">
                              <CheckCircle className="w-3 h-3 text-emerald-600" />
                              DISETUJUI
                            </span>
                          )}
                          {b.status === 'MENUNGGU_RT' && (
                            <span className="px-2.5 py-1 bg-amber-50 text-amber-800 font-extrabold rounded-lg text-[9px] tracking-wide inline-flex items-center gap-1">
                              <Clock className="w-3 h-3 text-amber-600 animate-pulse" />
                              VERIFIKASI RT
                            </span>
                          )}
                          {b.status === 'MENUNGGU_KEPALA' && (
                            <span className="px-2.5 py-1 bg-blue-50 text-blue-800 font-extrabold rounded-lg text-[9px] tracking-wide inline-flex items-center gap-1">
                              <Clock className="w-3 h-3 text-blue-600 animate-pulse" />
                              VERIFIKASI SIPRUS
                            </span>
                          )}
                          {(b.status === 'DITOLAK_RT' || b.status === 'DITOLAK_KEPALA') && (
                            <span className="px-2.5 py-1 bg-rose-50 text-rose-800 font-extrabold rounded-lg text-[9px] tracking-wide inline-flex items-center gap-1">
                              <XCircle className="w-3 h-3 text-rose-600" />
                              DITOLAK
                            </span>
                          )}
                          
                          {/* Catatan penolakan */}
                          {b.catatanPenolakan && (
                            <p className="text-[8px] text-rose-600 mt-1 max-w-[120px] text-center italic leading-tight">
                              Alasan: "{b.catatanPenolakan}"
                            </p>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-6 text-center print:hidden">
                        {b.status === 'DISETUJUI' ? (
                          <button
                            onClick={() => setSelectedDisposisi(b)}
                            className="p-1.5 px-3 bg-[#dcfce7] hover:bg-[#bbf7d0] text-emerald-800 border border-emerald-250 text-[10px] rounded-xl font-black transition-all cursor-pointer flex items-center gap-1 mx-auto"
                            title="Format Surat Disposisi Kepala RT"
                            id={`btn-disposisi-laporan-${b.id}`}
                          >
                            <FileText className="w-3 h-3 text-emerald-600" />
                            Disposisi
                          </button>
                        ) : (
                          <span className="text-slate-400 font-mono text-[9px] font-bold">-</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {filteredBookings.length > limit && (
              <div className="p-4 bg-slate-50/50 border-t border-slate-100 flex flex-wrap justify-center gap-2.5 print:hidden">
                <button
                  type="button"
                  onClick={() => setLimit(prev => prev + 10)}
                  className="px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs rounded-xl transition-colors border border-indigo-200/50 cursor-pointer flex items-center gap-2 shadow-sm"
                >
                  Tampilkan Lebih Banyak ({filteredBookings.length - limit} Record Lagi)
                </button>
                <button
                  type="button"
                  onClick={() => setLimit(filteredBookings.length)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-205 text-slate-700 border border-slate-200 font-bold text-xs rounded-xl transition-colors cursor-pointer flex items-center gap-1.5 shadow-sm"
                >
                  Tampilkan Semua ({filteredBookings.length} Record)
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Report Footer on Print */}
      <div className="hidden print:flex justify-between items-center mt-12 text-xs font-sans">
        <div className="text-center w-48">
          <p className="mb-14">Mengetahui,<br/><strong>Admin Rumah Tangga UNIMUS</strong></p>
          <div className="border-b border-black w-36 mx-auto"></div>
          <p className="text-[10px] text-slate-500 mt-1 font-mono">Petugas Prasarana</p>
        </div>

        <div className="text-center w-48">
          <p className="mb-14">Menyetujui,<br/><strong>Kepala Rumah Tangga (Siprus)</strong></p>
          <div className="border-b border-black w-36 mx-auto"></div>
          <p className="text-[10px] text-slate-500 mt-1 font-mono">Drs. H. Mulyono</p>
        </div>
      </div>

      {/* Surat Disposisi Modal Overlay for Audited History */}
      <AnimatePresence>
        {selectedDisposisi && (
          <SuratDisposisiModal
            booking={selectedDisposisi}
            isOpen={selectedDisposisi !== null}
            onClose={() => setSelectedDisposisi(null)}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}
