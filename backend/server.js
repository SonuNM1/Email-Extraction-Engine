import dotenv from "dotenv";
dotenv.config(); 

import webpush from 'web-push'
import app from "./src/app.js";
import chalk from "chalk";
import { connectDB } from "./src/config/db.js";

webpush.setVapidDetails(
  process.env.VAPID_EMAIL,
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    console.log("Serper key:", process.env.SERPER_API_KEY ? "✅ LOADED" : "❌ MISSING");

    console.log("Connecting to DB...");
    await connectDB();

    app.listen(PORT, () => {
      console.log(chalk.bold.green(`Server running http://localhost:${PORT}`));
    });

  } catch (error) {
    console.error("Startup error:", error);
    process.exit(1);
  }
};

startServer();