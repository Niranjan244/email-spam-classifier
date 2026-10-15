const fs = require('fs');
const path = require('path');
const request = require('supertest');
const app = require('../server');

const LOCAL_USERS_FILE = path.join(__dirname, '..', '.local_users.json');

describe('Auth Endpoints & Middleware', () => {
  let originalUsersContent = null;
  const testEmail = `test_auth_${Date.now()}@example.com`;
  const testPassword = 'Password123!';
  const testName = 'Test Supertest User';

  beforeAll(() => {
    if (fs.existsSync(LOCAL_USERS_FILE)) {
      originalUsersContent = fs.readFileSync(LOCAL_USERS_FILE, 'utf-8');
    }
  });

  afterAll(() => {
    if (originalUsersContent !== null) {
      fs.writeFileSync(LOCAL_USERS_FILE, originalUsersContent, 'utf-8');
    }
  });

  describe('POST /api/auth/register', () => {
    test('successfully registers a new user', async () => {
      const res = await request(app).post('/api/auth/register').send({
        name: testName,
        email: testEmail,
        password: testPassword
      });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('token');
      expect(res.body.data.user).toMatchObject({
        name: testName,
        email: testEmail.toLowerCase(),
        role: 'user'
      });
    });

    test('rejects registration with duplicate email', async () => {
      const res = await request(app).post('/api/auth/register').send({
        name: testName,
        email: testEmail,
        password: testPassword
      });

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/already registered/i);
    });

    test('rejects registration with invalid input (short password)', async () => {
      const res = await request(app).post('/api/auth/register').send({
        name: 'Short Pass',
        email: 'shortpass@example.com',
        password: '123'
      });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/at least 8 characters/i);
    });
  });

  describe('POST /api/auth/login', () => {
    test('successfully logs in with valid credentials', async () => {
      const res = await request(app).post('/api/auth/login').send({
        email: testEmail,
        password: testPassword
      });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('token');
      expect(res.body.data.user.email).toBe(testEmail.toLowerCase());
    });

    test('rejects login with incorrect password', async () => {
      const res = await request(app).post('/api/auth/login').send({
        email: testEmail,
        password: 'WrongPassword123!'
      });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/invalid email or password/i);
    });

    test('rejects login for unregistered email', async () => {
      const res = await request(app).post('/api/auth/login').send({
        email: 'nonexistent_user_999@example.com',
        password: 'Password123!'
      });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/invalid email or password/i);
    });
  });

  describe('Protected Route (protect middleware)', () => {
    let validToken;

    beforeAll(async () => {
      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({ email: testEmail, password: testPassword });
      validToken = loginRes.body.data.token;
    });

    test('rejects access without Authorization header', async () => {
      const res = await request(app).get('/api/auth/me');

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/authentication required/i);
    });

    test('rejects access with invalid or malformed token', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer invalid.token.signature');

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/invalid or expired token/i);
    });

    test('allows access to protected route with valid token', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${validToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.email).toBe(testEmail.toLowerCase());
    });
  });

  describe('Admin Route (adminOnly middleware)', () => {
    let regularUserToken;
    let adminToken;

    beforeAll(async () => {
      // 1. Regular user token
      const regRes = await request(app)
        .post('/api/auth/login')
        .send({ email: testEmail, password: testPassword });
      regularUserToken = regRes.body.data.token;

      // 2. Admin user token
      const adminRes = await request(app)
        .post('/api/auth/login')
        .send({ email: 'admin@admin.com', password: 'AdminPass123!' });
      adminToken = adminRes.body.data?.token;
    });

    test('blocks regular user from accessing admin route (403 Forbidden)', async () => {
      const res = await request(app)
        .get('/api/admin/users')
        .set('Authorization', `Bearer ${regularUserToken}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/admin access required/i);
    });

    test('allows admin user to access admin route (200 OK)', async () => {
      expect(adminToken).toBeDefined();

      const res = await request(app)
        .get('/api/admin/users')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('users');
      expect(Array.isArray(res.body.data.users)).toBe(true);
    });
  });

  describe('Password Reset Flow', () => {
    let resetToken;
    const newPassword = 'NewSecretPassword123!';

    test('generates password reset link for registered email', async () => {
      const res = await request(app).post('/api/auth/forgot-password').send({ email: testEmail });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('resetToken');
      expect(res.body.data).toHaveProperty('resetUrl');
      resetToken = res.body.data.resetToken;
    });

    test('rejects forgot password for non-existent email', async () => {
      const res = await request(app)
        .post('/api/auth/forgot-password')
        .send({ email: 'unknown_never_registered@example.com' });

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });

    test('successfully resets password with valid token', async () => {
      const res = await request(app)
        .post(`/api/auth/reset-password/${resetToken}`)
        .send({ newPassword });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({ email: testEmail, password: newPassword });

      expect(loginRes.status).toBe(200);
      expect(loginRes.body.success).toBe(true);
    });

    test('rejects reset password with expired or invalid token', async () => {
      const res = await request(app)
        .post('/api/auth/reset-password/invalid_nonexistent_token_12345')
        .send({ newPassword: 'AnotherPassword123!' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  describe('Two-Step Verification (Email OTP) Flow', () => {
    const mfaEmail = `mfa_user_${Date.now()}@example.com`;
    const mfaPassword = 'MfaPassword123!';
    let userToken;
    let tempMfaToken;
    let validMfaCode;

    beforeAll(async () => {
      const regRes = await request(app).post('/api/auth/register').send({
        name: 'MFA Tester',
        email: mfaEmail,
        password: mfaPassword
      });
      userToken = regRes.body.data.token;

      // Enable 2FA for this user
      await request(app)
        .put('/api/auth/2fa/toggle')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ enabled: true });
    });

    test('login with 2FA enabled returns mfaRequired and tempToken', async () => {
      const res = await request(app).post('/api/auth/login').send({
        email: mfaEmail,
        password: mfaPassword
      });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.mfaRequired).toBe(true);
      expect(res.body.data).toHaveProperty('tempToken');
      expect(res.body.data).toHaveProperty('devCode');
      tempMfaToken = res.body.data.tempToken;
      validMfaCode = res.body.data.devCode;
    });

    test('rejects verify-2fa with invalid 6-digit code', async () => {
      const res = await request(app).post('/api/auth/verify-2fa').send({
        tempToken: tempMfaToken,
        code: '000000'
      });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/incorrect verification code/i);
    });

    test('resends 2FA code successfully', async () => {
      const res = await request(app).post('/api/auth/resend-2fa').send({
        tempToken: tempMfaToken
      });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('devCode');
      validMfaCode = res.body.data.devCode;
    });

    test('successfully logs in with valid 2FA code', async () => {
      const res = await request(app).post('/api/auth/verify-2fa').send({
        tempToken: tempMfaToken,
        code: validMfaCode
      });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('token');
      expect(res.body.data.user.email).toBe(mfaEmail.toLowerCase());
      expect(res.body.data.user.twoFactorEnabled).toBe(true);
    });
  });
});
