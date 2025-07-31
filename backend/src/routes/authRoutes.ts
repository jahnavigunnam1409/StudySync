// backend/src/routes/authRoutes.ts

import { Router } from 'express';
import { registerUser, loginUser } from '../controllers/authController';

const router = Router();

// POST /api/auth/register - Register a new user
router.post('/register', registerUser);

// POST /api/auth/login - Log in an existing user
router.post('/login', loginUser);

export default router;