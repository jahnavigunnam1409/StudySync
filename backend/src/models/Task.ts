// backend/src/models/Task.ts

import { Schema, model, Document, Types } from 'mongoose';
import { IUser } from './User';
import { IStudyGroup } from './StudyGroup';

export type TaskStatus = 'pending' | 'in progress' | 'completed' | 'overdue';

export interface ITask extends Document {
  title: string;
  description?: string;
  dueDate?: Date;
  assignedTo?: Types.ObjectId | IUser;
  studyGroup: Types.ObjectId | IStudyGroup;
  status: TaskStatus;
  createdBy: Types.ObjectId | IUser;
  createdAt: Date;
  updatedAt: Date;
}

const TaskSchema = new Schema<ITask>({
  title: { type: String, required: [true, 'Task title is required'], trim: true, minlength: [3, 'Task title must be at least 3 characters long'] },
  description: { type: String, trim: true, required: false },
  dueDate: { type: Date, required: false },
  assignedTo: { type: Schema.Types.ObjectId, ref: 'User', required: false },
  studyGroup: { type: Schema.Types.ObjectId, ref: 'StudyGroup', required: true },
  status: { type: String, enum: ['pending', 'in progress', 'completed', 'overdue'], default: 'pending', required: true },
  createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true }
}, {
  timestamps: true
});

TaskSchema.index({ studyGroup: 1, status: 1 });

const Task = model<ITask>('Task', TaskSchema);
export default Task;