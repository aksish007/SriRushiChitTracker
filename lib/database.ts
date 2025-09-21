import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

// Helper function to generate Registration ID in SRC-00000001 format
export async function generateRegistrationId(): Promise<string> {
  // Find the highest existing registration ID
  const existingUsers = await prisma.user.findMany({
    where: {
      registrationId: {
        startsWith: 'SRC-'
      }
    },
    select: {
      registrationId: true
    },
    orderBy: {
      registrationId: 'desc'
    }
  });

  // Extract numbers from existing registration IDs
  const existingNumbers = existingUsers
    .map(user => {
      const match = user.registrationId.match(/^SRC-(\d+)$/);
      return match ? parseInt(match[1]) : 0;
    })
    .filter(num => num > 0);

  // Find the next available number
  const nextNumber = existingNumbers.length > 0 ? Math.max(...existingNumbers) + 1 : 1;
  
  return `SRC-${nextNumber.toString().padStart(5, '0')}`;
}

// Helper function to generate Subscriber ID in the new SRC format
export async function generateSubscriberId(chitId: string): Promise<string> {
  // Get the next available subscriber number for this chit scheme
  return generateSubscriberIdWithNumber(chitId);
}

// Helper function to generate Subscriber ID with a specific number
export async function generateSubscriberIdWithNumber(chitId: string, subscriberNumber?: number): Promise<string> {
  if (subscriberNumber) {
    // Use the provided subscriber number
    return `${chitId}/${subscriberNumber.toString().padStart(2, '0')}`;
  }

  // Find the highest subscriber number for this chit scheme
  const existingSubscriptions = await prisma.chitSubscription.findMany({
    where: {
      chitScheme: {
        chitId: chitId
      }
    },
    select: {
      subscriberId: true
    }
  });

  // Extract numbers from existing subscriber IDs
  const existingNumbers = existingSubscriptions
    .map(sub => {
      const match = sub.subscriberId.match(/\/(\d+)$/);
      return match ? parseInt(match[1]) : 0;
    })
    .filter(num => num > 0);

  // Find the next available number
  const nextNumber = existingNumbers.length > 0 ? Math.max(...existingNumbers) + 1 : 1;
  
  return `${chitId}/${nextNumber.toString().padStart(2, '0')}`;
}

// Helper function to validate subscriber ID format
export function validateSubscriberIdFormat(subscriberId: string): boolean {
  // Format: SRC{XX}{YY}/{ZZ}
  // Where XX = 2-digit number, YY = 2-3 letter code, ZZ = 2-digit number
  const pattern = /^SRC\d{2}[A-Z]{2,3}\/\d{2}$/;
  return pattern.test(subscriberId);
}

// Helper function to extract chit ID from subscriber ID
export function extractChitIdFromSubscriberId(subscriberId: string): string | null {
  const match = subscriberId.match(/^(SRC\d{2}[A-Z]{2,3})\/\d{2}$/);
  return match ? match[1] : null;
}

// Helper function to extract subscriber number from subscriber ID
export function extractSubscriberNumberFromSubscriberId(subscriberId: string): number | null {
  const match = subscriberId.match(/\/\d{2}$/);
  return match ? parseInt(match[0].substring(1)) : null;
}