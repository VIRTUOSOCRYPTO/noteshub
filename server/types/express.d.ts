import 'express';

declare global {
  namespace Express {
    interface Request {
      userId?: number;
      tempUserId?: number;
    }
    
    interface Session {
      userId?: number;
      tempUserId?: number;
    }
  }
}