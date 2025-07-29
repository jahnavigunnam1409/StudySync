// backend/src/index.ts
import 'dotenv/config'; // ES module syntax for dotenv; ensures process.env is populated
import express, { Request, Response } from 'express';
import mongoose from 'mongoose';
import cors from 'cors';

const app = express();
// Parse PORT from environment variables. parseInt ensures it's a number, 10 for base 10.
const PORT: number = parseInt(process.env.PORT || '5000', 10);
// Get MongoDB URI from environment variables. Add a fallback string for development safety if .env isn't loaded.
const MONGO_URI: string = process.env.MONGO_URI || 'mongodb://localhost:27017/studysync_db'; // <- IMPORTANT: Replace or ensure your .env has this!

// Middleware: These functions execute for every incoming request
app.use(cors()); // Enables Cross-Origin Resource Sharing for your frontend
app.use(express.json()); // Parses incoming JSON requests and puts the parsed data in req.body

// Basic route: A simple endpoint to confirm the server is running
app.get('/', (req: Request, res: Response) => {
    res.send('StudySync Backend API is running! (TypeScript)');
});

// Connect to MongoDB
mongoose.connect(MONGO_URI)
    .then(() => console.log('MongoDB connected successfully'))
    .catch((err: Error) => {
        console.error('MongoDB connection error:', err);
        // Optionally, exit the process if DB connection is critical for startup
        // process.exit(1);
    });

// Start the server: Listen for incoming requests on the specified port
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});