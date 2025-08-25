import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

// Helper function to generate Registration ID
export function generateRegistrationId(): string {
  const timestamp = Date.now().toString();
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `REG-${timestamp.slice(-6)}${random}`;
}

// Helper function to generate Subscriber ID
export function generateSubscriberId(chitId: string): string {
  const timestamp = Date.now().toString();
  const random = Math.floor(Math.random() * 100).toString().padStart(2, '0');
  return `SUB-${chitId}-${timestamp.slice(-3)}${random}`;
}