// backend/src/middleware/authMiddleware.ts

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import User, { IUser } from '../models/User';
import dotenv from 'dotenv';

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET as string;

// Extend the Express Request interface to include the user property
// This allows TypeScript to know that req.user will be available after this middleware
declare global {
  namespace Express {
    interface Request {
      user?: IUser; // Add optional user property
    }
  }
}

// Middleware to protect routes
export const protect = async (req: Request, res: Response, next: NextFunction) => {
  let token: string | undefined;

  // Check for token in 'Authorization' header
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      // Get token from header (e.g., "Bearer TOKEN")
      token = req.headers.authorization.split(' ')[1];

      // Verify token
      const decoded = jwt.verify(token, JWT_SECRET) as { id: string }; // Decode the token payload

      // Find user by ID from the token and attach to request object
      const user = await User.findById(decoded.id).select('-password'); // Exclude password from the returned user object

      if (!user) {
        return res.status(401).json({ message: 'Not authorized, user not found.' });
      }

      req.user = user; // Attach the user document to the request object

      next(); // Call the next middleware/route handler
    } catch (error) {
      console.error('Token verification failed:', error);
      res.status(401).json({ message: 'Not authorized, token failed.' });
    }
  }

  if (!token) {
    res.status(401).json({ message: 'Not authorized, no token.' });
  }
};