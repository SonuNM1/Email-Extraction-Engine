import dotenv from "dotenv";
dotenv.config(); 

import app from "./src/app.js";
import chalk from "chalk";
import { connectDB } from "./src/config/db.js";

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