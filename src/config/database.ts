// config/database.ts
import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// Log the database URL (without password) for debugging
const dbUrl = process.env.DATABASE_URL;
if (dbUrl) {
  if (dbUrl) {
  // Pakai regex/manual parse kalau memang butuh debug
  const host = dbUrl.split('@')[1]?.split('/')[0];
  const database = dbUrl.split('/').pop();
  console.log('🔗 Database connection:', {
    host,
    database,
    isInternal: host?.includes('railway.internal')
  });
}

} else {
  console.error('❌ DATABASE_URL not found in environment variables');
}

const prisma = globalForPrisma.prisma ?? new PrismaClient({
  log: ['query', 'error', 'warn', 'info'],
});

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

// Test connection on startup
prisma.$connect()
  .then(() => {
    console.log('✅ Database connected successfully');
  })
  .catch((error) => {
    console.error('❌ Database connection failed:', error);
  });

export default prisma;