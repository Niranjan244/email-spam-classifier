const mongoose = require('mongoose');

const connectDB = async () => {
  if (process.env.NODE_ENV === 'test') {
    return;
  }

  const mongoUri = process.env.MONGO_URI;

  if (!mongoUri) {
    return;
  }

  try {
    mongoose.connection.on('error', () => {});
    await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 2000
    });
  } catch {
    // Non-fatal fallback allows API services and health endpoints to boot when offline
  }
};

module.exports = connectDB;
