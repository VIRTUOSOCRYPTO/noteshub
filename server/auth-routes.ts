import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { storage } from './storage';
import { verifyToken, generateAccessToken, generateRefreshToken, extractToken } from './jwt';
import { sanitizeUserText } from './utils';

const router = Router();

// Schema for two-factor setup verification
const twoFactorSetupSchema = z.object({
  token: z.string().min(6).max(8)
});

// Schema for two-factor authentication during login
const twoFactorLoginSchema = z.object({
  token: z.string().min(6).max(8)
});

// Schema for token refresh
const refreshTokenSchema = z.object({
  refreshToken: z.string().min(10)
});

// Middleware to verify access token
export const verifyJWT = (req: Request, res: Response, next: Function) => {
  const authHeader = req.headers.authorization;
  const token = extractToken(authHeader);
  
  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }
  
  const decoded = verifyToken(token);
  
  if (!decoded) {
    return res.status(401).json({ error: 'Invalid token' });
  }
  
  // Set user ID in request object
  req.userId = decoded.userId;
  next();
};

// Route to set up two-factor authentication
router.post('/setup-2fa', verifyJWT, async (req: Request, res: Response) => {
  try {
    const userId = req.userId;
    
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    // Generate 2FA secret and QR code
    const { secret, qrCodeUrl } = await storage.setupTwoFactor(userId);
    
    // Return without saving secret yet
    res.json({
      success: true,
      qrCodeUrl,
      message: 'Scan this QR code with your authenticator app'
    });
  } catch (error) {
    console.error('Error setting up 2FA:', error);
    res.status(500).json({ error: 'Failed to set up two-factor authentication' });
  }
});

// Route to verify and enable two-factor authentication
router.post('/verify-2fa', verifyJWT, async (req: Request, res: Response) => {
  try {
    const userId = req.userId;
    
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    // Validate token from request body
    const validation = twoFactorSetupSchema.safeParse(req.body);
    
    if (!validation.success) {
      return res.status(400).json({ error: 'Invalid token format' });
    }
    
    const { token } = validation.data;
    const sanitizedToken = sanitizeUserText(token);
    
    // Verify token and enable 2FA if valid
    const success = await storage.verifyAndEnableTwoFactor(userId, sanitizedToken);
    
    if (success) {
      res.json({
        success: true,
        message: 'Two-factor authentication enabled successfully'
      });
    } else {
      res.status(400).json({
        success: false,
        error: 'Invalid verification code'
      });
    }
  } catch (error) {
    console.error('Error verifying 2FA:', error);
    res.status(500).json({ error: 'Failed to verify two-factor authentication' });
  }
});

// Route to disable two-factor authentication
router.post('/disable-2fa', verifyJWT, async (req: Request, res: Response) => {
  try {
    const userId = req.userId;
    
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    const success = await storage.disableTwoFactor(userId);
    
    if (success) {
      res.json({
        success: true,
        message: 'Two-factor authentication disabled successfully'
      });
    } else {
      res.status(400).json({
        success: false,
        error: 'Failed to disable two-factor authentication'
      });
    }
  } catch (error) {
    console.error('Error disabling 2FA:', error);
    res.status(500).json({ error: 'Failed to disable two-factor authentication' });
  }
});

// Route to check if 2FA is enabled
router.get('/2fa-status', verifyJWT, async (req: Request, res: Response) => {
  try {
    const userId = req.userId;
    
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    const enabled = await storage.isTwoFactorEnabled(userId);
    
    res.json({
      twoFactorEnabled: enabled
    });
  } catch (error) {
    console.error('Error checking 2FA status:', error);
    res.status(500).json({ error: 'Failed to check two-factor authentication status' });
  }
});

// Route to complete login with 2FA
router.post('/login-2fa', async (req: Request, res: Response) => {
  try {
    // Validate token from request body
    const validation = twoFactorLoginSchema.safeParse(req.body);
    
    if (!validation.success || !req.session?.tempUserId) {
      return res.status(400).json({ error: 'Invalid request' });
    }
    
    const { token } = validation.data;
    const sanitizedToken = sanitizeUserText(token);
    const userId = req.session.tempUserId;
    
    // Verify 2FA token
    const isValid = await storage.validateTwoFactorToken(userId, sanitizedToken);
    
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid verification code' });
    }
    
    // Get user
    const user = await storage.getUser(userId);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Clear temporary user ID
    delete req.session.tempUserId;
    
    // Set session
    req.session.userId = user.id;
    
    // Generate tokens
    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);
    
    // Store refresh token
    await storage.storeRefreshToken(user.id, refreshToken);
    
    // Return user info with tokens
    const { password, ...userWithoutPassword } = user;
    res.json({
      user: userWithoutPassword,
      accessToken,
      refreshToken
    });
  } catch (error) {
    console.error('Error completing 2FA login:', error);
    res.status(500).json({ error: 'Failed to complete authentication' });
  }
});

// Route to refresh access token
router.post('/refresh-token', async (req: Request, res: Response) => {
  try {
    // Validate refresh token from request body
    const validation = refreshTokenSchema.safeParse(req.body);
    
    if (!validation.success) {
      return res.status(400).json({ error: 'Invalid refresh token' });
    }
    
    const { refreshToken } = validation.data;
    
    // Validate refresh token
    const userId = await storage.validateRefreshToken(refreshToken);
    
    if (!userId) {
      return res.status(401).json({ error: 'Invalid or expired refresh token' });
    }
    
    // Get user data from userId
    const user = await storage.getUser(userId);
    
    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }
    
    // Generate new tokens
    const newAccessToken = generateAccessToken(user);
    const newRefreshToken = generateRefreshToken(user);
    
    // Store new refresh token
    await storage.storeRefreshToken(user.id, newRefreshToken);
    
    // Return new tokens
    res.json({
      accessToken: newAccessToken,
      refreshToken: newRefreshToken
    });
  } catch (error) {
    console.error('Error refreshing token:', error);
    res.status(500).json({ error: 'Failed to refresh token' });
  }
});

// Route to revoke refresh token (logout from all devices)
router.post('/revoke-token', verifyJWT, async (req: Request, res: Response) => {
  try {
    const userId = req.userId;
    
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    // Revoke refresh token
    await storage.revokeRefreshToken(userId);
    
    res.json({
      success: true,
      message: 'Logged out from all devices'
    });
  } catch (error) {
    console.error('Error revoking token:', error);
    res.status(500).json({ error: 'Failed to logout from all devices' });
  }
});

export default router;