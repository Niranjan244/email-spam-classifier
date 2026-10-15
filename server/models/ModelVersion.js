const mongoose = require('mongoose');

const modelVersionSchema = new mongoose.Schema(
  {
    version: {
      type: String,
      required: true,
      unique: true,
      trim: true
    },
    dataset: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Dataset',
      required: true
    },
    algorithm: {
      type: String,
      required: true,
      trim: true
    },
    accuracy: {
      type: Number,
      required: true
    },
    precision: {
      type: Number,
      required: true
    },
    recall: {
      type: Number,
      required: true
    },
    f1: {
      type: Number,
      required: true
    },
    confusionMatrix: {
      type: mongoose.Schema.Types.Mixed,
      required: true
    },
    isActive: {
      type: Boolean,
      default: false
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('ModelVersion', modelVersionSchema);
