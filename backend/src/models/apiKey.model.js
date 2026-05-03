import mongoose from "mongoose";

const apiKeySchema = new mongoose.Schema({
  key:               { type: String, required: true, unique: true },
  creditsRemaining:  { type: Number, default: null },
  lastChecked:       { type: Date,   default: null },
}, { timestamps: true });

export default mongoose.model("ApiKey", apiKeySchema);