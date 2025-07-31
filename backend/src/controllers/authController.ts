// backend/src/controllers/authController.ts

import { Request, Response } from 'express';
import User, { IUser } from '../models/User';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
// No need to import 'Types' just for _id.toString()
// import { Types } from 'mongoose'; // You can remove this line if it's there

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET as string;

// Helper function to generate JWT token
// No change needed here, 'id' is already string
const generateToken = (id: string): string => {
  return jwt.sign({ id }, JWT_SECRET, {
    expiresIn: '1h', // Token expires in 1 hour
  });
};

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public
export const registerUser = async (req: Request, res: Response) => {
  const { username, email, password, fullName } = req.body;

  if (!username || !email || !password) {
    return res.status(400).json({ message: 'Please enter all required fields (username, email, password).' });
  }

  try {
    const userExists = await User.findOne({ $or: [{ username }, { email }] });
    if (userExists) {
      return res.status(409).json({ message: 'User with that username or email already exists.' });
    }

    // Explicitly type newUser as IUser directly during creation
    const newUser: IUser = await User.create({
      username,
      email,
      password,
      fullName,
    });

    if (newUser) { // Check if newUser was actually created
      res.status(201).json({
        _id: newUser._id, // TypeScript now correctly infers _id type from IUser
        username: newUser.username,
        email: newUser.email,
        fullName: newUser.fullName,
        token: generateToken(newUser._id.toString()), // Use newUser directly
      });
    } else {
      res.status(400).json({ message: 'Invalid user data.' });
    }
  } catch (error: any) {
    if (error.code === 11000) {
      return res.status(409).json({ message: 'Username or Email already in use.' });
    }
    console.error('Error during user registration:', error);
    res.status(500).json({ message: 'Server error during registration.', error: error.message });
  }
};

// @desc    Authenticate user & get token
// @route   POST /api/auth/login
// @access  Public
export const loginUser = async (req: Request, res: Response) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: 'Please enter email and password.' });
  }

  try {
    // Explicitly type foundUser as IUser | null (Mongoose findOne can return null)
    const foundUser: IUser | null = await User.findOne({ email });

    // CRITICAL: Check if user was found. If not, 'user' would be null.
    if (!foundUser) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    // Now that we know foundUser is not null, we can safely access its properties
    // and perform password comparison.
    if (await foundUser.comparePassword(password)) {
      res.json({
        _id: foundUser._id, // TypeScript now correctly infers _id type from IUser
        username: foundUser.username,
        email: foundUser.email,
        fullName: foundUser.fullName,
        token: generateToken(foundUser._id.toString()), // Use foundUser directly
      });
    } else {
      res.status(401).json({ message: 'Invalid email or password.' });
    }
  } catch (error: any) {
    console.error('Error during user login:', error);
    res.status(500).json({ message: 'Server error during login.', error: error.message });
  }
};