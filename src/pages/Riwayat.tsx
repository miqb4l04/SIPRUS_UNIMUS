import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import { Booking } from '../types';
import { Calendar, Clock, HelpCircle, AlertOctagon, CheckCircle2, RotateCcw, Building2, Activity, ClipboardList, FileText } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import SuratDisposisiModal from '../components/SuratDisposisiModal';

export default function Riwayat() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [limit, setLimit] = useState(5);
  const [loading, setLoading] = useState(true);
  const [selectedDisposisi, setSelectedDisposisi] = useState<Booking | null>(null);

  const loadBookings = async () => {
    try {
      setLoading(true);
      const data = await api.get('/booking/user');
      setBookings(data);
    } catch (err) {
      console.error('Failed to load user bookings', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBookings();
  }, []);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'MENUNGGU_RT':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-700 text-xs font-bold rounded-full transition-all">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
            Menunggu Verifikasi RT (Tingkat 1)
          </span>
        );
      case 'MENUNGGU_KEPALA':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-yellow-50 hover:bg-yellow-105 border border-yellow-200 text-yellow-800 text-xs font-bold rounded-full transition-all">
            <span className="w-1.5 h-1.5 rounded-full bg-yellow-500 animate-pulse"></span>
            Menunggu Kepala RT (Tingkat 2)
          </span>
        );
      case 'DISETUJUI':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-700 text-xs font-bold rounded-full transition-all">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
            Disetujui Penuh
          </span>
        );
      case 'DITOLAK_RT':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 text-xs font-bold rounded-full transition-all">
            <AlertOctagon className="w-3.5 h-3.5 text-rose-500" />
            Ditolak Admin RT
          </span>
        );
      case 'DITOLAK_KEPALA':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 text-xs font-bold rounded-full transition-all">
            <AlertOctagon className="w-3.5 h-3.5 text-rose-500" />
            Ditolak Kepala RT
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 bg-slate-100 text-slate-700 text-xs font-bold rounded-full">
            {status}
          </span>
        );
    }
  };

  // Convert MySQL-like DATE string from standard ISO
  const formatDateString = (rawDate: string) => {
    try {
      const parts = rawDate.split('T')[0].split('-');
      if (parts.length === 3) {
        // Return DD-MM-YYYY format
        return `${parts[2]}/${parts[1]}/${parts[0]}`;
      }
      return rawDate;
    } catch (e) {
      return rawDate;
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className="space-y-6 max-w-5xl mx-auto" 
      id="user-booking-history"
    >
      <div className="flex justify-between items-center bg-white p-4 border border-slate-100 rounded-2xl shadow-sm">
        <div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-2">
            <Activity className="w-6 h-6 text-indigo-600" />
            Riwayat Peminjaman Ruangan
          </h2>
          <p className="text-sm text-slate-500 mt-0.5">Pantau terus status permohonan peminjaman prasarana UniRoom Anda.</p>
        </div>
        <button
          onClick={loadBookings}
          className="p-2 text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 border border-slate-200 hover:border-indigo-100 rounded-xl transition-all cursor-pointer"
          title="Refresh Data"
          id="btn-refresh-history"
        >
          <RotateCcw className="w-4.5 h-4.5" />
        </button>
      </div>

      {loading ? (
        <div className="text-center py-16" id="history-loading-spinner">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-indigo-600 border-t-transparent mb-2"></div>
          <p className="text-sm text-slate-500">Membaca arsip data peminjaman...</p>
        </div>
      ) : bookings.length === 0 ? (
        <div className="border border-slate-200 bg-slate-50 rounded-2xl p-12 text-center text-slate-500 max-w-md mx-auto space-y-3.5" id="no-history-banner">
          <ClipboardList className="w-8 h-8 text-slate-400 mx-auto" />
          <div>
            <span className="font-extrabold text-sm text-slate-800 block mb-1">Belum Ada Reservasi Aktif</span>  
            <p className="text-xs text-slate-500 leading-relaxed">Anda belum pernah mengajukan peminjaman ruangan. Silakan kunjungi tab <strong className="text-indigo-600">Cari Ruang</strong> untuk memulai permohonan pertama Anda!</p>
          </div>
        </div>
      ) : (
        <div className="space-y-4" id="history-cards-group">
          {bookings.slice(0, limit).map(booking => (
            <div
              key={booking.id}
              className={`bg-white border rounded-2xl shadow-sm p-5 transition-all duration-150- ${
                booking.status === 'DISETUJUI'
                  ? 'border-emerald-100 hover:border-emerald-200'
                  : booking.status.startsWith('DITOLAK')
                  ? 'border-rose-100 hover:border-rose-200 bg-rose-50/5'
                  : 'border-slate-100 hover:border-slate-200'
              }`}
              id={`history-card-${booking.id}`}
            >
              <div className="flex flex-col lg:flex-row lg:justify-between lg:items-start gap-4">
                <div className="space-y-3.5 flex-grow">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="py-0.5 px-2 bg-indigo-50 text-indigo-700 border border-indigo-100 font-mono text-xs font-bold rounded">
                      Ref #{booking.id}
                    </span>
                    {getStatusBadge(booking.status)}
                  </div>

                  <div className="space-y-1">
                    <h3 className="font-extrabold text-slate-800 text-lg leading-tight flex items-center gap-1.5">
                      <Building2 className="w-4.5 h-4.5 text-slate-400 flex-shrink-0" />
                      {booking.ruang?.nama || `Ruangan ${booking.ruangId}`}
                    </h3>
                    <p className="text-xs text-slate-400 font-semibold font-sans">
                      {booking.ruang?.gedung?.nama || 'Universitas Muhammadiyah Semarang'} • Lantai {booking.ruang?.lantai}
                    </p>
                  </div>

                  {/* Scheduled DateTime */}
                  <div className="flex flex-wrap gap-4 text-xs font-medium text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-100/60 w-fit">
                    <div className="flex items-center gap-1 text-slate-800">
                      <Calendar className="w-4 h-4 text-indigo-500" />
                      <span>{formatDateString(booking.tanggal)}</span>
                    </div>
                    <div className="flex items-center gap-1 text-slate-800">
                      <Clock className="w-4 h-4 text-indigo-500" />
                      <span>{booking.waktuMulai} - {booking.waktuSelesai} WIB</span>
                    </div>
                  </div>

                  <div className="text-xs text-slate-600 leading-relaxed font-sans bg-slate-50/50 p-3 rounded-xl border border-slate-100/40">
                    <span className="font-bold block text-slate-400 uppercase text-[9px] tracking-wider mb-1">Tujuan Keperluan</span>
                    {booking.keperluan}
                  </div>

                  {/* Catatan Penolakan */}
                  {booking.catatanPenolakan && (
                    <div className="p-3 bg-rose-50 rounded-xl border border-rose-100 text-rose-800 text-xs leading-relaxed space-y-0.5" id={`refuse-info-${booking.id}`}>
                      <span className="font-extrabold block text-[10px] text-rose-500 uppercase tracking-wider">Catatan Alasan Penolakan:</span>
                      <p className="italic">"{booking.catatanPenolakan}"</p>
                    </div>
                  )}

                  {/* Cetak Surat Disposisi */}
                  {booking.status === 'DISETUJUI' && (
                    <button
                      onClick={() => setSelectedDisposisi(booking)}
                      className="px-4 py-2.5 bg-[#dcfce7] hover:bg-[#bbf7d0] text-emerald-800 border border-emerald-250 font-extrabold text-[11px] rounded-xl transition-all cursor-pointer flex items-center gap-1.5 shadow-xs mt-2"
                      id={`btn-disposisi-letter-${booking.id}`}
                    >
                      <FileText className="w-3.5 h-3.5 text-emerald-600" />
                      Cetak Surat Disposisi (Izin Pemakaian)
                    </button>
                  )}
                </div>

                {/* Reservation date created timestamp */}
                <div className="text-[10px] text-slate-400 font-mono text-left lg:text-right shrink-0">
                  Diajukan pada:<br />
                  {new Date(booking.createdAt).toLocaleString('id-ID')}
                </div>
              </div>
            </div>
          ))}

          {bookings.length > limit && (
            <div className="flex justify-center pt-3">
              <button
                onClick={() => setLimit(prev => prev + 5)}
                className="px-5 py-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs rounded-xl transition-colors border border-indigo-200/50 cursor-pointer flex items-center gap-2 shadow-sm"
              >
                Tampilkan Lebih Banyak Riwayat ({bookings.length - limit} Riwayat Lagi)
              </button>
            </div>
          )}
        </div>
      )}

      {/* Surat Disposisi Modal Overlay wrapper */}
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
