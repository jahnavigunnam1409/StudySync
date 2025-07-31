// backend/src/routes/studyGroupRoutes.ts

import { Router } from 'express';
import { protect } from '../middleware/authMiddleware'; // Import the middleware
import {
  createStudyGroup,
  getStudyGroups,
  getStudyGroupById,
  joinStudyGroup,
  leaveStudyGroup,
  updateStudyGroup,
  deleteStudyGroup
} from '../controllers/studyGroupController';

const router = Router();

// Routes that require authentication (private)
router.route('/')
  .post(protect, createStudyGroup); // Create group: protected
  // .get(protect, getStudyGroups); // Optional: If you want to protect getting ALL groups for a user
                                 // But usually, groups are discoverable, so handled in controller

// Public route for getting all groups (controller handles public/private logic)
router.get('/', getStudyGroups);

router.route('/:id')
  .get(getStudyGroupById)       // Get single group (controller handles access)
  .put(protect, updateStudyGroup) // Update group: protected
  .delete(protect, deleteStudyGroup); // Delete group: protected

router.post('/:id/join', protect, joinStudyGroup); // Join group: protected
router.post('/:id/leave', protect, leaveStudyGroup); // Leave group: protected

export default router;