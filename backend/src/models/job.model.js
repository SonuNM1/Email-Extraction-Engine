import mongoose from 'mongoose';

const emailSchema = new mongoose.Schema({
  email:        { type: String },
  website:      { type: String },
  location:     { type: String },
  keyword:      { type: String },
  source:       { type: String, default: "google_search" },
  businessName: { type: String, default: "" },
  phone:        { type: String, default: "" },
  address:      { type: String, default: "" },
}, { _id: false });

const jobSchema = new mongoose.Schema({
  keyword:           { type: String, required: true },
  location:          { type: String, required: true },
  status:            { type: String, default: 'pending' }, // pending|running|completed|failed|stopped
  emails:            [emailSchema],
  filePath:          { type: String, default: null },
  emailsFound:       { type: Number, default: 0 },
  serperCreditsUsed: { type: Number, default: 0 },
  creditsExhausted:  { type: Boolean, default: false },
  startedAt:         { type: Date },
  completedAt:       { type: Date },
  stoppedAt:         { type: Date, default: null },
}, { timestamps: true });

export default mongoose.model('Job', jobSchema);