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

exports.getDashboard = async (req, res, next) => {
  try {
    const userId = req.user.id;

    if (mongoose.connection.readyState === 1) {
      const userObjectId = new mongoose.Types.ObjectId(userId);

      const [countsAgg] = await Classification.aggregate([
        { $match: { user: userObjectId } },
        {
          $group: {
            _id: null,
            classified: { $sum: 1 },
            spam: { $sum: { $cond: [{ $eq: ['$label', 'spam'] }, 1, 0] } },
            ham: { $sum: { $cond: [{ $eq: ['$label', 'ham'] }, 1, 0] } }
          }
        }
      ]);

      const recentClassifications = await Classification.find({
        user: userObjectId
      })
        .sort({ createdAt: -1 })
        .limit(5);

      const totals = {
        classified: countsAgg?.classified || 0,
        spam: countsAgg?.spam || 0,
        ham: countsAgg?.ham || 0
      };

      return res.status(200).json({
        success: true,
        data: {
          totals,
          recentClassifications
        },
        message: 'Dashboard data retrieved successfully'
      });
    }

    const userItems = getLocalClassifications().filter(
      (doc) => String(doc.user) === String(userId)
    );

    let classified = userItems.length;
    let spam = 0;
    let ham = 0;

    for (const doc of userItems) {
      if (doc.label === 'spam') {
        spam++;
      } else if (doc.label === 'ham') {
        ham++;
      }
    }

    const sortedItems = [...userItems].sort(
      (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
    );
    const recentClassifications = sortedItems.slice(0, 5);

    const totals = {
      classified,
      spam,
      ham
    };

    return res.status(200).json({
      success: true,
      data: {
        totals,
        recentClassifications
      },
      message: 'Dashboard data retrieved successfully'
    });
  } catch (error) {
    return next(error);
  }
};
