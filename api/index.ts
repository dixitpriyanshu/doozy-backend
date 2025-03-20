import express, { Response, Request } from "express";
import { Collection, MongoClient, ObjectId, ServerApiVersion } from "mongodb";
import { AuthRequest, TaskType, UserType } from "../types/schema";
import { authenticate } from "../middleware/authenticate";
import cors from "cors";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const MONGO_DB_URI = process.env.MONGO_DB_URI!;

const client = new MongoClient(MONGO_DB_URI, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

client
  .connect()
  .then(() => console.log("Connected to MongoDB Atlas"))
  .catch((err) => console.error(err));

const db = client.db("doozy");

const User: Collection<UserType> = db.collection("users");
const Task: Collection<TaskType> = db.collection("tasks");

const app = express();
app.use(cors());
app.use(express.json());

app.get("/", (_req, res) => {
  res.send("Doozy API is running.");
});

app.post("/auth/signup", async (req: Request, res: Response) => {
  try {
    const { username, email, password } = req.body;
    // check if user already exists
    const existing = await User.findOne({ email });
    if (existing) {
      res.status(400).json({ message: "User already exists" });
      return;
    }
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const user: UserType = { username, email, password: hashedPassword };
    const result = await User.insertOne(user);
    const token = jwt.sign(
      { _id: result.insertedId!.toString() },
      process.env.JWT_SECRET!,
      { expiresIn: "10y" }
    );
    res.status(201).json({ message: "User registered successfully", token });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
});

app.post("/auth/login", async (req: Request, res: Response) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email });
  if (!user) {
    res.status(400).json({ message: "Email not registered, Please Sign Up" });
    return;
  }

  const validPassword = await bcrypt.compare(password, user.password);
  if (!validPassword) {
    res.status(400).json({ message: "Incorrect Password" });
    return;
  }

  const token = jwt.sign(
    { _id: user._id!.toString() },
    process.env.JWT_SECRET!,
    { expiresIn: "10y" }
  );
  res.json({ token });
});

// Task Management Routes
app.post("/tasks", authenticate, async (req: AuthRequest, res: Response) => {
  const task: TaskType = { userId: req.user!._id, ...req.body };
  const result = await Task.insertOne(task);
  res.status(201).json(result);
});

app.get("/tasks", authenticate, async (req: AuthRequest, res: Response) => {
  const tasks = await Task.find({ userId: req.user!._id }).toArray();
  res.json(tasks);
});

app.get("/tasks/:id", authenticate, async (req: AuthRequest, res: Response) => {
  const task = await Task.findOne({
    _id: new ObjectId(req.params.id),
    userId: req.user!._id,
  });
  if (!task) {
    res.status(404).json({ message: "Task not found" });
    return;
  }
  res.json(task);
});

app.put("/tasks/:id", authenticate, async (req: AuthRequest, res: Response) => {
  const result = await Task.findOneAndUpdate(
    { _id: new ObjectId(req.params.id), userId: req.user!._id },
    { $set: req.body },
    { returnDocument: "after" }
  );
  if (!result) {
    res.status(404).json({ message: "Task not found" });
    return;
  }
  res.json(result);
});

app.delete(
  "/tasks/:id",
  authenticate,
  async (req: AuthRequest, res: Response): Promise<void> => {
    const result = await Task.findOneAndDelete({
      _id: new ObjectId(req.params.id),
      userId: req.user!._id,
    });
    if (!result) {
      res.status(404).json({ message: "Task not found" });
      return;
    }
    res.json({ message: "Task deleted" });
  }
);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => console.log("Server ready on port 3001."));

export default app;
