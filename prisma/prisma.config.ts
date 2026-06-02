import { defineConfig } from 'prisma/config';

export default defineConfig({
  // Kasih tahu Prisma lokasi file schema-nya
  schema: 'prisma/schema.prisma', 
  datasource: {
    // Kita tempelkan URL database-nya SECARA LANGSUNG di sini. 
    // Dengan begini, Prisma tidak punya alasan lagi untuk gagal membacanya!
    url: "postgresql://postgres:Iqbal300404@localhost:5432/siprus_db?schema=public"
  }
});