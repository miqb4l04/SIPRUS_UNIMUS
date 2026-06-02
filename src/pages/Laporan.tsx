import React, { useEffect, useState } from 'react';
// @ts-ignore
import { apiRequest } from '../services/api';
import { Booking, Gedung } from '../types';
import { 
  FileSpreadsheet, Calendar, Filter, Printer, RefreshCw, 
  FileText, CheckCircle, Clock, XCircle, Search, Download, 
  Zap, Building2, ShieldCheck
} from 'lucide-react';
// @ts-ignore
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
  const [activeQuickFilter, setActiveQuickFilter] = useState('');

  useEffect(() => {
    setLimit(10);
  }, [startDate, endDate, selectedGedung, selectedStatus, searchQuery]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError('');
      const [bookingsData, gedungsData] = await Promise.all([
        apiRequest<Booking[]>('/booking/all'),
        apiRequest<Gedung[]>('/gedung')
      ]);
      setBookings(Array.isArray(bookingsData) ? bookingsData : []);
      setGedungs(Array.isArray(gedungsData) ? gedungsData : []);
    } catch (err: any) {
      setError(err.message || 'Gagal mengambil data laporan.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handlePrint = () => window.print();

  const getDynamicTitleInfo = () => {
    let reportTitle = "Laporan Rekapitulasi Peminjaman Ruangan";
    let fileName = `Laporan_Peminjaman_SIPRUS_${new Date().getTime()}`;
    let periodeLabel = "Semua Waktu";

    if (startDate && endDate) {
      const d1 = new Date(startDate);
      const d2 = new Date(endDate);
      const optMonth: Intl.DateTimeFormatOptions = { month: 'long', year: 'numeric' };
      const optFull: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'long', year: 'numeric' };
      
      if (activeQuickFilter === 'hari_ini') {
        reportTitle = `Laporan Harian Peminjaman Ruangan`;
        periodeLabel = d1.toLocaleDateString('id-ID', optFull);
        fileName = `Laporan_Harian_${d1.toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, '-')}`;
      } else if (activeQuickFilter === 'bulan_ini' || activeQuickFilter === 'bulan_lalu') {
        const monthYear = d1.toLocaleDateString('id-ID', optMonth);
        reportTitle = `Laporan Bulanan Peminjaman Ruangan`;
        periodeLabel = `Bulan ${monthYear}`;
        fileName = `Laporan_Bulan_${monthYear.replace(/ /g, '_')}`;
      } else if (activeQuickFilter === 'tahun_ini') {
        reportTitle = `Laporan Tahunan Peminjaman Ruangan`;
        periodeLabel = `Tahun ${d1.getFullYear()}`;
        fileName = `Laporan_Tahun_${d1.getFullYear()}`;
      } else {
        // Rentang kustom
        periodeLabel = `${d1.toLocaleDateString('id-ID', optFull)} s/d ${d2.toLocaleDateString('id-ID', optFull)}`;
        fileName = `Laporan_Kustom_${d1.toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit' })}_sd_${d2.toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric' })}`;
      }
    }

    return { reportTitle, fileName, periodeLabel };
  };

  const handleExportExcel = () => {
    const { reportTitle, fileName, periodeLabel } = getDynamicTitleInfo();
    
    let gedungName = "Semua Gedung";
    if (selectedGedung !== 'all') {
       gedungName = gedungs.find(g => g.id === parseInt(selectedGedung))?.nama || "Semua Gedung";
    }

    let statusName = selectedStatus === 'all' ? 'Semua Status' : selectedStatus.replace('_', ' ');

    // Membuat struktur HTML untuk ditipu menjadi Excel agar stylenya terbaca
    let htmlContent = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <meta charset="utf-8" />
        <style>
          table { border-collapse: collapse; width: 100%; font-family: Arial, sans-serif; }
          th, td { border: 1px solid #dddddd; padding: 8px; text-align: left; }
          .header { background-color: #4f46e5; color: white; font-weight: bold; text-align: center; }
          .title-row { font-size: 18px; font-weight: bold; text-align: center; background-color: #ffffff; }
          .info-row { font-size: 12px; background-color: #ffffff; }
          .text-center { text-align: center; }
          .text-str { mso-number-format:"\\@"; } /* Mencegah excel mengubah format angka/tanggal */
        </style>
      </head>
      <body>
        <table>
          <tr><td colspan="10" class="title-row">UNIVERSITAS MUHAMMADIYAH SEMARANG</td></tr>
          <tr><td colspan="10" class="title-row">${reportTitle}</td></tr>
          <tr><td colspan="10" style="height: 10px;"></td></tr>
          
          <tr>
            <td colspan="2" class="info-row"><b>Periode Rekap:</b></td>
            <td colspan="8" class="info-row">${periodeLabel}</td>
          </tr>
          <tr>
            <td colspan="2" class="info-row"><b>Filter Gedung:</b></td>
            <td colspan="8" class="info-row">${gedungName}</td>
          </tr>
          <tr>
            <td colspan="2" class="info-row"><b>Filter Status:</b></td>
            <td colspan="8" class="info-row">${statusName}</td>
          </tr>
          <tr>
            <td colspan="2" class="info-row"><b>Tanggal Unduh:</b></td>
            <td colspan="8" class="info-row">${new Date().toLocaleString('id-ID')}</td>
          </tr>
          <tr><td colspan="10" style="height: 10px;"></td></tr>

          <tr>
            <th class="header">ID</th>
            <th class="header">Nama Mahasiswa</th>
            <th class="header">Email</th>
            <th class="header">Ruangan</th>
            <th class="header">Gedung</th>
            <th class="header">Tgl Main</th>
            <th class="header">Jam Mulai</th>
            <th class="header">Jam Selesai</th>
            <th class="header">Keperluan</th>
            <th class="header">Status Akhir</th>
          </tr>
    `;

    filteredBookings.forEach(b => {
      const g = gedungs.find(gd => gd.id === b.ruang?.gedungId);
      htmlContent += `
        <tr>
          <td class="text-center text-str">#${b.id}</td>
          <td>${b.user?.name || '-'}</td>
          <td>${b.user?.email || '-'}</td>
          <td>${b.ruang?.nama || '-'} (${b.ruang?.kode || '-'})</td>
          <td>${g?.nama || '-'}</td>
          <td class="text-center text-str">${b.tanggal}</td>
          <td class="text-center text-str">${b.waktuMulai}</td>
          <td class="text-center text-str">${b.waktuSelesai}</td>
          <td>${b.keperluan || '-'}</td>
          <td class="text-center"><b>${b.status}</b></td>
        </tr>
      `;
    });

    htmlContent += `
          <tr><td colspan="10" style="height: 10px;"></td></tr>
          <tr>
            <td colspan="9" style="text-align: right; font-weight: bold;">TOTAL TRANSAKSI:</td>
            <td class="text-center font-weight: bold;">${filteredBookings.length} Data</td>
          </tr>
        </table>
      </body>
      </html>
    `;

    const blob = new Blob([htmlContent], { type: 'application/vnd.ms-excel' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${fileName}.xls`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleResetFilters = () => {
    setStartDate(''); setEndDate(''); setSelectedGedung('all'); setSelectedStatus('all'); setSearchQuery(''); setActiveQuickFilter('');
  };

  const applyQuickFilter = (type: string) => {
    setActiveQuickFilter(type);
    const today = new Date();
    
    const formatDate = (d: Date) => {
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    };

    let start = new Date(); let end = new Date();

    switch (type) {
      case 'hari_ini': start = today; end = today; break;
      case 'bulan_ini': start = new Date(today.getFullYear(), today.getMonth(), 1); end = new Date(today.getFullYear(), today.getMonth() + 1, 0); break;
      case 'bulan_lalu': start = new Date(today.getFullYear(), today.getMonth() - 1, 1); end = new Date(today.getFullYear(), today.getMonth(), 0); break;
      case 'tahun_ini': start = new Date(today.getFullYear(), 0, 1); end = new Date(today.getFullYear(), 11, 31); break;
      default: setStartDate(''); setEndDate(''); return;
    }

    setStartDate(formatDate(start)); setEndDate(formatDate(end));
  };

  const filteredBookings = bookings.filter((b) => {
    if (selectedGedung !== 'all' && b.ruang?.gedungId !== parseInt(selectedGedung)) return false;
    if (selectedStatus !== 'all' && b.status !== selectedStatus) return false;
    if (startDate && new Date(b.tanggal) < new Date(startDate)) return false;
    if (endDate && new Date(b.tanggal) > new Date(endDate)) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        b.user?.name?.toLowerCase().includes(q) || 
        b.ruang?.nama?.toLowerCase().includes(q) || 
        b.ruang?.kode?.toLowerCase().includes(q) || 
        b.keperluan?.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="space-y-6 animate-fade-in" id="laporan-page">
      {/* HEADER CETAK (Tampil di Kertas Saja) */}
      <div className="hidden print:block text-center border-b-2 border-slate-900 pb-5 mb-6">
        <h1 className="text-xl font-bold uppercase font-sans tracking-wide">UNIVERSITAS MUHAMMADIYAH SEMARANG</h1>
        <h2 className="text-md font-bold text-slate-800 uppercase tracking-wide">SISTEM INFORMASI PRASARANA RUMAH TANGGA (SIPRUS)</h2>
        <p className="text-xs text-slate-500 mt-1 font-mono">Jl. Kedungmundu Raya No. 125, Semarang • Email: bauk@unimus.ac.id</p>
        <p className="text-[14px] font-bold mt-4 underline uppercase">{getDynamicTitleInfo().reportTitle}</p>
        <div className="text-[10px] text-slate-500 mt-1 text-right font-mono">
          Dicetak tanggal: {new Date().toLocaleDateString('id-ID', { dateStyle: 'full' })}
        </div>
      </div>

      {/* HEADER LAYAR */}
      <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4 print:hidden">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <h2 className="text-xl font-black tracking-tight text-slate-900">Laporan Rekapitulasi Peminjaman</h2>
          </div>
          <p className="text-xs text-slate-500">Export rekap peminjaman ruangan dalam bentuk Excel cantik atau cetakan resmi.</p>
        </div>

        <div className="flex flex-wrap gap-2.5 w-full md:w-auto">
          <button onClick={fetchData} title="Segarkan Data" className="p-2.5 border border-slate-200 bg-white hover:bg-slate-50 rounded-xl text-slate-500 hover:text-indigo-600 transition-colors cursor-pointer shadow-sm">
            <RefreshCw className="w-4.5 h-4.5" />
          </button>
          <button onClick={handleExportExcel} disabled={filteredBookings.length === 0} className="py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 border border-emerald-700">
            <Download className="w-4 h-4" /> Export Excel
          </button>
          <button onClick={handlePrint} disabled={filteredBookings.length === 0} className="py-2.5 px-4 bg-slate-900 hover:bg-black text-white text-xs font-bold rounded-xl transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50">
            <Printer className="w-4 h-4" /> Cetak PDF
          </button>
        </div>
      </div>

      {/* FILTER PANEL - GRID SIMETRIS */}
      <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-5 print:hidden">
        
        {/* Header Filter & Tombol Pintasan */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2 text-slate-800 font-bold text-sm tracking-tight">
            <Filter className="w-4.5 h-4.5 text-indigo-600" />
            <span>Kriteria Laporan Khusus</span>
          </div>
          
          <div className="flex flex-wrap items-center gap-2 text-[10px] font-bold">
            <span className="text-slate-400 mr-1 flex items-center gap-1 font-mono uppercase tracking-wider"><Zap className="w-3.5 h-3.5 text-amber-500"/> Pintasan Cepat:</span>
            {['hari_ini', 'bulan_ini', 'bulan_lalu', 'tahun_ini'].map((type) => {
              const label = type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
              return (
                <button 
                  key={type}
                  onClick={() => applyQuickFilter(type)} 
                  className={`px-3 py-1.5 rounded-lg border transition-all cursor-pointer ${
                    activeQuickFilter === type 
                      ? 'bg-indigo-600 border-indigo-700 text-white shadow-sm' 
                      : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-700'
                  }`}
                >{label}</button>
              )
            })}
          </div>
        </div>

        {/* 4 Kolom Filter Identik yang Rapi */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
          
          <div className="space-y-2">
            <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-indigo-400" /> Dari Tanggal
            </label>
            <input
              type="date"
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition-all cursor-pointer"
              value={startDate}
              onChange={(e) => { setStartDate(e.target.value); setActiveQuickFilter(''); }}
            />
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-indigo-400" /> Sampai Tanggal
            </label>
            <input
              type="date"
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition-all cursor-pointer"
              value={endDate}
              onChange={(e) => { setEndDate(e.target.value); setActiveQuickFilter(''); }}
            />
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-indigo-400" /> Filter Gedung
            </label>
            <select
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition-all cursor-pointer appearance-none"
              value={selectedGedung}
              onChange={(e) => setSelectedGedung(e.target.value)}
            >
              <option value="all">🏢 Semua Gedung UNIMUS</option>
              {gedungs.map(g => <option key={g.id} value={g.id}>{g.kode} - {g.nama}</option>)}
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" /> Status Verifikasi
            </label>
            <select
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition-all cursor-pointer appearance-none"
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
            >
              <option value="all">🔍 Semua Status Aktif</option>
              <option value="MENUNGGU_RT">⏳ Validasi Tingkat 1 (Admin)</option>
              <option value="MENUNGGU_KEPALA">⏳ Validasi Tingkat 2 (Siprus)</option>
              <option value="DISETUJUI">✅ Disetujui Penuh</option>
              <option value="DITOLAK_RT">❌ Ditolak Admin RT</option>
              <option value="DITOLAK_KEPALA">❌ Ditolak Kepala RT</option>
            </select>
          </div>

        </div>

        {/* Pencarian dan Tombol Reset */}
        <div className="flex flex-col sm:flex-row gap-3 pt-2 text-xs">
          <div className="relative flex-1">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
              <Search className="w-4 h-4" />
            </span>
            <input
              type="text"
              placeholder="Cari berdasarkan nama mahasiswa, ID, ruangan, atau keperluan..."
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition-all shadow-sm"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <button
            onClick={handleResetFilters}
            className="px-5 py-2.5 border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 font-bold rounded-xl transition-all cursor-pointer shadow-sm flex items-center justify-center gap-2"
          >
            Bersihkan Filter
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-100 rounded-2xl text-rose-700 text-xs flex gap-2.5 items-center font-bold print:hidden shadow-sm">
          <XCircle className="w-5 h-5 text-rose-500 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* TABEL LAPORAN */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden print:shadow-none print:border-none print:rounded-none">
        
        {/* Info Print Header */}
        <div className="hidden print:grid grid-cols-4 gap-4 p-4 mb-4 border border-slate-300 rounded-xl text-xs">
          <div><span className="text-[10px] text-slate-500 font-bold uppercase block">Periode Laporan:</span><span className="font-semibold">{getDynamicTitleInfo().periodeLabel}</span></div>
          <div><span className="text-[10px] text-slate-500 font-bold uppercase block">Gedung Terpilih:</span><span className="font-semibold">{selectedGedung === 'all' ? 'Semua Gedung' : gedungs.find(g => g.id === parseInt(selectedGedung))?.kode}</span></div>
          <div><span className="text-[10px] text-slate-500 font-bold uppercase block">Status Laporan:</span><span className="font-semibold">{selectedStatus === 'all' ? 'Semua Status' : selectedStatus.replace('_', ' ')}</span></div>
          <div><span className="text-[10px] text-slate-500 font-bold uppercase block">Total Record:</span><span className="font-semibold text-slate-900 font-mono">{filteredBookings.length} Transaksi</span></div>
        </div>

        {loading ? (
          <div className="p-20 text-center print:hidden">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-3 border-indigo-600 border-t-transparent mb-3"></div>
            <p className="text-slate-500 text-xs font-bold tracking-wide animate-pulse">Menyusun Data Rekapitulasi...</p>
          </div>
        ) : filteredBookings.length === 0 ? (
          <div className="p-20 text-center max-w-sm mx-auto space-y-3">
            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto text-slate-300 border border-slate-100 shadow-inner">
              <FileText className="w-8 h-8" />
            </div>
            <h3 className="font-black text-sm text-slate-800">Tidak Ada Riwayat Transaksi</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Sistem tidak menemukan data reservasi ruangan yang cocok dengan filter tanggal/status yang Anda pilih.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs print:text-[10px]">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/70 text-[10px] text-slate-500 font-black tracking-widest uppercase font-mono print:bg-transparent">
                  <th className="py-4 px-6">No/ID</th>
                  <th className="py-4 px-6">Identitas Peminjam</th>
                  <th className="py-4 px-6">Ruang & Gedung</th>
                  <th className="py-4 px-6">Agenda Waktu</th>
                  <th className="py-4 px-6 w-1/4">Tujuan / Keperluan</th>
                  <th className="py-4 px-6 text-center w-28">Status Akhir</th>
                  <th className="py-4 px-6 text-center print:hidden">Cetak</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filteredBookings.slice(0, limit).map((b, index) => {
                  const build = gedungs.find(g => g.id === b.ruang?.gedungId);
                  
                  return (
                    <tr key={b.id} className="hover:bg-indigo-50/20 transition-colors print:hover:bg-transparent">
                      <td className="py-4 px-6 font-mono text-slate-400 font-bold">
                        {index + 1}
                        <span className="block text-[9px] text-slate-300 mt-0.5">#{b.id}</span>
                      </td>
                      <td className="py-4 px-6">
                        <p className="font-extrabold text-slate-900 leading-tight">{b.user ? b.user.name : 'Mahasiswa'}</p>
                        <p className="text-[10px] text-slate-500 font-mono mt-0.5 print:hidden flex items-center gap-1">
                          {b.user ? b.user.email : ''}
                        </p>
                      </td>
                      <td className="py-4 px-6 space-y-1">
                        <p className="font-bold text-slate-800 leading-snug">{b.ruang ? b.ruang.nama : 'Ruang'}</p>
                        <div className="flex gap-1.5 items-center text-[9px] font-mono">
                          <span className="px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded font-bold border border-slate-200">{b.ruang?.kode}</span>
                          <span className="text-slate-400">{build ? build.nama : ''}</span>
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <p className="font-bold text-slate-800 font-mono">
                          {new Date(b.tanggal).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </p>
                        <p className="text-[10px] text-indigo-600 font-mono font-bold bg-indigo-50 px-1.5 py-0.5 rounded-md inline-block mt-1">
                          ⏰ {b.waktuMulai} - {b.waktuSelesai}
                        </p>
                      </td>
                      <td className="py-4 px-6 font-medium text-slate-600 italic leading-relaxed">
                        "{b.keperluan}"
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex flex-col items-center gap-1">
                          {b.status === 'DISETUJUI' && (
                            <span className="px-2.5 py-1.5 bg-emerald-50 border border-emerald-100 text-emerald-800 font-extrabold rounded-xl text-[9px] tracking-wide inline-flex items-center gap-1 shadow-sm">
                              <CheckCircle className="w-3.5 h-3.5 text-emerald-600" /> DISETUJUI
                            </span>
                          )}
                          {(b.status === 'MENUNGGU_RT' || b.status === 'MENUNGGU_KEPALA') && (
                            <span className="px-2.5 py-1.5 bg-amber-50 border border-amber-100 text-amber-800 font-extrabold rounded-xl text-[9px] tracking-wide inline-flex items-center gap-1 shadow-sm">
                              <Clock className="w-3.5 h-3.5 text-amber-600 animate-spin-slow" /> PENDING
                            </span>
                          )}
                          {(b.status === 'DITOLAK_RT' || b.status === 'DITOLAK_KEPALA') && (
                            <span className="px-2.5 py-1.5 bg-rose-50 border border-rose-100 text-rose-800 font-extrabold rounded-xl text-[9px] tracking-wide inline-flex items-center gap-1 shadow-sm">
                              <XCircle className="w-3.5 h-3.5 text-rose-600" /> DITOLAK
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-4 px-6 text-center print:hidden">
                        {b.status === 'DISETUJUI' ? (
                          <button
                            onClick={() => setSelectedDisposisi(b)}
                            className="p-1.5 px-3 bg-white hover:bg-slate-50 text-indigo-700 border border-slate-200 shadow-sm text-[10px] rounded-xl font-bold transition-all cursor-pointer flex items-center justify-center gap-1 mx-auto"
                            title="Format Surat Disposisi Kepala RT"
                          >
                            <FileText className="w-3.5 h-3.5" /> Lihat
                          </button>
                        ) : (
                          <span className="text-slate-300 font-mono text-[10px] font-bold">-</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {filteredBookings.length > limit && (
              <div className="p-5 bg-slate-50/50 border-t border-slate-100 flex justify-center print:hidden">
                <button
                  type="button"
                  onClick={() => setLimit(prev => prev + 10)}
                  className="px-6 py-2.5 bg-white text-indigo-700 font-extrabold text-xs rounded-xl transition-all border border-slate-200 cursor-pointer flex items-center gap-2 shadow-sm hover:shadow-md hover:border-indigo-200"
                >
                  Tampilkan Lebih Banyak ({filteredBookings.length - limit} Tersisa)
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* FOOTER CETAK (Tanda Tangan) */}
      <div className="hidden print:flex justify-between items-center mt-12 text-xs font-sans">
        <div className="text-center w-48">
          <p className="mb-14">Mengetahui,<br/><strong>Admin Rumah Tangga UNIMUS</strong></p>
          <div className="border-b border-black w-36 mx-auto"></div>
          <p className="text-[10px] text-slate-500 mt-1 font-mono">NIP. .........................</p>
        </div>
        <div className="text-center w-48">
          <p className="mb-14">Mengesahkan,<br/><strong>Kepala Biro Administrasi Umum</strong></p>
          <div className="border-b border-black w-36 mx-auto"></div>
          <p className="text-[10px] text-slate-500 mt-1 font-mono">Drs. H. Mulyono</p>
        </div>
      </div>

      {selectedDisposisi && (
        <SuratDisposisiModal booking={selectedDisposisi} isOpen={selectedDisposisi !== null} onClose={() => setSelectedDisposisi(null)} />
      )}
    </div>
  );
}