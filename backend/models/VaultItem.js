const mongoose = require('mongoose');

const encryptedPayloadSchema = new mongoose.Schema(
  {
    iv: { type: String, required: true },
    ciphertext: { type: String, required: true },
    tag: { type: String, required: true },
  },
  { _id: false },
);

const vaultItemSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    localId: { type: String, required: true, index: true },
    encryptedPayload: { type: encryptedPayloadSchema, required: true },
    syncedAt: { type: String },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

vaultItemSchema.index({ userId: 1, localId: 1 }, { unique: true });

module.exports = mongoose.model('VaultItem', vaultItemSchema);
