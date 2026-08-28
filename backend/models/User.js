const mongoose = require('mongoose');

const encryptedPayloadSchema = new mongoose.Schema(
  {
    iv: { type: String, required: true },
    ciphertext: { type: String, required: true },
    tag: { type: String, required: true },
  },
  { _id: false },
);

const userSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true, index: true, trim: true, lowercase: true },
    passwordHash: { type: String, required: true, },
    vaultSalt: { type: String, required: true },
    vaultCheck: { type: encryptedPayloadSchema, required: true },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

module.exports = mongoose.model('User', userSchema);
