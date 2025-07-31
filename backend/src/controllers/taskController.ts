// backend/src/controllers/taskController.ts

import { Request, Response } from 'express';
import Task, { ITask } from '../models/Task';
import StudyGroup, { IStudyGroup } from '../models/StudyGroup';
import { Types } from 'mongoose';

// @desc    Create a new task for a specific study group
// @route   POST /api/groups/:groupId/tasks
// @access  Private (members of the group only)
export const createTask = async (req: Request, res: Response) => {
  const { groupId } = req.params;
  const { title, description, dueDate, assignedTo, status } = req.body;

  if (!req.user) {
    return res.status(401).json({ message: 'Not authorized, no user attached to request.' });
  }

  if (!title) {
    return res.status(400).json({ message: 'Task title is required.' });
  }

  try {
    const studyGroup: IStudyGroup | null = await StudyGroup.findById(groupId);

    if (!studyGroup) {
      return res.status(404).json({ message: 'Study group not found.' });
    }

    // Check if the authenticated user is a member of the group
    if (!studyGroup.members.some(member => member.toString() === req.user!._id.toString())) {
      return res.status(403).json({ message: 'Not authorized to create tasks in this group.' });
    }

    let assignedToObjectId: Types.ObjectId | undefined;
    if (assignedTo) {
      if (!Types.ObjectId.isValid(assignedTo)) {
        return res.status(400).json({ message: 'Invalid assignedTo user ID format.' });
      }
      // Check if the single assigned user is a member of the group
      if (!studyGroup.members.some(member => member.toString() === assignedTo.toString())) {
        return res.status(400).json({ message: `Assigned user ${assignedTo} is not a member of this group.` });
      }
      assignedToObjectId = new Types.ObjectId(assignedTo);
    }

    const newTask: ITask = await Task.create({
      studyGroup: new Types.ObjectId(groupId),
      title,
      description,
      dueDate: dueDate ? new Date(dueDate) : undefined,
      createdBy: req.user._id,
      assignedTo: assignedToObjectId,
      status: status || 'pending',
    });

    res.status(201).json(newTask);

  } catch (error: any) {
    console.error('Error creating task:', error);
    if (error.name === 'CastError') {
        return res.status(400).json({ message: 'Invalid group ID or user ID format.' });
    }
    res.status(500).json({ message: 'Server error during task creation.', error: error.message });
  }
};


// @desc    Get all tasks for a specific study group
// @route   GET /api/groups/:groupId/tasks
// @access  Private (members of the group only)
export const getTasks = async (req: Request, res: Response) => {
  const { groupId } = req.params;

  if (!req.user) {
    return res.status(401).json({ message: 'Not authorized, no user attached to request.' });
  }

  try {
    const studyGroup: IStudyGroup | null = await StudyGroup.findById(groupId);

    if (!studyGroup) {
      return res.status(404).json({ message: 'Study group not found.' });
    }

    // Check if the authenticated user is a member of the group
    if (!studyGroup.members.some(member => member.toString() === req.user!._id.toString())) {
      return res.status(403).json({ message: 'Not authorized to view tasks in this group.' });
    }

    const tasks = await Task.find({ studyGroup: groupId })
                            .populate('createdBy', 'username fullName')
                            .populate('assignedTo', 'username fullName')
                            .sort({ dueDate: 1, createdAt: -1 });

    res.status(200).json(tasks);

  } catch (error: any) {
    console.error('Error fetching tasks:', error);
    if (error.name === 'CastError') {
        return res.status(400).json({ message: 'Invalid group ID format.' });
    }
    res.status(500).json({ message: 'Server error fetching tasks.', error: error.message });
  }
};


// @desc    Get a single task by ID within a study group
// @route   GET /api/groups/:groupId/tasks/:taskId
// @access  Private (members of the group only)
export const getTaskById = async (req: Request, res: Response) => {
  const { groupId, taskId } = req.params;

  if (!req.user) {
    return res.status(401).json({ message: 'Not authorized, no user attached to request.' });
  }

  try {
    const studyGroup: IStudyGroup | null = await StudyGroup.findById(groupId);
    if (!studyGroup) {
      return res.status(404).json({ message: 'Study group not found.' });
    }

    // Check if user is a member of the group
    if (!studyGroup.members.some(member => member.toString() === req.user!._id.toString())) {
      return res.status(403).json({ message: 'Not authorized to view tasks in this group.' });
    }

    const task: ITask | null = await Task.findById(taskId)
                           .populate('createdBy', 'username fullName')
                           .populate('assignedTo', 'username fullName');

    if (!task) {
      return res.status(404).json({ message: 'Task not found.' });
    }

    // Ensure the task belongs to the specified group
    if (task.studyGroup.toString() !== groupId.toString()) {
      return res.status(400).json({ message: 'Task does not belong to the specified group.' });
    }

    res.status(200).json(task);

  } catch (error: any) {
    console.error('Error fetching task by ID:', error);
    if (error.name === 'CastError') {
        return res.status(400).json({ message: 'Invalid group ID or task ID format.' });
    }
    res.status(500).json({ message: 'Server error fetching task.', error: error.message });
  }
};


// @desc    Update a task
// @route   PUT /api/groups/:groupId/tasks/:taskId
// @access  Private (members of the group only, or creator of the task, or assigned users)
export const updateTask = async (req: Request, res: Response) => {
  const { groupId, taskId } = req.params;
  const { title, description, dueDate, assignedTo, status } = req.body;

  if (!req.user) {
    return res.status(401).json({ message: 'Not authorized, no user attached to request.' });
  }

  try {
    const studyGroup: IStudyGroup | null = await StudyGroup.findById(groupId);
    if (!studyGroup) {
      return res.status(404).json({ message: 'Study group not found.' });
    }

    // Check if user is a member of the group
    if (!studyGroup.members.some(member => member.toString() === req.user!._id.toString())) {
      return res.status(403).json({ message: 'Not authorized to update tasks in this group.' });
    }

    const task: ITask | null = await Task.findById(taskId);
    if (!task) {
      return res.status(404).json({ message: 'Task not found.' });
    }

    // Ensure the task belongs to the specified group
    if (task.studyGroup.toString() !== groupId.toString()) {
      return res.status(400).json({ message: 'Task does not belong to the specified group.' });
    }

    // Authorization: Allow creator, assigned user, or group creator to update
    const isCreator = task.createdBy.toString() === req.user._id.toString();
    const isAssigned = task.assignedTo?.toString() === req.user!._id.toString();
    const isAdminOrGroupCreator = studyGroup.creator.toString() === req.user._id.toString();

    if (!isCreator && !isAssigned && !isAdminOrGroupCreator) {
      return res.status(403).json({ message: 'Not authorized to update this task.' });
    }

    // Update fields if provided
    if (title) task.title = title;
    if (description !== undefined) task.description = description;
    if (dueDate) task.dueDate = new Date(dueDate);
    if (status) task.status = status;

    // Handle assignedTo update for a single user
    if (assignedTo !== undefined) {
      if (assignedTo === null) { // Allow clearing assignedTo by sending null
        task.assignedTo = undefined;
      } else if (!Types.ObjectId.isValid(assignedTo)) {
        return res.status(400).json({ message: `Invalid assignedTo user ID format: ${assignedTo}` });
      } else {
        // Check if the single assigned user is a member of the group
        if (!studyGroup.members.some(member => member.toString() === assignedTo.toString())) {
          return res.status(400).json({ message: `Assigned user ${assignedTo} is not a member of this group.` });
        }
        task.assignedTo = new Types.ObjectId(assignedTo);
      }
    }

    const updatedTask = await task.save();
    res.status(200).json(updatedTask);

  } catch (error: any) {
    console.error('Error updating task:', error);
    if (error.name === 'CastError') {
        return res.status(400).json({ message: 'Invalid ID format.' });
    }
    res.status(500).json({ message: 'Server error updating task.', error: error.message });
  }
};


// @desc    Delete a task
// @route   DELETE /api/groups/:groupId/tasks/:taskId
// @access  Private (only creator of task or group creator)
export const deleteTask = async (req: Request, res: Response) => {
  const { groupId, taskId } = req.params;

  if (!req.user) {
    return res.status(401).json({ message: 'Not authorized, no user attached to request.' });
  }

  try {
    const studyGroup: IStudyGroup | null = await StudyGroup.findById(groupId);
    if (!studyGroup) {
      return res.status(404).json({ message: 'Study group not found.' });
    }

    // Check if user is a member of the group
    if (!studyGroup.members.some(member => member.toString() === req.user!._id.toString())) {
      return res.status(403).json({ message: 'Not authorized to delete tasks in this group.' });
    }

    const task: ITask | null = await Task.findById(taskId);
    if (!task) {
      return res.status(404).json({ message: 'Task not found.' });
    }

    // Ensure the task belongs to the specified group
    if (task.studyGroup.toString() !== groupId.toString()) {
      return res.status(400).json({ message: 'Task does not belong to the specified group.' });
    }

    // Authorization: Only the task creator or the group creator can delete
    const isTaskCreator = task.createdBy.toString() === req.user._id.toString();
    const isGroupCreator = studyGroup.creator.toString() === req.user._id.toString();

    if (!isTaskCreator && !isGroupCreator) {
      return res.status(403).json({ message: 'Not authorized to delete this task.' });
    }

    await Task.deleteOne({ _id: taskId });

    res.status(200).json({ message: 'Task deleted successfully.' });

  } catch (error: any) {
    console.error('Error deleting task:', error);
    if (error.name === 'CastError') {
        return res.status(400).json({ message: 'Invalid ID format.' });
    }
    res.status(500).json({ message: 'Server error deleting task.', error: error.message });
  }
};