import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export const registerUserSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  phone: z.string().min(10, 'Phone number must be at least 10 digits'),
  address: z.string().optional(),
  referredBy: z.string().optional(),
});

export const chitSchemeSchema = z.object({
  chitId: z.string().min(1, 'Chit ID is required'),
  name: z.string().min(1, 'Chit name is required'),
  amount: z.number().positive('Amount must be positive'),
  duration: z.number().positive('Duration must be positive'),
  totalSlots: z.number().positive('Total slots must be positive'),
  description: z.string().optional(),
});

export const subscriptionSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
  chitSchemeId: z.string().min(1, 'Chit scheme ID is required'),
});

export const payoutSchema = z.object({
  subscriptionId: z.string().min(1, 'Subscription ID is required'),
  amount: z.number().positive('Amount must be positive'),
  month: z.number().min(1).max(12),
  year: z.number().min(2020),
});

export type LoginData = z.infer<typeof loginSchema>;
export type RegisterUserData = z.infer<typeof registerUserSchema>;
export type ChitSchemeData = z.infer<typeof chitSchemeSchema>;
export type SubscriptionData = z.infer<typeof subscriptionSchema>;
export type PayoutData = z.infer<typeof payoutSchema>;