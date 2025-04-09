import { authenticator } from 'otplib';
import QRCode from 'qrcode';
import { User } from '../shared/schema';

// Configure otplib
authenticator.options = {
  window: 1, // Allow 1 step before and after for time sync issues
  digits: 6  // Default is 6 digits
};

/**
 * Generate a secret key for TOTP authentication
 */
export function generateSecret(): string {
  return authenticator.generateSecret();
}

/**
 * Generate a QR code for setting up 2FA in authenticator apps
 */
export async function generateQRCode(user: User, secret: string): Promise<string> {
  // Create a URI that authenticator apps can use
  const appName = 'NotesHub';
  const accountName = user.email; // Use email as account name
  
  const otpauth = authenticator.keyuri(accountName, appName, secret);
  
  // Generate QR code with the URI
  return await QRCode.toDataURL(otpauth);
}

/**
 * Verify a TOTP code
 */
export function verifyToken(token: string, secret: string): boolean {
  try {
    return authenticator.verify({
      token,
      secret
    });
  } catch (error) {
    console.error('TOTP verification error:', error);
    return false;
  }
}