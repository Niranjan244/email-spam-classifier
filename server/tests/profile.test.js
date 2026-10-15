const fs = require('fs');
const path = require('path');
const request = require('supertest');
const app = require('../server');

const LOCAL_USERS_FILE = path.join(__dirname, '..', '.local_users.json');
const AVATARS_DIR = path.join(__dirname, '..', 'uploads', 'avatars');

describe('Profile Endpoints & Isolation', () => {
  let originalUsersContent = null;
  const userAEmail = `profile_user_a_${Date.now()}@example.com`;
  const userAPassword = 'Password123!';
  const userAName = 'User Alpha';
  let tokenA;

  const userBEmail = `profile_user_b_${Date.now()}@example.com`;
  const userBPassword = 'Password456!';
  const userBName = 'User Beta';
  let tokenB;

  beforeAll(async () => {
    if (fs.existsSync(LOCAL_USERS_FILE)) {
      originalUsersContent = fs.readFileSync(LOCAL_USERS_FILE, 'utf-8');
    }

    // Register User A
    const resA = await request(app).post('/api/auth/register').send({
      name: userAName,
      email: userAEmail,
      password: userAPassword,
      twoFactorEnabled: false
    });
    tokenA = resA.body.data.token;

    // Register User B
    const resB = await request(app).post('/api/auth/register').send({
      name: userBName,
      email: userBEmail,
      password: userBPassword,
      twoFactorEnabled: false
    });
    tokenB = resB.body.data.token;
  });

  afterAll(() => {
    if (originalUsersContent !== null) {
      fs.writeFileSync(LOCAL_USERS_FILE, originalUsersContent, 'utf-8');
    }
  });

  describe('GET /api/profile', () => {
    test('rejects unauthenticated request', async () => {
      const res = await request(app).get('/api/profile');
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    test('returns user profile with name, email, role, avatar URL, createdAt', async () => {
      const res = await request(app).get('/api/profile').set('Authorization', `Bearer ${tokenA}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toMatchObject({
        name: userAName,
        email: userAEmail.toLowerCase(),
        role: 'user',
        avatar: null
      });
      expect(res.body.data).toHaveProperty('avatarUrl');
      expect(res.body.data).toHaveProperty('createdAt');
      expect(res.body.data).not.toHaveProperty('password');
    });
  });

  describe('PATCH /api/profile (name update only)', () => {
    test('successfully updates name (2 to 60 chars, trimmed)', async () => {
      const res = await request(app)
        .patch('/api/profile')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({
          name: '  Updated Alpha Name  '
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe('Updated Alpha Name');

      // Verify persistence via GET /api/profile
      const getRes = await request(app)
        .get('/api/profile')
        .set('Authorization', `Bearer ${tokenA}`);
      expect(getRes.body.data.name).toBe('Updated Alpha Name');
    });

    test('ignores attempts to change email (email is read-only)', async () => {
      const res = await request(app)
        .patch('/api/profile')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({
          name: 'Alpha Valid Name',
          email: 'hacked_email@example.com'
        });

      expect(res.status).toBe(200);
      expect(res.body.data.email).toBe(userAEmail.toLowerCase());

      const getRes = await request(app)
        .get('/api/profile')
        .set('Authorization', `Bearer ${tokenA}`);
      expect(getRes.body.data.email).toBe(userAEmail.toLowerCase());
    });

    test('rejects empty or whitespace-only name', async () => {
      const res = await request(app)
        .patch('/api/profile')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({ name: '   ' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/(between 2 and 60 characters|Name is required)/i);
    });

    test('rejects name shorter than 2 characters', async () => {
      const res = await request(app)
        .patch('/api/profile')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({ name: 'A' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/between 2 and 60 characters/i);
    });

    test('rejects name longer than 60 characters', async () => {
      const res = await request(app)
        .patch('/api/profile')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({ name: 'A'.repeat(61) });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/between 2 and 60 characters/i);
    });
  });

  describe('PATCH /api/profile/password', () => {
    test('rejects when current password is wrong', async () => {
      const res = await request(app)
        .patch('/api/profile/password')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({
          currentPassword: 'WrongPassword999!',
          newPassword: 'BrandNewPassword123!',
          confirmPassword: 'BrandNewPassword123!'
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/invalid current password/i);
    });

    test('rejects when new password equals current password', async () => {
      const res = await request(app)
        .patch('/api/profile/password')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({
          currentPassword: userAPassword,
          newPassword: userAPassword,
          confirmPassword: userAPassword
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/must be different/i);
    });

    test('rejects when new password is less than 8 characters', async () => {
      const res = await request(app)
        .patch('/api/profile/password')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({
          currentPassword: userAPassword,
          newPassword: 'short',
          confirmPassword: 'short'
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/at least 8 characters/i);
    });

    test('rejects when new password and confirmPassword do not match', async () => {
      const res = await request(app)
        .patch('/api/profile/password')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({
          currentPassword: userAPassword,
          newPassword: 'BrandNewPassword123!',
          confirmPassword: 'MismatchPassword123!'
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/do not match/i);
    });

    test('successfully changes password and allows login with new password', async () => {
      const newPass = 'BrandNewPassword123!';
      const res = await request(app)
        .patch('/api/profile/password')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({
          currentPassword: userAPassword,
          newPassword: newPass,
          confirmPassword: newPass
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toMatch(/password updated successfully/i);

      // Old password should fail
      const failedLogin = await request(app).post('/api/auth/login').send({
        email: userAEmail,
        password: userAPassword
      });
      expect(failedLogin.status).toBe(401);

      // New password should succeed
      const successfulLogin = await request(app).post('/api/auth/login').send({
        email: userAEmail,
        password: newPass
      });
      expect(successfulLogin.status).toBe(200);
      expect(successfulLogin.body.success).toBe(true);
      tokenA = successfulLogin.body.data.token;
    });
  });

  describe('Avatar Upload, Replacement, and Deletion', () => {
    let uploadedFile1;
    let uploadedFile2;

    afterAll(() => {
      // Clean up any test avatar files
      if (uploadedFile1 && fs.existsSync(uploadedFile1)) {
        try {
          fs.unlinkSync(uploadedFile1);
        } catch {}
      }
      if (uploadedFile2 && fs.existsSync(uploadedFile2)) {
        try {
          fs.unlinkSync(uploadedFile2);
        } catch {}
      }
    });

    test('rejects non-image file (e.g. PDF)', async () => {
      const fakePdf = Buffer.from('%PDF-1.4 Fake PDF Content');
      const res = await request(app)
        .post('/api/profile/avatar')
        .set('Authorization', `Bearer ${tokenA}`)
        .attach('avatar', fakePdf, 'document.pdf');

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/Only JPEG, PNG, and WebP/i);
    });

    test('rejects file exceeding 2MB', async () => {
      const largePng = Buffer.alloc(2.5 * 1024 * 1024, 0);
      const res = await request(app)
        .post('/api/profile/avatar')
        .set('Authorization', `Bearer ${tokenA}`)
        .attach('avatar', largePng, 'large.png');

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/2MB/i);
    });

    test('successfully uploads valid PNG avatar', async () => {
      // 1x1 transparent PNG buffer
      const pngBuffer = Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
        'base64'
      );

      const res = await request(app)
        .post('/api/profile/avatar')
        .set('Authorization', `Bearer ${tokenA}`)
        .attach('avatar', pngBuffer, 'test-original-name.png');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('avatar');
      expect(res.body.data.avatar).toMatch(/\/uploads\/avatars\/[a-f0-9]+\.png/);

      // Verify original name was not used
      expect(res.body.data.avatar).not.toMatch(/test-original-name/);

      const fileName = path.basename(res.body.data.avatar);
      uploadedFile1 = path.join(AVATARS_DIR, fileName);
      expect(fs.existsSync(uploadedFile1)).toBe(true);
    });

    test('replacing avatar uploads new file and deletes old file from disk', async () => {
      // 1x1 JPEG buffer
      const jpegBuffer = Buffer.from(
        '/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=',
        'base64'
      );

      const res = await request(app)
        .post('/api/profile/avatar')
        .set('Authorization', `Bearer ${tokenA}`)
        .attach('avatar', jpegBuffer, 'new-photo.jpg');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.avatar).toMatch(/\/uploads\/avatars\/[a-f0-9]+\.jpg/);

      const fileName = path.basename(res.body.data.avatar);
      uploadedFile2 = path.join(AVATARS_DIR, fileName);
      expect(fs.existsSync(uploadedFile2)).toBe(true);

      // Verify old file was deleted from disk!
      expect(fs.existsSync(uploadedFile1)).toBe(false);
    });

    test('DELETE /api/profile/avatar removes file from disk and clears field', async () => {
      const res = await request(app)
        .delete('/api/profile/avatar')
        .set('Authorization', `Bearer ${tokenA}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.avatar).toBeNull();

      // Verify file deleted from disk
      expect(fs.existsSync(uploadedFile2)).toBe(false);

      // Verify GET /api/profile confirms avatar is null
      const getRes = await request(app)
        .get('/api/profile')
        .set('Authorization', `Bearer ${tokenA}`);
      expect(getRes.body.data.avatar).toBeNull();
    });
  });

  describe('Strict User Isolation', () => {
    test('User B cannot see or modify User A profile data', async () => {
      const resA = await request(app).get('/api/profile').set('Authorization', `Bearer ${tokenA}`);

      const resB = await request(app).get('/api/profile').set('Authorization', `Bearer ${tokenB}`);

      expect(resA.body.data.email).toBe(userAEmail.toLowerCase());
      expect(resB.body.data.email).toBe(userBEmail.toLowerCase());
      expect(resA.body.data.email).not.toBe(resB.body.data.email);

      // Updating User B has zero impact on User A
      await request(app)
        .patch('/api/profile')
        .set('Authorization', `Bearer ${tokenB}`)
        .send({ name: 'User Beta Renamed' });

      const checkA = await request(app)
        .get('/api/profile')
        .set('Authorization', `Bearer ${tokenA}`);
      expect(checkA.body.data.name).not.toBe('User Beta Renamed');
    });
  });
});
