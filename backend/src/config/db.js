import dns from "dns";
import mongoose from "mongoose"
import chalk from "chalk" ; 

export const connectDB = async () => {
  try {
    dns.setServers(["8.8.8.8", "1.1.1.1"]);

    console.log(chalk.bold.yellow("Connecting to DB..."));

    await mongoose.connect(process.env.MONGODB_URI);

    console.log(chalk.bold.green("Database Connected ✅"));
  } catch (error) {
    console.error(chalk.bold.red("DB Connection error: ", error));
    process.exit(1);
  }
};
