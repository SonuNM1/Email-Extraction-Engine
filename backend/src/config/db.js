import dns from "dns";
import mongoose from "mongoose";
import chalk from "chalk";

export const connectDB = async () => {
  try {
    dns.setServers(["8.8.8.8", "1.1.1.1"]);

    console.log(chalk.bold.yellow("Connecting to DB..."));

    const uri = process.env.MONGO_URI;

    if (!uri) {
      throw new Error("MONGO_URI is missing in .env");
    }

    await mongoose.connect(uri);

    console.log(chalk.bold.green("Database Connected ✅"));
  } catch (error) {
    console.error(chalk.bold.red("DB Connection error:", error.message));
    process.exit(1);
  }
};