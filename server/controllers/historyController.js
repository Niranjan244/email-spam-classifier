const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const Classification = require('../models/Classification');

const LOCAL_CLASSIFICATIONS_FILE = path.join(__dirname, '..', '.local_classifications.json');

const getLocalClassifications = () => {
  if (fs.existsSync(LOCAL_CLASSIFICATIONS_FILE)) {
    try {
      return JSON.parse(fs.readFileSync(LOCAL_CLASSIFICATIONS_FILE, 'utf-8'));
    } catch {
      return [];
    }
  }
  return [];
};

const saveLocalClassifications = (classifications) => {
  fs.writeFileSync(LOCAL_CLASSIFICATIONS_FILE, JSON.stringify(classifications, null, 2), 'utf-8');
};

const isValidObjectId = (id) => {
  return typeof id === 'string' && /^[0-9a-fA-F]{24}$/.test(id);
};

exports.getHistory = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.max(1, Math.min(100, parseInt(req.query.limit, 10) || 10));
    const skip = (page - 1) * limit;

    const { label, startDate, endDate, from, to, search, text, q } = req.query;
    const effectiveStart = startDate || from;
    const effectiveEnd = endDate || to;
    const searchTerm = (search || text || q || '').trim();

    if (mongoose.connection.readyState === 1) {
      const userObjectId = new mongoose.Types.ObjectId(userId);
      const query = { user: userObjectId };

      if (label && ['spam', 'ham'].includes(label.toLowerCase())) {
        query.label = label.toLowerCase();
      }

      if (effectiveStart || effectiveEnd) {
        query.createdAt = {};
        if (effectiveStart) {
          query.createdAt.$gte = new Date(effectiveStart);
        }
        if (effectiveEnd) {
          const end = new Date(effectiveEnd);
          if (typeof effectiveEnd === 'string' && effectiveEnd.trim().length <= 10) {
            end.setHours(23, 59, 59, 999);
          }
          query.createdAt.$lte = end;
        }
      }

      if (searchTerm) {
        const escaped = searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        query.emailText = { $regex: escaped, $options: 'i' };
      }

      const total = await Classification.countDocuments(query);
      const classifications = await Classification.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);

      return res.status(200).json({
        success: true,
        data: {
          classifications,
          pagination: {
            total,
            page,
            limit,
            pages: Math.ceil(total / limit) || 1
          }
        },
        message: 'History retrieved successfully'
      });
    }

    let items = getLocalClassifications().filter((item) => String(item.user) === String(userId));

    if (label && ['spam', 'ham'].includes(label.toLowerCase())) {
      items = items.filter((item) => item.label === label.toLowerCase());
    }

    if (effectiveStart) {
      const startMs = new Date(effectiveStart).getTime();
      items = items.filter((item) => new Date(item.createdAt).getTime() >= startMs);
    }

    if (effectiveEnd) {
      const end = new Date(effectiveEnd);
      if (typeof effectiveEnd === 'string' && effectiveEnd.trim().length <= 10) {
        end.setHours(23, 59, 59, 999);
      }
      const endMs = end.getTime();
      items = items.filter((item) => new Date(item.createdAt).getTime() <= endMs);
    }

    if (searchTerm) {
      const lowerSearch = searchTerm.toLowerCase();
      items = items.filter(
        (item) => item.emailText && item.emailText.toLowerCase().includes(lowerSearch)
      );
    }

    items.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    const total = items.length;
    const paginatedItems = items.slice(skip, skip + limit);

    return res.status(200).json({
      success: true,
      data: {
        classifications: paginatedItems,
        pagination: {
          total,
          page,
          limit,
          pages: Math.ceil(total / limit) || 1
        }
      },
      message: 'History retrieved successfully'
    });
  } catch (error) {
    return next(error);
  }
};

exports.getHistoryById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        data: null,
        message: 'Invalid classification ID'
      });
    }

    if (mongoose.connection.readyState === 1) {
      const classification = await Classification.findById(id);

      if (!classification) {
        return res.status(404).json({
          success: false,
          data: null,
          message: 'Classification not found'
        });
      }

      if (classification.user.toString() !== userId.toString()) {
        return res.status(403).json({
          success: false,
          data: null,
          message: 'Access denied to this classification'
        });
      }

      return res.status(200).json({
        success: true,
        data: classification,
        message: 'Classification retrieved successfully'
      });
    }

    const items = getLocalClassifications();
    const item = items.find((doc) => String(doc._id || doc.id) === String(id));

    if (!item) {
      return res.status(404).json({
        success: false,
        data: null,
        message: 'Classification not found'
      });
    }

    if (String(item.user) !== String(userId)) {
      return res.status(403).json({
        success: false,
        data: null,
        message: 'Access denied to this classification'
      });
    }

    return res.status(200).json({
      success: true,
      data: item,
      message: 'Classification retrieved successfully'
    });
  } catch (error) {
    return next(error);
  }
};

exports.deleteHistoryById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        data: null,
        message: 'Invalid classification ID'
      });
    }

    if (mongoose.connection.readyState === 1) {
      const classification = await Classification.findById(id);

      if (!classification) {
        return res.status(404).json({
          success: false,
          data: null,
          message: 'Classification not found'
        });
      }

      if (classification.user.toString() !== userId.toString()) {
        return res.status(403).json({
          success: false,
          data: null,
          message: 'You do not have permission to delete this classification'
        });
      }

      await Classification.findByIdAndDelete(id);

      return res.status(200).json({
        success: true,
        data: null,
        message: 'Classification deleted successfully'
      });
    }

    const items = getLocalClassifications();
    const index = items.findIndex((doc) => String(doc._id || doc.id) === String(id));

    if (index === -1) {
      return res.status(404).json({
        success: false,
        data: null,
        message: 'Classification not found'
      });
    }

    if (String(items[index].user) !== String(userId)) {
      return res.status(403).json({
        success: false,
        data: null,
        message: 'You do not have permission to delete this classification'
      });
    }

    items.splice(index, 1);
    saveLocalClassifications(items);

    return res.status(200).json({
      success: true,
      data: null,
      message: 'Classification deleted successfully'
    });
  } catch (error) {
    return next(error);
  }
};
