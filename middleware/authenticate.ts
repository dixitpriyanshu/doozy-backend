import { NextFunction, RequestHandler, Response } from "express";
import { AuthRequest } from "../types/schema";
import jwt from "jsonwebtoken";
import { ObjectId } from "mongodb";

export const authenticate: RequestHandler = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  const token = req.header("Authorization");
  if (!token) {
    res.status(401).json({ message: "Access Denied" });
    return;
  }

  try {
    const verified = jwt.verify(token, process.env.JWT_SECRET!) as {
      _id: string;
    };
    req.user = { _id: new ObjectId(verified._id) };
    next();
  } catch (err) {
    res.status(400).json({ message: "Invalid Token" });
  }
};
