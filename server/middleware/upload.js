const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const multer = require('multer');

const memoryStorage = multer.memoryStorage();

const UPLOADS_DIR = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

const diskStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    if (!fs.existsSync(UPLOADS_DIR)) {
      fs.mkdirSync(UPLOADS_DIR, { recursive: true });
    }
    cb(null, UPLOADS_DIR);
  },
  filename: (_req, file, cb) => {
    const cleanName = path.basename(file.originalname).replace(/[^a-zA-Z0-9.-]/g, '_');
    cb(null, `${Date.now()}-${cleanName}`);
  }
});

const csvFilter = (_req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  const mime = (file.mimetype || '').toLowerCase();
  const isCsv =
    ext === '.csv' ||
    mime === 'text/csv' ||
    mime === 'application/vnd.ms-excel' ||
    mime === 'text/plain';

  if (!isCsv || ext !== '.csv') {
    const error = new Error('Only CSV files are allowed');
    error.statusCode = 400;
    error.isOperational = true;
    return cb(error, false);
  }

  return cb(null, true);
};

const uploadMemory = multer({
  storage: memoryStorage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: csvFilter
}).single('file');

const uploadDisk = multer({
  storage: diskStorage,
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: csvFilter
}).single('file');

const uploadCsv = (req, res, next) => {
  uploadMemory(req, res, (err) => {
    if (err) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({
          success: false,
          data: null,
          message: 'File size exceeds 5MB limit'
        });
      }
      return res.status(400).json({
        success: false,
        data: null,
        message: err.message || 'File upload error'
      });
    }
    return next();
  });
};

const uploadDatasetDisk = (req, res, next) => {
  uploadDisk(req, res, (err) => {
    if (err) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({
          success: false,
          data: null,
          message: 'File size exceeds maximum limit of 50MB'
        });
      }
      return res.status(400).json({
        success: false,
        data: null,
        message: err.message || 'File upload error'
      });
    }
    return next();
  });
};

const AVATARS_DIR = path.join(__dirname, '..', 'uploads', 'avatars');
if (!fs.existsSync(AVATARS_DIR)) {
  fs.mkdirSync(AVATARS_DIR, { recursive: true });
}

const avatarDiskStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    if (!fs.existsSync(AVATARS_DIR)) {
      fs.mkdirSync(AVATARS_DIR, { recursive: true });
    }
    cb(null, AVATARS_DIR);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const randomHex = crypto.randomBytes(16).toString('hex');
    cb(null, `${randomHex}${ext}`);
  }
});

const avatarFilter = (_req, file, cb) => {
  const allowedExtensions = ['.jpg', '.jpeg', '.png', '.webp'];
  const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp'];

  const ext = path.extname(file.originalname).toLowerCase();
  const mime = (file.mimetype || '').toLowerCase();

  if (!allowedExtensions.includes(ext) || !allowedMimeTypes.includes(mime)) {
    const error = new Error('Only JPEG, PNG, and WebP image files are allowed');
    error.statusCode = 400;
    error.isOperational = true;
    return cb(error, false);
  }

  return cb(null, true);
};

const uploadAvatarMulter = multer({
  storage: avatarDiskStorage,
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: avatarFilter
}).single('avatar');

const uploadAvatar = (req, res, next) => {
  uploadAvatarMulter(req, res, (err) => {
    if (err) {
      if (req.file && req.file.path && fs.existsSync(req.file.path)) {
        try {
          fs.unlinkSync(req.file.path);
        } catch {
          // safe ignore
        }
      }
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({
          success: false,
          data: null,
          message: 'File size exceeds maximum limit of 2MB'
        });
      }
      return res.status(400).json({
        success: false,
        data: null,
        message: err.message || 'File upload error'
      });
    }
    return next();
  });
};

module.exports = {
  uploadCsv,
  uploadDatasetDisk,
  uploadAvatar,
  AVATARS_DIR
};
