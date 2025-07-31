// backend/src/routes/taskRoutes.ts

import { Router } from 'express';
import { protect } from '../middleware/authMiddleware';
import {
  createTask,
  getTasks,
  getTaskById,
  updateTask,
  deleteTask
} from '../controllers/taskController';

const router = Router({ mergeParams: true }); // 'mergeParams: true' is crucial for nested routes

// Routes for /api/groups/:groupId/tasks
router.route('/')
  .post(protect, createTask) // Create a new task
  .get(protect, getTasks);   // Get all tasks for a group

// Routes for /api/groups/:groupId/tasks/:taskId
router.route('/:taskId')
  .get(protect, getTaskById)    // Get a single task
  .put(protect, updateTask)     // Update a task
  .delete(protect, deleteTask); // Delete a task

export default router;