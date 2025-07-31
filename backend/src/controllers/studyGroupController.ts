// backend/src/controllers/studyGroupController.ts

import { Request, Response } from 'express';
import StudyGroup, { IStudyGroup } from '../models/StudyGroup';
import User from '../models/User'; // Needed to potentially interact with User model

// @desc    Create a new study group
// @route   POST /api/groups
// @access  Private (requires authentication)
export const createStudyGroup = async (req: Request, res: Response) => {
  const { name, description, isPrivate } = req.body;

  if (!req.user) {
    return res.status(401).json({ message: 'Not authorized, no user attached to request.' });
  }

  if (!name) {
    return res.status(400).json({ message: 'Group name is required.' });
  }

  try {
    const groupExists = await StudyGroup.findOne({ name });
    if (groupExists) {
      return res.status(409).json({ message: 'A group with that name already exists.' });
    }

    const studyGroup: IStudyGroup = await StudyGroup.create({
      name,
      description,
      creator: req.user._id.toString(),   // <--- CHANGE: Convert to string
      members: [req.user._id.toString()], // <--- CHANGE: Convert to string
      isPrivate: isPrivate !== undefined ? isPrivate : true,
    });

    res.status(201).json(studyGroup);
  } catch (error: any) {
    if (error.code === 11000) { // Duplicate key error
      return res.status(409).json({ message: 'Group name already in use.' });
    }
    console.error('Error creating study group:', error);
    res.status(500).json({ message: 'Server error during group creation.', error: error.message });
  }
};


// @desc    Get all study groups (public groups for discovery, or all for admin/creator)
// @route   GET /api/groups
// @access  Public (for listing public groups) or Private (for user's groups)
export const getStudyGroups = async (req: Request, res: Response) => {
  try {
    let query: any = {};

    if (req.user) {
      query = {
        $or: [
          { isPrivate: false },
          { members: req.user._id.toString() } // <--- CHANGE: Convert to string for query
        ]
      };
    } else {
      query = { isPrivate: false };
    }

    const groups = await StudyGroup.find(query)
                                    .populate('creator', 'username email fullName')
                                    .populate('members', 'username email fullName')
                                    .sort({ createdAt: -1 });

    res.status(200).json(groups);
  } catch (error: any) {
    console.error('Error fetching study groups:', error);
    res.status(500).json({ message: 'Server error fetching groups.', error: error.message });
  }
};


// @desc    Get a single study group by ID
// @route   GET /api/groups/:id
// @access  Private (only if user is a member or group is public)
export const getStudyGroupById = async (req: Request, res: Response) => {
  try {
    const studyGroup = await StudyGroup.findById(req.params.id)
                                      .populate('creator', 'username email fullName')
                                      .populate('members', 'username email fullName');

    if (!studyGroup) {
      return res.status(404).json({ message: 'Study group not found.' });
    }

    // Check if group is private and user is not a member (or not the creator)
    if (studyGroup.isPrivate && (!req.user || !studyGroup.members.some(member => member._id.toString() === req.user!._id.toString()))) { // <--- CHANGE: toString() for comparison
      return res.status(403).json({ message: 'Not authorized to access this private group.' });
    }

    res.status(200).json(studyGroup);
  } catch (error: any) {
    console.error('Error fetching study group by ID:', error);
    if (error.name === 'CastError') {
        return res.status(400).json({ message: 'Invalid group ID format.' });
    }
    res.status(500).json({ message: 'Server error fetching group.', error: error.message });
  }
};


// @desc    Join a study group
// @route   POST /api/groups/:id/join
// @access  Private
export const joinStudyGroup = async (req: Request, res: Response) => {
  const { joinCode } = req.body;

  if (!req.user) {
    return res.status(401).json({ message: 'Not authorized, no user attached to request.' });
  }

  try {
    const studyGroup = await StudyGroup.findById(req.params.id);

    if (!studyGroup) {
      return res.status(404).json({ message: 'Study group not found.' });
    }

    // Check if user is already a member
    if (studyGroup.members.some(member => member._id.toString() === req.user!._id.toString())) { // <--- CHANGE: toString() for comparison
      return res.status(400).json({ message: 'You are already a member of this group.' });
    }

    // If private, check join code
    if (studyGroup.isPrivate) {
      if (!joinCode || studyGroup.joinCode !== joinCode) {
        return res.status(403).json({ message: 'Invalid join code for this private group.' });
      }
    }

    // Add user to members list
    studyGroup.members.push(req.user._id); // This push might still flag, let's see. If so, use .toString() here too.
    await studyGroup.save();

    res.status(200).json({ message: 'Successfully joined the group!', studyGroup });
  } catch (error: any) {
    console.error('Error joining study group:', error);
    if (error.name === 'CastError') {
        return res.status(400).json({ message: 'Invalid group ID format.' });
    }
    res.status(500).json({ message: 'Server error joining group.', error: error.message });
  }
};


// @desc    Leave a study group
// @route   POST /api/groups/:id/leave
// @access  Private
export const leaveStudyGroup = async (req: Request, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Not authorized, no user attached to request.' });
  }

  try {
    const studyGroup = await StudyGroup.findById(req.params.id);

    if (!studyGroup) {
      return res.status(404).json({ message: 'Study group not found.' });
    }

    // Check if the user is the creator and only member. If so, they cannot leave (group must be deleted).
    if (studyGroup.creator.toString() === req.user._id.toString() && studyGroup.members.length === 1) { // <--- CHANGE: toString() for comparison
        return res.status(403).json({ message: 'As the sole creator and member, you cannot leave. Delete the group instead.' });
    }

    // Remove user from members list
    const initialMemberCount = studyGroup.members.length;
    studyGroup.members = studyGroup.members.filter(memberId => memberId.toString() !== req.user!._id.toString()); // <--- CHANGE: toString() for comparison

    if (studyGroup.members.length === initialMemberCount) {
        return res.status(400).json({ message: 'You are not a member of this group.' });
    }

    await studyGroup.save();

    res.status(200).json({ message: 'Successfully left the group!', studyGroup });
  } catch (error: any) {
    console.error('Error leaving study group:', error);
    if (error.name === 'CastError') {
        return res.status(400).json({ message: 'Invalid group ID format.' });
    }
    res.status(500).json({ message: 'Server error leaving group.', error: error.message });
  }
};


// @desc    Update a study group (only creator can do this)
// @route   PUT /api/groups/:id
// @access  Private
export const updateStudyGroup = async (req: Request, res: Response) => {
  const { name, description, isPrivate } = req.body;

  if (!req.user) {
    return res.status(401).json({ message: 'Not authorized, no user attached to request.' });
  }

  try {
    const studyGroup = await StudyGroup.findById(req.params.id);

    if (!studyGroup) {
      return res.status(404).json({ message: 'Study group not found.' });
    }

    // Check if authenticated user is the creator of the group
    if (studyGroup.creator.toString() !== req.user._id.toString()) { // <--- CHANGE: toString() for comparison
      return res.status(403).json({ message: 'Not authorized to update this group.' });
    }

    // Update fields if provided
    if (name) studyGroup.name = name;
    if (description !== undefined) studyGroup.description = description;
    if (isPrivate !== undefined) studyGroup.isPrivate = isPrivate;

    // If group becomes public, clear joinCode
    if (!studyGroup.isPrivate) {
        studyGroup.joinCode = undefined;
    }

    const updatedGroup = await studyGroup.save();

    res.status(200).json(updatedGroup);
  } catch (error: any) {
    if (error.code === 11000) {
      return res.status(409).json({ message: 'Group name already in use.' });
    }
    console.error('Error updating study group:', error);
    if (error.name === 'CastError') {
        return res.status(400).json({ message: 'Invalid group ID format.' });
    }
    res.status(500).json({ message: 'Server error updating group.', error: error.message });
  }
};


// @desc    Delete a study group (only creator can do this)
// @route   DELETE /api/groups/:id
// @access  Private
export const deleteStudyGroup = async (req: Request, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Not authorized, no user attached to request.' });
  }

  try {
    const studyGroup = await StudyGroup.findById(req.params.id);

    if (!studyGroup) {
      return res.status(404).json({ message: 'Study group not found.' });
    }

    // Check if authenticated user is the creator of the group
    if (studyGroup.creator.toString() !== req.user._id.toString()) { // <--- CHANGE: toString() for comparison
      return res.status(403).json({ message: 'Not authorized to delete this group.' });
    }

    await StudyGroup.deleteOne({ _id: req.params.id });

    res.status(200).json({ message: 'Study group deleted successfully.' });
  } catch (error: any) {
    console.error('Error deleting study group:', error);
    if (error.name === 'CastError') {
        return res.status(400).json({ message: 'Invalid group ID format.' });
    }
    res.status(500).json({ message: 'Server error deleting group.', error: error.message });
  }
};