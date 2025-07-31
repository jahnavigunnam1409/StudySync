// backend/src/models/StudyGroup.ts

import { Schema, model, Document, Types } from 'mongoose';
import { IUser } from './User';

export interface IStudyGroup extends Document {
  name: string;
  description?: string;
  creator: Types.ObjectId | IUser;
  members: Array<Types.ObjectId | IUser>;
  joinCode?: string;
  isPrivate: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const StudyGroupSchema = new Schema<IStudyGroup>({
  name: { type: String, required: [true, 'Group name is required'], unique: true, trim: true, minlength: [3, 'Group name must be at least 3 characters long'] },
  description: { type: String, trim: true, required: false },
  creator: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  members: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  joinCode: { type: String, unique: true, sparse: true, trim: true, minlength: [6, 'Join code must be at least 6 characters long'], maxlength: [10, 'Join code cannot exceed 10 characters'] },
  isPrivate: { type: Boolean, default: true }
}, {
  timestamps: true
});

StudyGroupSchema.pre('save', async function(next) {
  const group = this as IStudyGroup;
  if (group.isModified('isPrivate') || group.isNew) {
    if (group.isPrivate && !group.joinCode) {
      const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
      let result = '';
      for (let i = 0; i < 8; i++) { result += characters.charAt(Math.floor(Math.random() * characters.length)); }
      group.joinCode = result;
    } else if (!group.isPrivate) {
      group.joinCode = undefined;
    }
  }
  next();
});

const StudyGroup = model<IStudyGroup>('StudyGroup', StudyGroupSchema);
export default StudyGroup;