import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { NextRequest } from 'next/server';
import { prisma } from './database';
import logger from './logger';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

export interface JWTPayload {
  userId: string;
  email?: string;
  phone?: string;
  registrationId?: string;
  role: string;
}

export function generateToken(payload: JWTPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '24h' });
}

export function verifyToken(token: string): JWTPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as JWTPayload;
  } catch (error) {
    logger.error('Token verification failed', error instanceof Error ? error : new Error(String(error)), {
      action: 'TOKEN_VERIFICATION',
      metadata: { tokenLength: token.length }
    });
    return null;
  }
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function comparePassword(password: string, hashedPassword: string): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword);
}

export async function getTokenFromRequest(request: NextRequest): Promise<string | null> {
  const authHeader = request.headers.get('authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }
  
  // Also check cookies
  const token = request.cookies.get('auth-token')?.value;
  return token || null;
}

export async function authenticateRequest(request: NextRequest) {
  const token = await getTokenFromRequest(request);
  
  if (!token) {
    logger.error('Authentication failed - No token provided', new Error('No authentication token provided'), {
      action: 'AUTHENTICATION',
      ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown'
    });
    return null;
  }
  
  const payload = verifyToken(token);
  if (!payload) {
    logger.error('Authentication failed - Invalid token', new Error('Invalid authentication token'), {
      action: 'AUTHENTICATION',
      ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown'
    });
    return null;
  }
  
  try {
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: {
        id: true,
        registrationId: true,
        email: true,
        phone: true,
        firstName: true,
        lastName: true,
        role: true,
        isActive: true,
      },
    });
    
    if (!user) {
      logger.error('Authentication failed - User not found', new Error('User not found in database'), {
        action: 'AUTHENTICATION',
        userId: payload.userId,
        ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown'
      });
      return null;
    }
    
    if (!user.isActive) {
      logger.error('Authentication failed - User inactive', new Error('User account is inactive'), {
        action: 'AUTHENTICATION',
        userId: user.id,
        registrationId: user.registrationId,
        ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown'
      });
      return null;
    }
    
    return user;
  } catch (error) {
    logger.error('Authentication failed - Database error', error instanceof Error ? error : new Error(String(error)), {
      action: 'AUTHENTICATION',
      userId: payload.userId,
      ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown'
    });
    return null;
  }
}

export async function requireAuth(request: NextRequest, requiredRole?: string) {
  const user = await authenticateRequest(request);
  
  if (!user) {
    logger.error('Authentication required but not provided', new Error('Authentication required'), {
      action: 'AUTHENTICATION_REQUIRED',
      ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown'
    });
    throw new Error('Authentication required');
  }
  
  if (requiredRole && user.role !== requiredRole) {
    logger.error('Insufficient permissions', new Error('Insufficient permissions'), {
      action: 'INSUFFICIENT_PERMISSIONS',
      userId: user.id,
      registrationId: user.registrationId,
      requiredRole,
      userRole: user.role,
      ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown'
    });
    throw new Error('Insufficient permissions');
  }
  
  return user;
}