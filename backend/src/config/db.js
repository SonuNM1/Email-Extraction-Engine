import dns from "dns";
import mongoose from "mongoose"

export const connectDB = async () => {
  try {
    dns.setServers(["8.8.8.8", "1.1.1.1"]);

    console.log("Connecting to DB...");

    await mongoose.connect(process.env.MONGODB_URI);

    console.log(("Database Connected ✅"));
  } catch (error) {
    console.error("DB Connection error: ", error);
    process.exit(1);
  }
};
