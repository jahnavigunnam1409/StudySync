// backend/src/index.ts

import express, { Request, Response, NextFunction } from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import connectDB from './config/db'; // Your database connection function
import userRoutes from './routes/userRoutes';
import authRoutes from './routes/authRoutes';
import studyGroupRoutes from './routes/studyGroupRoutes';
import taskRoutes from './routes/taskRoutes';
import { notFound, errorHandler } from './middleware/errorMiddleware'; // Custom error handling

// Load environment variables from .env file
dotenv.config();

// Connect to MongoDB
connectDB();

const app = express();

// --- Middleware ---

// Enable CORS for all origins (adjust for production)
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000', // Allow requests from your frontend
  credentials: true, // Allow cookies to be sent
}));

// Body parser for JSON requests
app.use(express.json());

// Cookie parser for reading cookies
app.use(cookieParser());

// --- Routes ---

// Basic route for testing server status
app.get('/', (req: Request, res: Response) => {
  res.send('API is running...');
});

// User authentication routes (e.g., /api/auth/register, /api/auth/login)
app.use('/api/auth', authRoutes);

// User-related routes (e.g., /api/users/profile)
app.use('/api/users', userRoutes);

// Study Group routes (e.g., /api/groups, /api/groups/:id)
app.use('/api/groups', studyGroupRoutes);

// Task routes (e.g., /api/groups/:groupId/tasks, /api/groups/:groupId/tasks/:taskId)
// Note: Task routes are mounted under /api/groups/:groupId/tasks in your taskRoutes.ts
// So the base path here is just /api, and taskRoutes handles the rest.
app.use('/api', taskRoutes);


// --- Error Handling Middleware ---
// These should be the last middlewares to catch all errors

// 404 Not Found handler
app.use(notFound);

// Custom error handler
app.use(errorHandler);

// --- Server Listening ---

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
});

export default app; // Export app for testing purposes