import dotenv from "dotenv";
dotenv.config();

import app from "./src/app.js";
import chalk from "chalk";
import { connectDB } from "./src/config/db.js";
import mongoose from "mongoose";

const PORT = process.env.PORT || 5000;

// Mark any jobs stuck as "running" from a previous crashed session as "stopped"
// This runs once on every server start — safe to run always
async function recoverStuckJobs() {
  try {
    const Job = mongoose.model('Job');
    const result = await Job.updateMany(
      { status: 'running' },
      { $set: { status: 'stopped', stoppedAt: new Date() } }
    );
    if (result.modifiedCount > 0) {
      console.log(chalk.bold.yellow(`⚠️  Recovered ${result.modifiedCount} stuck job(s) — data is safe and downloadable`));
    }
  } catch (err) {
    console.error('recoverStuckJobs error:', err.message);
  }
}

const startServer = async () => {
  try {
    console.log("Serper key:", process.env.SERPER_API_KEY ? "✅ LOADED" : "❌ MISSING");
    await connectDB();
    await recoverStuckJobs();
    app.listen(PORT, () => {
      console.log(chalk.bold.green(`Server running http://localhost:${PORT}`));
    });
  } catch (error) {
    console.error("Startup error:", error);
    process.exit(1);
  }
};

startServer();