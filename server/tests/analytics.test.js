const fs = require('fs');
const path = require('path');
const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../server');
const Classification = require('../models/Classification');

const LOCAL_USERS_FILE = path.join(__dirname, '..', '.local_users.json');
const LOCAL_CLASSIFICATIONS_FILE = path.join(__dirname, '..', '.local_classifications.json');

describe('Analytics & Raw Data Endpoints', () => {
  let originalUsers = null;
  let originalClassifications = null;

  let userAId, tokenA;
  let userBId, tokenB;
  const userAEmail = `analytics_a_${Date.now()}@example.com`;
  const userBEmail = `analytics_b_${Date.now()}@example.com`;
  const password = 'Password123!';

  const createdDocIds = [];

  beforeAll(async () => {
    if (fs.existsSync(LOCAL_USERS_FILE)) {
      originalUsers = fs.readFileSync(LOCAL_USERS_FILE, 'utf-8');
    }
    if (fs.existsSync(LOCAL_CLASSIFICATIONS_FILE)) {
      originalClassifications = fs.readFileSync(LOCAL_CLASSIFICATIONS_FILE, 'utf-8');
    }

    // Register User A
    const resA = await request(app).post('/api/auth/register').send({
      name: 'Analytics User A',
      email: userAEmail,
      password,
      twoFactorEnabled: false
    });
    tokenA = resA.body.data.token;
    userAId = resA.body.data.user.id || resA.body.data.user._id;

    // Register User B
    const resB = await request(app).post('/api/auth/register').send({
      name: 'Analytics User B',
      email: userBEmail,
      password,
      twoFactorEnabled: false
    });
    tokenB = resB.body.data.token;
    userBId = resB.body.data.user.id || resB.body.data.user._id;

    // Seed test classification records
    const sampleDocsA = [
      {
        user: userAId,
        emailText: 'Special discount prize! Claim your urgent gift now. ' + 'x'.repeat(250),
        label: 'spam',
        spamProbability: 0.95,
        confidence: 0.92,
        suspiciousTerms: ['discount', 'prize', 'urgent', 'gift'],
        suspiciousPhrases: ['claim your urgent gift'],
        createdAt: new Date('2026-10-10T10:00:00.000Z')
      },
      {
        user: userAId,
        emailText: 'Quarterly review team sync meeting agenda.',
        label: 'ham',
        spamProbability: 0.04,
        confidence: 0.96,
        suspiciousTerms: [],
        suspiciousPhrases: [],
        createdAt: new Date('2026-10-12T14:30:00.000Z')
      },
      {
        user: userAId,
        emailText: 'Urgent security verification required for your account.',
        label: 'spam',
        spamProbability: 0.88,
        confidence: 0.89,
        suspiciousTerms: ['urgent', 'security', 'verification'],
        suspiciousPhrases: ['verification required'],
        createdAt: new Date('2026-10-14T08:15:00.000Z')
      }
    ];

    const sampleDocsB = [
      {
        user: userBId,
        emailText: 'User B private confidential payroll document.',
        label: 'spam',
        spamProbability: 0.77,
        confidence: 0.8,
        suspiciousTerms: ['confidential', 'payroll'],
        suspiciousPhrases: [],
        createdAt: new Date('2026-10-13T12:00:00.000Z')
      }
    ];

    if (mongoose.connection.readyState === 1) {
      const insertedA = await Classification.insertMany(sampleDocsA);
      const insertedB = await Classification.insertMany(sampleDocsB);
      createdDocIds.push(...insertedA.map((d) => d._id), ...insertedB.map((d) => d._id));
    } else {
      let current = [];
      if (fs.existsSync(LOCAL_CLASSIFICATIONS_FILE)) {
        try {
          current = JSON.parse(fs.readFileSync(LOCAL_CLASSIFICATIONS_FILE, 'utf-8'));
        } catch {
          current = [];
        }
      }
      const localDocs = [...sampleDocsA, ...sampleDocsB].map((doc, idx) => ({
        ...doc,
        _id: `mock-class-${Date.now()}-${idx}`,
        id: `mock-class-${Date.now()}-${idx}`
      }));
      fs.writeFileSync(
        LOCAL_CLASSIFICATIONS_FILE,
        JSON.stringify([...current, ...localDocs], null, 2),
        'utf-8'
      );
    }
  });

  afterAll(async () => {
    if (mongoose.connection.readyState === 1 && createdDocIds.length > 0) {
      await Classification.deleteMany({ _id: { $in: createdDocIds } });
    }
    if (originalUsers !== null) {
      fs.writeFileSync(LOCAL_USERS_FILE, originalUsers, 'utf-8');
    }
    if (originalClassifications !== null) {
      fs.writeFileSync(LOCAL_CLASSIFICATIONS_FILE, originalClassifications, 'utf-8');
    }
  });

  describe('Authentication protection', () => {
    test('rejects unauthenticated requests to /api/analytics', async () => {
      const res = await request(app).get('/api/analytics');
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    test('rejects unauthenticated requests to /api/analytics/raw', async () => {
      const res = await request(app).get('/api/analytics/raw');
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    test('rejects unauthenticated requests to /api/analytics/raw/export', async () => {
      const res = await request(app).get('/api/analytics/raw/export');
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });

  describe('GET /api/analytics (with date filtering)', () => {
    test('returns aggregate analytics for user A', async () => {
      const res = await request(app).get('/api/analytics').set('Authorization', `Bearer ${tokenA}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.total).toBe(3);
      expect(res.body.data.spam).toBe(2);
      expect(res.body.data.ham).toBe(1);
    });

    test('filters analytics by from and to date range', async () => {
      const res = await request(app)
        .get('/api/analytics?from=2026-10-11&to=2026-10-13')
        .set('Authorization', `Bearer ${tokenA}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.total).toBe(1);
      expect(res.body.data.spam).toBe(0);
      expect(res.body.data.ham).toBe(1);
    });
  });

  describe('GET /api/analytics/raw', () => {
    test('returns paginated classifications with 200 char truncated text', async () => {
      const res = await request(app)
        .get('/api/analytics/raw?page=1&limit=10')
        .set('Authorization', `Bearer ${tokenA}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('rows');
      expect(res.body.data).toHaveProperty('total', 3);
      expect(res.body.data).toHaveProperty('page', 1);
      expect(res.body.data).toHaveProperty('limit', 10);

      const rows = res.body.data.rows;
      expect(rows.length).toBe(3);

      const longDoc = rows.find((r) => r.emailText.includes('Special discount'));
      expect(longDoc).toBeDefined();
      expect(longDoc.emailText.length).toBeLessThanOrEqual(200);
      expect(longDoc).toHaveProperty('spamProbability');
      expect(longDoc).toHaveProperty('confidence');
      expect(longDoc).toHaveProperty('suspiciousTerms');
      expect(longDoc).toHaveProperty('suspiciousPhrases');
    });

    test('filters by label (spam only)', async () => {
      const res = await request(app)
        .get('/api/analytics/raw?label=spam')
        .set('Authorization', `Bearer ${tokenA}`);

      expect(res.status).toBe(200);
      expect(res.body.data.total).toBe(2);
      expect(res.body.data.rows.every((r) => r.label === 'spam')).toBe(true);
    });

    test('filters by search keyword', async () => {
      const res = await request(app)
        .get('/api/analytics/raw?search=agenda')
        .set('Authorization', `Bearer ${tokenA}`);

      expect(res.status).toBe(200);
      expect(res.body.data.total).toBe(1);
      expect(res.body.data.rows[0].emailText).toContain('agenda');
    });

    test('filters by date range (from and to)', async () => {
      const res = await request(app)
        .get('/api/analytics/raw?from=2026-10-11&to=2026-10-13')
        .set('Authorization', `Bearer ${tokenA}`);

      expect(res.status).toBe(200);
      expect(res.body.data.total).toBe(1);
      expect(res.body.data.rows[0].label).toBe('ham');
    });

    test('sorts by confidence in ascending order', async () => {
      const res = await request(app)
        .get('/api/analytics/raw?sortBy=confidence&order=asc')
        .set('Authorization', `Bearer ${tokenA}`);

      expect(res.status).toBe(200);
      const rows = res.body.data.rows;
      expect(rows.length).toBe(3);
      expect(rows[0].confidence).toBeLessThanOrEqual(rows[1].confidence);
      expect(rows[1].confidence).toBeLessThanOrEqual(rows[2].confidence);
    });

    test('enforces strict user isolation: User A cannot see User B data', async () => {
      const resA = await request(app)
        .get('/api/analytics/raw')
        .set('Authorization', `Bearer ${tokenA}`);

      const rowsA = resA.body.data.rows;
      expect(rowsA.some((r) => r.emailText.includes('payroll'))).toBe(false);

      const resB = await request(app)
        .get('/api/analytics/raw')
        .set('Authorization', `Bearer ${tokenB}`);

      const rowsB = resB.body.data.rows;
      expect(rowsB.length).toBe(1);
      expect(rowsB[0].emailText).toContain('payroll');
    });
  });

  describe('GET /api/analytics/raw/export', () => {
    test('returns CSV file with correct headers and escaping', async () => {
      const res = await request(app)
        .get('/api/analytics/raw/export')
        .set('Authorization', `Bearer ${tokenA}`);

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toMatch(/text\/csv/);
      expect(res.headers['content-disposition']).toMatch(
        /attachment; filename="classification-records.csv"/
      );

      const csvLines = res.text.split('\r\n').filter(Boolean);
      expect(csvLines[0]).toBe(
        'Date,Email Text,Label,Spam Probability,Confidence,Suspicious Terms'
      );
      // Header + 3 rows = 4 lines
      expect(csvLines.length).toBe(4);
      expect(res.text).not.toContain('payroll');
    });

    test('respects filters in CSV export', async () => {
      const res = await request(app)
        .get('/api/analytics/raw/export?label=ham')
        .set('Authorization', `Bearer ${tokenA}`);

      expect(res.status).toBe(200);
      const csvLines = res.text.split('\r\n').filter(Boolean);
      expect(csvLines.length).toBe(2); // Header + 1 row
      expect(res.text).toContain('meeting agenda');
    });
  });
});
