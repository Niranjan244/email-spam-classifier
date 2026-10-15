const mongoose = require('mongoose');

const classificationSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    emailText: {
      type: String,
      required: true,
      trim: true
    },
    label: {
      type: String,
      enum: ['spam', 'ham'],
      required: true
    },
    spamProbability: {
      type: Number,
      required: true
    },
    confidence: {
      type: Number,
      required: true
    },
    suspiciousTerms: {
      type: [String],
      default: []
    },
    suspiciousPhrases: {
      type: [String],
      default: []
    },
    batch: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Batch',
      default: null
    }
  },
  {
    timestamps: true
  }
);

classificationSchema.index({ user: 1 });
classificationSchema.index({ createdAt: -1 });
classificationSchema.index({ user: 1, createdAt: -1 });
classificationSchema.index({ user: 1, label: 1, createdAt: -1 });

module.exports = mongoose.model('Classification', classificationSchema);
