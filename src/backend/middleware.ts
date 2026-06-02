import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { Role } from '@prisma/client';
import { prisma } from './db';

const JWT_SECRET = process.env.JWT_SECRET || 'unimus-super-secret-key-2026';

export interface AuthRequest extends Request {
  user?: { id: number; email: string; name: string; role: Role };
}

export async function verifyToken(req: AuthRequest, res: Response, next: NextFunction): Promise<any> {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token tidak ditemukan atau format salah' });
  }

  // AMAN: Ambil token dan bersihkan paksa dari semua jenis tanda kutip
  let token = authHeader.split(' ')[1];
  token = token.replace(/['"]+/g, '');
  
  // Bypass untuk pengunjung umum (Guest)
  if (token === 'guest-token-session') {
    req.user = { id: 0, email: 'guest@unimus.ac.id', name: 'Pengunjung Umum', role: 'GUEST' };
    return next();
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { id: number; email: string; role: Role };
    
    try {
      const user = await prisma.user.findUnique({ where: { id: decoded.id } });
      if (!user) return res.status(401).json({ error: 'Pengguna tidak terdaftar di database' });
      
      req.user = { id: user.id, email: user.email, name: user.name, role: user.role };
      next();
    } catch (dbError) {
      // PERBAIKAN: Pisahkan error Database dengan error Token!
      console.error("Database gagal merespons saat verifikasi:", dbError);
      return res.status(500).json({ error: 'Koneksi database bermasalah' });
    }
    
  } catch (err) {
    console.warn("Token tidak valid / expired ditolak server.");
    return res.status(401).json({ error: 'Sesi kedaluwarsa atau token tidak valid' });
  }
}

export function authorize(...roles: Role[]) {
  return (req: AuthRequest, res: Response, next: NextFunction): any => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Hak akses ditolak' });
    }
    next();
  };
}