// Constants for user roles, subscription status, and payout status
// These replace the enums that were removed from the Prisma schema for SQLite compatibility

export const USER_ROLES = {
  ADMIN: 'ADMIN',
  USER: 'USER',
} as const;

export const SUBSCRIPTION_STATUS = {
  ACTIVE: 'ACTIVE',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED',
} as const;

export const PAYOUT_STATUS = {
  PENDING: 'PENDING',
  PAID: 'PAID',
  CANCELLED: 'CANCELLED',
} as const;

export type UserRole = typeof USER_ROLES[keyof typeof USER_ROLES];
export type SubscriptionStatus = typeof SUBSCRIPTION_STATUS[keyof typeof SUBSCRIPTION_STATUS];
export type PayoutStatus = typeof PAYOUT_STATUS[keyof typeof PAYOUT_STATUS];
