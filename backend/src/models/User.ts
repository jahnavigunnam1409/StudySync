// backend/src/models/User.ts

import { Schema, model, Document, Types } from 'mongoose'; // Ensure 'Types' is imported
import bcrypt from 'bcryptjs';

// 1. Define an interface that describes the User document properties
export interface IUser extends Document {
  _id: Types.ObjectId; // Explicitly define _id as Mongoose's ObjectId for TypeScript
  username: string;
  email: string;
  password: string;
  fullName?: string; // Optional field
  createdAt: Date;
  updatedAt: Date;
  // Method to compare a candidate password with the hashed password
  comparePassword(candidatePassword: string): Promise<boolean>;
}

// 2. Define the Mongoose Schema for the User model
const UserSchema = new Schema<IUser>({
  username: {
    type: String,
    required: [true, 'Username is required'],
    unique: true, // Ensures usernames are unique
    trim: true, // Removes whitespace from both ends of a string
    minlength: [3, 'Username must be at least 3 characters long']
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true, // Ensures emails are unique
    trim: true,
    lowercase: true, // Stores emails in lowercase
    match: [/.+@.+\..+/, 'Please enter a valid email address'] // Basic email format validation
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [6, 'Password must be at least 6 characters long']
  },
  fullName: {
    type: String,
    trim: true,
    required: false // Full name is optional
  }
}, {
  timestamps: true // Mongoose automatically adds `createdAt` and `updatedAt` fields
});

// 3. Mongoose Middleware (Pre-save hook) for password hashing
UserSchema.pre<IUser>('save', async function(next) {
  // Only hash the password if it has been modified (or is new)
  if (!this.isModified('password')) {
    return next();
  }
  try {
    // Generate a salt and hash the password
    const salt = await bcrypt.genSalt(10); // 10 is the number of salt rounds
    this.password = await bcrypt.hash(this.password, salt);
    next(); // Continue with the save operation
  } catch (err: any) {
    next(err); // Pass any error to the next middleware
  }
});

// 4. Custom method to compare passwords
UserSchema.methods.comparePassword = async function(candidatePassword: string): Promise<boolean> {
  // Use bcrypt to compare the provided password with the hashed password in the database
  return bcrypt.compare(candidatePassword, this.password);
};

// 5. Create and export the Mongoose Model
const User = model<IUser>('User', UserSchema);

export default User;