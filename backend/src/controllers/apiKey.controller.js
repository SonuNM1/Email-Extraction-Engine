import ApiKey from "../models/apiKey.model.js";

export const getAllKeys = async (req, res) => {
  const keys = await ApiKey.find().sort({ createdAt: -1 });
  res.json(keys);
};

export const addKey = async (req, res) => {
  const { key } = req.body;
  if (!key) return res.status(400).json({ error: "Key is required" });

  const existing = await ApiKey.findOne({ key });
  if (existing) return res.status(409).json({ error: "Key already exists" });

  const newKey = await ApiKey.create({ key });
  res.status(201).json(newKey);
};

export const deleteKey = async (req, res) => {
  await ApiKey.findByIdAndDelete(req.params.id);
  res.json({ success: true });
};

export const updateCredits = async (req, res) => {
  const { key, creditsRemaining } = req.body;
  const updated = await ApiKey.findOneAndUpdate(
    { key },
    { creditsRemaining, lastChecked: new Date() },
    { new: true }
  );
  res.json(updated);
};