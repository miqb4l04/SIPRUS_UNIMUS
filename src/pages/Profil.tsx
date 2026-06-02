import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { 
  User, Mail, Shield, LogOut, Check, AlertCircle, RefreshCw, Key, Info, ChevronRight, Lock
} from 'lucide-react';
import { motion } from 'motion/react';

export default function Profil() {
  const { user, logout, } = useAuth();
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  if (!user) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) {
      setError('Nama dan Email tidak boleh kosong.');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');
    try {
      await (name.trim(), email.trim());
      setSuccess('Profil Anda berhasil diperbarui!');
    } catch (err: any) {
      setError(err.message || 'Gagal memperbarui profil.');
    } finally {
      setLoading(false);
    }
  };

  const isGuest = user.role === 'GUEST';

  // Extract initials for the avatar
  const getInitials = (fullName: string) => {
    return fullName
      .split(' ')
      .map((n) => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
      className="max-w-4xl mx-auto space-y-8" 
      id="profile-page-root"
    >
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight font-sans">
            Pengaturan Akun
          </h2>
          <p className="text-xs text-slate-500 mt-1 font-medium">
            Kelola data personal dan verifikasi kredensial sistem prasarana Anda.
          </p>
        </div>

        <button
          onClick={logout}
          className="py-2 px-4 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition-all flex items-center gap-2 cursor-pointer shadow-sm active:scale-95 border-none"
        >
          <LogOut className="w-3.5 h-3.5 text-slate-300" />
          Keluar Sesi
        </button>
      </div>

      {/* Main Beautiful Bento Card Layout */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
        
        {/* Left Column: Subtle Avatar Card */}
        <div className="md:col-span-4 bg-white border border-slate-200/60 rounded-3xl p-6 shadow-[0_4px_30px_rgba(0,0,0,0.015)] flex flex-col items-center text-center space-y-5">
          {/* Circular Minimal Initials Badge */}
          <div className="relative group">
            <div className={`w-20 h-20 rounded-full flex items-center justify-center font-black text-xl tracking-wider shadow-inner transition-transform duration-300 group-hover:scale-105 select-none ${
              isGuest 
                ? 'bg-amber-50 text-amber-600 border border-amber-200/50' 
                : 'bg-indigo-50 text-indigo-700 border border-indigo-100'
            }`}>
              {getInitials(user.name)}
            </div>
            {/* Status dot indicator */}
            <span className="absolute bottom-0 right-1 w-5 h-5 bg-emerald-500 border-4 border-white rounded-full" title="Online" />
          </div>

          <div className="space-y-1 w-full">
            <h3 className="font-bold text-slate-850 text-md truncate font-sans px-2">
              {user.name}
            </h3>
            <p className="text-xs text-slate-400 font-mono truncate px-2">
              {user.email}
            </p>
          </div>

          {/* Role badge */}
          <div className="w-full pt-1">
            <span className={`inline-flex px-3 py-1 items-center gap-1.5 rounded-full text-[9px] font-black tracking-wider uppercase font-mono border ${
              user.role === 'ADMIN_RT' ? 'bg-amber-50 text-amber-800 border-amber-200' :
              user.role === 'KEPALA_RT' ? 'bg-fuchsia-50/70 text-fuchsia-800 border-fuchsia-250' :
              user.role === 'MAHASISWA' ? 'bg-indigo-50 text-indigo-800 border-indigo-200/80' :
              'bg-slate-50 text-slate-650 border-slate-200'
            }`}>
              {isGuest ? '🛡️ TAMU / GUEST' : `👥 ${user.role.replace('_', ' ')}`}
            </span>
          </div>

          {/* Core metadata stats */}
          <div className="w-full bg-slate-50/70 rounded-2xl p-4 text-[11px] space-y-2.5 text-slate-500 font-medium border border-slate-100">
            <div className="flex justify-between items-center">
              <span className="text-slate-400">ID Pengenal</span>
              <span className="font-mono font-bold text-slate-700">#{user.id}</span>
            </div>
            <hr className="border-slate-200/50 my-1" />
            <div className="flex justify-between items-center">
              <span className="text-slate-400">Kredensial Sesi</span>
              <span className="font-bold text-slate-700">{isGuest ? 'Publik' : 'Terverikasi Kampus'}</span>
            </div>
          </div>
        </div>

        {/* Right Column: Beautiful Input Panel */}
        <div className="md:col-span-8 bg-white border border-slate-200/60 rounded-3xl p-6 md:p-8 shadow-[0_4px_30px_rgba(0,0,0,0.015)] space-y-6">
          <div className="border-b border-slate-100 pb-4 flex items-center justify-between">
            <h4 className="text-sm font-extrabold text-slate-800 uppercase tracking-widest font-sans flex items-center gap-2">
              <Shield className="w-4 h-4 text-indigo-600" />
              {isGuest ? 'HAK AKSES PENINJAU' : 'INFORMASI DETIL PROFIL'}
            </h4>
          </div>

          {/* Custom alert notification toasts */}
          {error && (
            <motion.div 
              initial={{ opacity: 0, y: -5 }} 
              animate={{ opacity: 1, y: 0 }}
              className="p-4 bg-rose-50/80 border border-rose-200/60 rounded-2xl text-rose-700 text-xs flex gap-3 items-center"
            >
              <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
              <span className="font-semibold">{error}</span>
            </motion.div>
          )}

          {success && (
            <motion.div 
              initial={{ opacity: 0, y: -5 }} 
              animate={{ opacity: 1, y: 0 }}
              className="p-4 bg-emerald-50/80 border border-emerald-250 rounded-2xl text-emerald-800 text-xs flex gap-3 items-center"
            >
              <Check className="w-4 h-4 text-emerald-600 shrink-0" />
              <span className="font-semibold">{success}</span>
            </motion.div>
          )}

          {isGuest ? (
            /* Elegant Guest Info layout */
            <div className="space-y-5" id="guest-card-info">
              <div className="p-4 bg-amber-50 border border-amber-200/65 rounded-2xl flex gap-3">
                <Info className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <h4 className="text-xs font-bold text-amber-900 font-sans">Sesi GUEST Terdeteksi</h4>
                  <p className="text-[11px] text-amber-800 font-medium leading-relaxed">
                    Anda saat ini melihat sistem SIPRUS UNIMUS menggunakan mode tamu. Anda diproteksi dari memodifikasi data dan hanya diperkenankan mencari status ruang.
                  </p>
                </div>
              </div>

              <div className="bg-slate-50 border border-slate-150 rounded-3xl p-5 space-y-4">
                <span className="text-xs font-bold text-slate-700 block uppercase tracking-wider">
                  Akses Fitur yang Tersedia untuk Anda:
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div className="p-3 bg-white border border-slate-200/60 rounded-xl space-y-1">
                    <span className="font-bold text-slate-800 text-xs block">Grafik Real-time</span>
                    <p className="text-[10px] text-slate-500 font-medium font-sans">Visualisasi peminjaman terintegrasi.</p>
                  </div>
                  <div className="p-3 bg-white border border-slate-200/60 rounded-xl space-y-1">
                    <span className="font-bold text-slate-800 text-xs block">Pencarian Fleksibel</span>
                    <p className="text-[10px] text-slate-500 font-medium">Berdasarkan tanggal, lantai, kapasitas.</p>
                  </div>
                </div>
              </div>

              <div className="pt-2">
                <button
                  onClick={logout}
                  className="w-full py-3 px-4 bg-indigo-600 hover:bg-slate-900 text-white font-bold text-xs rounded-2xl transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-md shadow-indigo-100 hover:shadow-indigo-200 border-none"
                >
                  <Key className="w-4 h-4" />
                  Masuk Sesi dengan Akun Biro/Mahasiswa Resmi
                </button>
              </div>
            </div>
          ) : (
            /* Elegant edit profile form for normal users */
            <form onSubmit={handleSubmit} className="space-y-5">
              
              {/* Name Field */}
              <div className="space-y-1.5">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest font-mono">
                  Nama Lengkap Pemohon
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                    <User className="w-4 h-4" />
                  </span>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    placeholder="Masukkan nama lengkap Anda"
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 hover:bg-slate-100/50 focus:bg-white border border-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 rounded-2xl text-slate-800 text-xs focus:outline-none transition-all font-semibold font-sans"
                  />
                </div>
              </div>

              {/* Email Field */}
              <div className="space-y-1.5">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest font-mono">
                  Alamat Surat Elektronik (Email)
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                    <Mail className="w-4 h-4" />
                  </span>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    placeholder="email@unimus.ac.id"
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 hover:bg-slate-100/50 focus:bg-white border border-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 rounded-2xl text-slate-800 text-xs focus:outline-none transition-all font-semibold"
                  />
                </div>
              </div>

              {/* Security info strip banner */}
              <div className="p-4 bg-indigo-50/40 border border-indigo-100 rounded-2xl flex gap-3 text-indigo-900 text-[11px] leading-relaxed font-semibold">
                <Lock className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                <p>
                  Sistem database SIPRUS melacak riwayat perubahan profil Anda. Keamanan sandi / password terikat akun Single Sign On (SSO) UNIMUS. Hubungi pihak BAUK untuk pergantian krusial.
                </p>
              </div>

              {/* Action Trigger Buttons */}
              <div className="pt-3 flex justify-end">
                <button
                  type="submit"
                  disabled={loading}
                  className="px-6 py-3 bg-indigo-650 hover:bg-indigo-600 active:bg-indigo-750 text-white rounded-2xl text-xs font-bold transition-all shadow-md shadow-indigo-150 flex items-center gap-2 cursor-pointer disabled:opacity-50 border-none"
                >
                  {loading ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Menyimpan...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Simpan Perubahan</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </motion.div>
  );
}
