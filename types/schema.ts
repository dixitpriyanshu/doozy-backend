import { ObjectId } from "mongodb";
import { type Request } from "express";

export interface UserType {
  _id?: ObjectId;
  username: string;
  email: string;
  password: string;
}

export interface TaskType {
  _id?: ObjectId;
  userId: ObjectId;
  title: string;
  description?: string;
  completed: boolean;
}

export interface AuthRequest extends Request {
  user?: { _id: ObjectId };
}
