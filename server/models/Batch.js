const mongoose = require('mongoose');

const batchSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    fileName: {
      type: String,
      required: true,
      trim: true
    },
    total: {
      type: Number,
      required: true,
      default: 0
    },
    spamCount: {
      type: Number,
      required: true,
      default: 0
    },
    hamCount: {
      type: Number,
      required: true,
      default: 0
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('Batch', batchSchema);
