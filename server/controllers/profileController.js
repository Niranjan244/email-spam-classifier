const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const User = require('../models/User');
const { AVATARS_DIR } = require('../middleware/upload');

const LOCAL_USERS_FILE = path.join(__dirname, '..', '.local_users.json');

const getLocalUsers = () => {
  if (fs.existsSync(LOCAL_USERS_FILE)) {
    try {
      return JSON.parse(fs.readFileSync(LOCAL_USERS_FILE, 'utf-8'));
    } catch {
      return {};
    }
  }
  return {};
};

const saveLocalUser = (user) => {
  const users = getLocalUsers();
  users[user.email] = user;
  fs.writeFileSync(LOCAL_USERS_FILE, JSON.stringify(users, null, 2), 'utf-8');
};

const getUserByIdOrEmail = async (id, email, selectPassword = false) => {
  if (mongoose.connection.readyState === 1) {
    let query = User.findById(id);
    if (selectPassword) {
      query = query.select('+password');
    }
    const user = await query;
    if (user) return user;
    if (email) {
      let emailQuery = User.findOne({ email });
      if (selectPassword) {
        emailQuery = emailQuery.select('+password');
      }
      return await emailQuery;
    }
    return null;
  }

  const localUsers = getLocalUsers();
  const user = Object.values(localUsers).find(
    (u) => (id && (u.id === id || u._id === id)) || (email && u.email === email)
  );
  return user || null;
};

const saveUserRecord = async (user) => {
  if (mongoose.connection.readyState === 1 && typeof user.save === 'function') {
    await user.save();
  } else {
    saveLocalUser(user);
  }
};

const deleteAvatarFile = (avatarField) => {
  if (!avatarField || typeof avatarField !== 'string') return;
  const fileName = path.basename(avatarField);
  const filePath = path.join(AVATARS_DIR, fileName);
  if (fs.existsSync(filePath)) {
    try {
      fs.unlinkSync(filePath);
    } catch {
      // safe ignore
    }
  }
};

const getAvatarUrl = (req, avatar) => {
  if (!avatar) return null;
  if (avatar.startsWith('http://') || avatar.startsWith('https://')) return avatar;
  const protocol = req.protocol;
  const host = req.get('host');
  const cleanPath = avatar.startsWith('/') ? avatar : `/${avatar}`;
  return `${protocol}://${host}${cleanPath}`;
};

/**
 * GET /api/profile
 * Returns name, email, role, avatar URL, createdAt
 */
exports.getProfile = async (req, res, next) => {
  try {
    const user = await getUserByIdOrEmail(req.user.id, req.user.email);
    if (!user) {
      return res.status(404).json({
        success: false,
        data: null,
        message: 'User not found'
      });
    }

    const avatarUrl = getAvatarUrl(req, user.avatar);

    return res.status(200).json({
      success: true,
      data: {
        name: user.name,
        email: user.email,
        role: user.role,
        avatar: avatarUrl,
        avatarUrl,
        createdAt: user.createdAt || null
      },
      message: 'Profile retrieved successfully'
    });
  } catch (err) {
    return next(err);
  }
};

/**
 * PATCH /api/profile
 * Updates name only (required, 2 to 60 characters, trimmed).
 * Email is read-only and cannot be changed.
 */
exports.updateProfile = async (req, res, next) => {
  try {
    const user = await getUserByIdOrEmail(req.user.id, req.user.email);
    if (!user) {
      return res.status(404).json({
        success: false,
        data: null,
        message: 'User not found'
      });
    }

    const { name } = req.body;
    const trimmedName = typeof name === 'string' ? name.trim() : '';

    user.name = trimmedName;
    await saveUserRecord(user);

    const avatarUrl = getAvatarUrl(req, user.avatar);

    return res.status(200).json({
      success: true,
      data: {
        name: user.name,
        email: user.email,
        role: user.role,
        avatar: avatarUrl,
        avatarUrl,
        createdAt: user.createdAt || null
      },
      message: 'Profile updated successfully'
    });
  } catch (err) {
    return next(err);
  }
};

/**
 * PATCH /api/profile/password
 * body { currentPassword, newPassword, confirmPassword }
 * Verifies current password, requires min 8 chars, rejects if new equals current, hashes with bcrypt.
 */
exports.changePassword = async (req, res, next) => {
  try {
    const user = await getUserByIdOrEmail(req.user.id, req.user.email, true);
    if (!user) {
      return res.status(404).json({
        success: false,
        data: null,
        message: 'User not found'
      });
    }

    const { currentPassword, newPassword } = req.body;

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({
        success: false,
        data: null,
        message: 'Invalid current password'
      });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;
    await saveUserRecord(user);

    return res.status(200).json({
      success: true,
      data: null,
      message: 'Password updated successfully'
    });
  } catch (err) {
    return next(err);
  }
};

/**
 * POST /api/profile/avatar
 * Multipart field "avatar". Saves new file and deletes previous avatar file from disk.
 */
exports.uploadAvatar = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        data: null,
        message: 'Avatar image file is required'
      });
    }

    const user = await getUserByIdOrEmail(req.user.id, req.user.email);
    if (!user) {
      if (req.file && req.file.path && fs.existsSync(req.file.path)) {
        try {
          fs.unlinkSync(req.file.path);
        } catch {
          // safe ignore
        }
      }
      return res.status(404).json({
        success: false,
        data: null,
        message: 'User not found'
      });
    }

    // Delete previous avatar file if exists
    if (user.avatar) {
      deleteAvatarFile(user.avatar);
    }

    const relativePath = `/uploads/avatars/${req.file.filename}`;
    user.avatar = relativePath;
    await saveUserRecord(user);

    const avatarUrl = getAvatarUrl(req, relativePath);

    return res.status(200).json({
      success: true,
      data: {
        avatar: avatarUrl,
        avatarUrl
      },
      message: 'Photo updated successfully'
    });
  } catch (err) {
    if (req.file && req.file.path && fs.existsSync(req.file.path)) {
      try {
        fs.unlinkSync(req.file.path);
      } catch {
        // safe ignore
      }
    }
    return next(err);
  }
};

/**
 * DELETE /api/profile/avatar
 * Removes the file from disk and clears the field.
 */
exports.deleteAvatar = async (req, res, next) => {
  try {
    const user = await getUserByIdOrEmail(req.user.id, req.user.email);
    if (!user) {
      return res.status(404).json({
        success: false,
        data: null,
        message: 'User not found'
      });
    }

    if (user.avatar) {
      deleteAvatarFile(user.avatar);
      user.avatar = null;
      await saveUserRecord(user);
    }

    return res.status(200).json({
      success: true,
      data: {
        avatar: null,
        avatarUrl: null
      },
      message: 'Photo removed successfully'
    });
  } catch (err) {
    return next(err);
  }
};
