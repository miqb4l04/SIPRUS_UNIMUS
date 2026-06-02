import React, { useState, useEffect, useRef } from 'react';
import { Bell, Check, CheckCircle2, Info, XCircle } from 'lucide-react';
// @ts-ignore
import { api } from '../services/api';

// Definisi tipe data notifikasi
interface Notification {
  id: number;
  pesan: string;
  dibaca: boolean;
  createdAt: string;
}

export default function NotificationBell() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Mengambil notifikasi dari backend
  const fetchNotifications = async () => {
    try {
      const data = await api.get('/notifications');
      if (Array.isArray(data)) {
        setNotifications(data);
      } else {
        setNotifications([]);
      }
    } catch (error) {
      console.warn("Gagal mengambil notifikasi.");
      setNotifications([]);
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const unreadCount = notifications.filter(n => !n.dibaca).length;

  // Fungsi tandai satu pesan sudah dibaca
  const markAsRead = async (id: number) => {
    try {
      await api.put(`/notifications/${id}/read`, {});
      setNotifications(notifications.map(n => n.id === id ? { ...n, dibaca: true } : n));
    } catch (error) { 
      console.error("Gagal menandai dibaca:", error); 
    }
  };

  // Fungsi tandai semua sudah dibaca
  const markAllAsRead = async () => {
    try {
      await api.put('/notifications/read-all', {});
      setNotifications(notifications.map(n => ({ ...n, dibaca: true })));
    } catch (error) { 
      console.error("Gagal menandai semua dibaca:", error); 
    }
  };

  const getIcon = (pesan: string) => {
    const pesanUpper = pesan.toUpperCase();
    if (pesanUpper.includes('DISETUJUI') || pesanUpper.includes('SELAMAT')) return <CheckCircle2 className="w-5 h-5 text-emerald-500 mt-1 flex-shrink-0" />;
    if (pesanUpper.includes('DITOLAK')) return <XCircle className="w-5 h-5 text-rose-500 mt-1 flex-shrink-0" />;
    return <Info className="w-5 h-5 text-indigo-500 mt-1 flex-shrink-0" />;
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button 
        onClick={() => { setIsOpen(!isOpen); if(!isOpen) fetchNotifications(); }}
        className="relative p-2.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-full transition-all duration-200 focus:outline-none cursor-pointer"
      >
        <Bell className="w-6 h-6" />
        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[9px] font-bold text-white ring-2 ring-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Notifikasi dengan Animasi Standar CSS */}
      <div 
        className={`absolute right-0 mt-3 w-80 sm:w-96 bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden z-50 origin-top-right transition-all duration-200 ${
          isOpen ? 'opacity-100 scale-100 visible' : 'opacity-0 scale-95 invisible pointer-events-none'
        }`}
      >
        <div className="p-4 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
          <h3 className="font-bold text-slate-800 flex items-center gap-2">
            <Bell className="w-4 h-4 text-indigo-500" /> Notifikasi
          </h3>
          {unreadCount > 0 && (
            <button 
              onClick={markAllAsRead}
              className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer border-none bg-transparent"
            >
              <Check className="w-3 h-3" /> Tandai Semua Dibaca
            </button>
          )}
        </div>

        <div className="max-h-96 overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="p-8 text-center text-slate-400">
              <Bell className="w-8 h-8 mx-auto mb-2 opacity-20" />
              <p className="text-xs font-semibold">Belum ada notifikasi</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-50">
              {notifications.map(notif => (
                <div 
                  key={notif.id} 
                  onClick={() => !notif.dibaca && markAsRead(notif.id)}
                  className={`p-4 flex gap-3 transition-colors ${notif.dibaca ? 'opacity-60 cursor-default' : 'bg-indigo-50/30 hover:bg-slate-50 cursor-pointer'}`}
                >
                  {getIcon(notif.pesan)}
                  <div className="space-y-1">
                    <p className={`text-xs leading-relaxed ${notif.dibaca ? 'text-slate-600' : 'text-slate-800 font-bold'}`}>
                      {notif.pesan}
                    </p>
                    <p className="text-[9px] text-slate-400 font-mono">
                      {new Date(notif.createdAt).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })}
                    </p>
                  </div>
                  {!notif.dibaca && <div className="w-2 h-2 rounded-full bg-indigo-500 mt-2 flex-shrink-0" />}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}