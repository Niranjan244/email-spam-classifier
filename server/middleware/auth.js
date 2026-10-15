const fs = require('fs');
const path = require('path');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const User = require('../models/User');

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

const protect = async (req, res, next) => {
  try {
    let token;
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        data: null,
        message: 'Authentication required'
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');

    let user;
    if (mongoose.connection.readyState === 1) {
      user = await User.findById(decoded.id);
    } else {
      const localUsers = getLocalUsers();
      user = Object.values(localUsers).find(
        (u) => u.id === decoded.id || u.email === decoded.email
      );
    }

    if (!user) {
      return res.status(401).json({
        success: false,
        data: null,
        message: 'User not found'
      });
    }

    if (user.isActive === false) {
      return res.status(403).json({
        success: false,
        data: null,
        message: 'User account is deactivated'
      });
    }

    req.user = {
      id: user._id ? user._id.toString() : user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
      twoFactorEnabled: !!user.twoFactorEnabled,
      avatar: user.avatar || null,
      createdAt: user.createdAt || null
    };

    return next();
  } catch {
    return res.status(401).json({
      success: false,
      data: null,
      message: 'Invalid or expired token'
    });
  }
};

const adminOnly = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    return next();
  }

  return res.status(403).json({
    success: false,
    data: null,
    message: 'Admin access required'
  });
};

module.exports = { protect, adminOnly };
