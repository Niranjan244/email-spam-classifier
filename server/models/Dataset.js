const mongoose = require('mongoose');

const datasetSchema = new mongoose.Schema(
  {
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    name: {
      type: String,
      required: true,
      trim: true
    },
    filePath: {
      type: String,
      required: true,
      trim: true
    },
    rowCount: {
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

module.exports = mongoose.model('Dataset', datasetSchema);
