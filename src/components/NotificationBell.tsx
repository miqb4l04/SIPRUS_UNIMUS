import React, { useState, useEffect, useRef } from 'react';
import { apiRequest } from '../services/api';
import { Notification } from '../types';
import { Bell, Check, Info } from 'lucide-react';

export default function NotificationBell() {
  const [notifs, setNotifs] = useState<Notification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const fetchNotifs = async () => {
    try {
      const data = await apiRequest<Notification[]>('/notifications');
      setNotifs(data);
    } catch (err) {
      console.error('Failed to load notifications', err);
    }
  };

  useEffect(() => {
    fetchNotifs();
    // Poll notifications every 8 seconds for a lively fast update feel
    const interval = setInterval(fetchNotifs, 8000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const unreadCount = notifs.filter(n => !n.isRead).length;

  const handleMarkAsRead = async (id: number) => {
    try {
      await apiRequest(`/notifications/${id}/read`, { method: 'PATCH' });
      setNotifs(prev =>
        prev.map(n => (n.id === id ? { ...n, isRead: true } : n))
      );
    } catch (err) {
      console.error(err);
    }
  };

  const handleMarkAllAsRead = async () => {
    const unread = notifs.filter(n => !n.isRead);
    for (const n of unread) {
      await handleMarkAsRead(n.id);
    }
  };

  return (
    <div className="relative inline-block" ref={containerRef} id="notif-wrapper">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-gray-600 hover:text-blue-600 transition-colors bg-gray-100 hover:bg-blue-50 rounded-full"
        id="btn-notif-bell"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center animate-bounce">
            {unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-3 w-80 md:w-96 bg-white border border-gray-200 rounded-xl shadow-2xl z-50 overflow-hidden" id="notif-popup">
          <div className="flex items-center justify-between px-4 py-3 bg-slate-50 border-b border-gray-100">
            <span className="font-semibold text-gray-800 text-sm">Notifikasi</span>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllAsRead}
                className="text-xs text-blue-600 hover:text-blue-800 font-medium cursor-pointer"
              >
                Tandai semua dibaca
              </button>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto divide-y divide-gray-100">
            {notifs.length === 0 ? (
              <div className="p-6 text-center text-gray-500 text-sm">
                Tidak ada notifikasi untuk Anda.
              </div>
            ) : (
              notifs.map(n => (
                <div
                  key={n.id}
                  className={`p-3.5 transition-colors ${
                    !n.isRead ? 'bg-blue-50/70 hover:bg-blue-50' : 'bg-white hover:bg-slate-50'
                  }`}
                >
                  <div className="flex gap-2.5 items-start">
                    <div className="mt-0.5">
                      <span className={`block p-1 rounded-full ${!n.isRead ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-500'}`}>
                        <Info className="w-3.5 h-3.5" />
                      </span>
                    </div>
                    <div className="flex-grow">
                      <p className="text-gray-700 text-xs leading-relaxed font-medium">
                        {n.message}
                      </p>
                      <div className="flex justify-between items-center mt-1.5">
                        <span className="text-[10px] text-gray-400 font-mono">
                          {new Date(n.createdAt).toLocaleTimeString('id-ID', {
                            hour: '2-digit',
                            minute: '2-digit',
                          }) + ' | ' + new Date(n.createdAt).toLocaleDateString('id-ID', {
                            day: 'numeric',
                            month: 'short',
                          })}
                        </span>
                        {!n.isRead && (
                          <button
                            onClick={() => handleMarkAsRead(n.id)}
                            className="text-[10px] text-emerald-600 font-semibold hover:underline flex items-center gap-0.5"
                          >
                            <Check className="w-3 h-3" /> Bacakan
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
