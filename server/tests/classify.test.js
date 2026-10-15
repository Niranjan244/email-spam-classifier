const fs = require('fs');
const path = require('path');
const request = require('supertest');
const app = require('../server');
const mlClient = require('../services/mlClient');

// Mock ML client module
jest.mock('../services/mlClient', () => ({
  predict: jest.fn(),
  predictBatch: jest.fn(),
  train: jest.fn(),
  activate: jest.fn()
}));

const LOCAL_CLASSIFICATIONS_FILE = path.join(__dirname, '..', '.local_classifications.json');

describe('Classify Endpoints', () => {
  let authToken;
  let originalClassificationsContent = null;

  beforeAll(async () => {
    // Preserve local classifications data
    if (fs.existsSync(LOCAL_CLASSIFICATIONS_FILE)) {
      originalClassificationsContent = fs.readFileSync(LOCAL_CLASSIFICATIONS_FILE, 'utf-8');
    }

    // Login as admin to get an authenticated user token
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@admin.com', password: 'AdminPass123!' });

    authToken = loginRes.body.data?.token;
  });

  afterAll(() => {
    // Restore local classifications data
    if (originalClassificationsContent !== null) {
      fs.writeFileSync(LOCAL_CLASSIFICATIONS_FILE, originalClassificationsContent, 'utf-8');
    }
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/classify (single text classification)', () => {
    test('successfully classifies valid text with mocked ML response', async () => {
      const mockResult = {
        label: 'spam',
        spam_probability: 0.985,
        confidence: 0.985,
        suspicious_terms: ['winner', 'prize', 'claim'],
        suspicious_phrases: ['claim prize']
      };
      mlClient.predict.mockResolvedValueOnce(mockResult);

      const res = await request(app)
        .post('/api/classify')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ text: 'Congratulations! You have won a $1,000 lottery prize. Claim now!' });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toMatchObject({
        label: 'spam',
        spamProbability: 0.985,
        confidence: 0.985,
        suspiciousTerms: ['winner', 'prize', 'claim'],
        suspiciousPhrases: ['claim prize']
      });
      expect(mlClient.predict).toHaveBeenCalledTimes(1);
    });

    test('rejects classification with empty or missing text', async () => {
      const res = await request(app)
        .post('/api/classify')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ text: '   ' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/required and cannot be empty/i);
      expect(mlClient.predict).not.toHaveBeenCalled();
    });

    test('rejects classification exceeding maximum character length', async () => {
      const oversizedText = 'a'.repeat(20001);

      const res = await request(app)
        .post('/api/classify')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ text: oversizedText });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/cannot exceed 20,000 characters/i);
      expect(mlClient.predict).not.toHaveBeenCalled();
    });

    test('handles ML service down with 503 response and clear error message', async () => {
      const serviceError = new Error(
        'ML service is unavailable. Please ensure the ML service is running.'
      );
      serviceError.statusCode = 503;
      serviceError.isOperational = true;
      mlClient.predict.mockRejectedValueOnce(serviceError);

      const res = await request(app)
        .post('/api/classify')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ text: 'Meeting rescheduled to tomorrow morning at 10am.' });

      expect(res.status).toBe(503);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/ML service is unavailable/i);
    });
  });
});
