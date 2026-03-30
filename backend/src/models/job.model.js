import mongoose from 'mongoose';

const locationSchema = new mongoose.Schema({
  name: String,
  status: { type: String, default: 'pending' }, // pending | running | done | failed
  emailsFound: { type: Number, default: 0 },
}, { _id: false });

const emailSchema = new mongoose.Schema({
  email: String,
  website: String,
  location: String,
  keyword: String,
}, { _id: false });

const jobSchema = new mongoose.Schema({
  keyword: { type: String, required: true },
  status: { type: String, default: 'pending' }, // pending | running | completed | failed
  progress: {
    completed: { type: Number, default: 0 },
    total: { type: Number, default: 55 },
    currentLocation: { type: String, default: '' },
  },
  locations: [locationSchema],
  emails: [emailSchema],
  startedAt: Date,
  completedAt: Date,
}, { timestamps: true });

export default mongoose.model('Job', jobSchema);