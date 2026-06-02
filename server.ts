import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { createServer as createViteServer } from 'vite';

// Pastikan urutannya: Panggil dotenv config DULUAN sebelum import file lain yang butuh DB
dotenv.config();

// Import routes (diambil dari folder src/backend/ yang baru)
import apiRoutes from './src/backend/routes';

const app = express();

// Gunakan Number() untuk memastikan tipe datanya angka
// Tambahkan fallback ke 3001 jika 3000 bermasalah
const PORT = Number(process.env.PORT) || 3001;  

// --- MIDDLEWARES GLOBAL ---
app.use(cors({
    origin: ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:3000', 'http://localhost:3001'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

app.use(express.json({ limit: '10mb' }));  
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Middleware untuk logging (membantu debugging)
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// --- ROUTES ---
// Daftarkan semua route API di bawah awalan /api
app.use('/api', apiRoutes);

// Handle 404 untuk route yang tidak ditemukan (PERBAIKAN UTAMA LOADING LAMA)
app.use('*', (req, res, next) => {
    if (req.path.startsWith('/api')) {
        res.status(404).json({ error: `Endpoint ${req.path} tidak ditemukan` });
    } else {
        // SANGAT PENTING: Jika bukan /api, teruskan ke middleware Vite!
        // Tanpa next(), request frontend akan nge-hang / loading terus.
        next(); 
    }
});

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error('🔥 Server Error:', err);
    res.status(err.status || 500).json({
        error: err.message || 'Terjadi kesalahan pada server',
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    });
});

// --- VITE WEB ENGINE INTEGRATION (Untuk menjalankan React dan Express di 1 port) ---
async function startServer() {
    try {
        if (process.env.NODE_ENV !== "production") {
            // Mode Development: Gabung Vite dan Express
            console.log('🔧 Menjalankan dalam mode DEVELOPMENT...');
            const vite = await createViteServer({ 
                server: { 
                    middlewareMode: true,
                    // Tambahkan konfigurasi untuk menghindari ENOBUFS
                    hmr: {
                        port: PORT + 1,  // HMR di port berbeda agar tidak bentrok
                    }
                }, 
                appType: "spa" 
            });
            app.use(vite.middlewares);
        } else {
            // Mode Production: Sajikan file statis React hasil build
            console.log('🚀 Menjalankan dalam mode PRODUCTION...');
            const distPath = path.join(process.cwd(), 'dist');
            app.use(express.static(distPath));
            app.get('*', (req: express.Request, res: express.Response) => {
                // Jangan override route API
                if (!req.path.startsWith('/api')) {
                    res.sendFile(path.join(distPath, 'index.html'));
                }
            });
        }
        
        // Gunakan host '0.0.0.0' agar bisa diakses dari network, atau fallback localhost
        const host = process.env.HOST || 'localhost';
        
        app.listen(PORT, host, () => {
            console.log(`=================================`);
            console.log(`🚀 UniRoom Server berjalan mulus!`);
            console.log(`📍 Host: ${host}`);
            console.log(`📍 Port: ${PORT}`);
            console.log(`📍 URL: http://${host}:${PORT}`);
            console.log(`📍 API: http://${host}:${PORT}/api`);
            console.log(`📍 Health: http://${host}:${PORT}/health`);
            console.log(`=================================`);
        }).on('error', (err: any) => {
            // Handle error port sudah dipakai
            if (err.code === 'EADDRINUSE') {
                console.error(`❌ Port ${PORT} sudah digunakan!`);
                console.log(`💡 Solusi: Ganti PORT di file .env atau hentikan proses yang menggunakan port ${PORT}`);
                process.exit(1);
            } else {
                console.error('❌ Server error:', err);
            }
        });
        
    } catch (error) {
        console.error('❌ Gagal menjalankan server:', error);
        process.exit(1);
    }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
    console.log('\n🛑 Server dimatikan...');
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log('\n🛑 Server dimatikan...');
    process.exit(0);
});

startServer();