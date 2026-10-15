const axios = require('axios');

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://localhost:8000';

const client = axios.create({
  baseURL: ML_SERVICE_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json'
  }
});

const handleAxiosError = (error) => {
  if (
    !error.response ||
    error.code === 'ECONNREFUSED' ||
    error.code === 'ECONNABORTED' ||
    error.code === 'ETIMEDOUT' ||
    error.code === 'ENOTFOUND'
  ) {
    const serviceError = new Error(
      'ML service is unavailable. Please ensure the ML service is running.'
    );
    serviceError.statusCode = 503;
    serviceError.isOperational = true;
    throw serviceError;
  }

  const message = error.response.data?.message || 'ML service request failed';
  const statusCode = error.response.status || 500;
  const serviceError = new Error(message);
  serviceError.statusCode = statusCode;
  serviceError.isOperational = true;
  throw serviceError;
};

const predict = async (text) => {
  try {
    const response = await client.post('/predict', { text });
    return response.data.data;
  } catch (error) {
    return handleAxiosError(error);
  }
};

const predictBatch = async (texts) => {
  try {
    const response = await client.post('/predict-batch', { texts }, { timeout: 30000 });
    return response.data.data;
  } catch (error) {
    return handleAxiosError(error);
  }
};

const train = async (payload) => {
  try {
    const response = await client.post('/train', payload, {
      timeout: 120000
    });
    return response.data.data;
  } catch (error) {
    return handleAxiosError(error);
  }
};

const activate = async (version) => {
  try {
    const response = await client.post('/activate', { version });
    return response.data.data;
  } catch (error) {
    return handleAxiosError(error);
  }
};

module.exports = {
  predict,
  predictBatch,
  train,
  activate
};
