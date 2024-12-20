import { PrismaClient } from '@prisma/client';

// Define a type for globalThis to include Prisma instance
declare global {
  const prisma: PrismaClient | undefined;
}

const globalForPrisma = globalThis as typeof globalThis & { prisma?: PrismaClient };

const prisma = new PrismaClient({
  transactionOptions: {
    maxWait: 10000,
    timeout: 20000,
  },
  log: [
    {
      emit: 'event',
      level: 'query',
    },
  ],
});

if (process.env.NODE_ENV === 'development') {
  globalForPrisma.prisma = prisma;
}

prisma.$on('query', (e) => {
  console.log('[QUERY]', e.query);
  console.log('[PARAM]', e.params, '\t', 'TIME:', e.duration + 'ms');
  console.log('----------');
});

process.on('beforeExit', async () => {
  console.log('Connection released.....');
  await prisma.$disconnect();
});

// Export prisma instance for use in other parts of the application
export { prisma };
