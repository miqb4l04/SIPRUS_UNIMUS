import dotenv from 'dotenv';
dotenv.config(); // Wajib di paling atas

import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("❌ ERROR CRITICAL: DATABASE_URL tidak ditemukan di file .env");
  process.exit(1);
}

const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);

// Export prisma agar bisa digunakan di file lain
export const prisma = new PrismaClient({ adapter });
// Export pool untuk di-cek saat server menyala
export const dbPool = pool;