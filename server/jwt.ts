import jwt from 'jsonwebtoken';
import { User } from '../shared/schema';

// Use environment variables for secrets in production
// Fall back to development keys only for local development
const JWT_SECRET = process.env.JWT_SECRET || 'noteshub-jwt-secret-key';
const ACCESS_TOKEN_EXPIRES = '15m'; // 15 minutes 
const REFRESH_TOKEN_EXPIRES = '7d'; // 7 days

interface JWTPayload {
  userId: number;
  usn: string;
  email: string;
  tokenType: 'access' | 'refresh';
}

/**
 * Generate an access token for authentication
 */
export function generateAccessToken(user: User): string {
  const payload: JWTPayload = {
    userId: user.id,
    usn: user.usn,
    email: user.email,
    tokenType: 'access'
  };
  
  return jwt.sign(payload, JWT_SECRET, { expiresIn: ACCESS_TOKEN_EXPIRES });
}

/**
 * Generate a refresh token for getting new access tokens
 */
export function generateRefreshToken(user: User): string {
  const payload: JWTPayload = {
    userId: user.id,
    usn: user.usn,
    email: user.email,
    tokenType: 'refresh'
  };
  
  return jwt.sign(payload, JWT_SECRET, { expiresIn: REFRESH_TOKEN_EXPIRES });
}

/**
 * Verify and decode a JWT token
 */
export function verifyToken(token: string): JWTPayload | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JWTPayload;
    return decoded;
  } catch (error) {
    console.error('Token verification failed:', error);
    return null;
  }
}

/**
 * Extract token from Authorization header
 */
export function extractToken(authHeader: string | undefined): string | null {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  
  return authHeader.substring(7); // Remove 'Bearer ' prefix
}