import mongoose from 'mongoose';

const locationSchema = new mongoose.Schema({
  name: String,
  status: { type: String, default: 'pending' }, // pending | running | done | failed
  emailsFound: { type: Number, default: 0 },
  mapsEmailsFound: { type: Number, default: 0 }, // emails found via Google Maps
}, { _id: false });

const emailSchema = new mongoose.Schema({
  email:        { type: String },
  website:      { type: String },
  location:     { type: String },
  keyword:      { type: String },
  source:       { type: String, default: "google_search" }, // google_search | google_maps
  businessName: { type: String, default: "" },
  phone:        { type: String, default: "" },
  address:      { type: String, default: "" },
}, { _id: false });

const jobSchema = new mongoose.Schema({
  keyword:  { type: String, required: true },
  status:   { type: String, default: 'pending' }, // pending | running | completed | failed
  notifyEmail:      { type: String, default: null },
  pushSubscription: { type: Object, default: null },
  progress: {
    completed:       { type: Number, default: 0 },
    total:           { type: Number, default: 55 },
    currentLocation: { type: String, default: '' },
  },
  locations:   [locationSchema],
  emails:      [emailSchema],
  startedAt:   Date,
  completedAt: Date,
}, { timestamps: true });

export default mongoose.model('Job', jobSchema);