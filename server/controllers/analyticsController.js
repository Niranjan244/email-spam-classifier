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

const parseDateFilter = (from, to) => {
  let fromDate = null;
  let toDate = null;

  if (from) {
    const parsed = new Date(from);
    if (!isNaN(parsed.getTime())) {
      parsed.setHours(0, 0, 0, 0);
      fromDate = parsed;
    }
  }

  if (to) {
    const parsed = new Date(to);
    if (!isNaN(parsed.getTime())) {
      if (typeof to === 'string' && to.trim().length <= 10) {
        parsed.setHours(23, 59, 59, 999);
      }
      toDate = parsed;
    }
  }

  const dateQuery = {};
  if (fromDate) dateQuery.$gte = fromDate;
  if (toDate) dateQuery.$lte = toDate;

  return { fromDate, toDate, dateQuery, hasDateFilter: Boolean(fromDate || toDate) };
};

const buildRawQuery = (userId, queryParams = {}) => {
  const { label, from, to, search, sortBy, order } = queryParams;
  const userObjectId = new mongoose.Types.ObjectId(userId);
  const mongoQuery = { user: userObjectId };

  const normalizedLabel =
    label && ['spam', 'ham'].includes(String(label).toLowerCase())
      ? String(label).toLowerCase()
      : null;
  if (normalizedLabel) {
    mongoQuery.label = normalizedLabel;
  }

  const { fromDate, toDate, dateQuery, hasDateFilter } = parseDateFilter(from, to);
  if (hasDateFilter) {
    mongoQuery.createdAt = dateQuery;
  }

  const searchStr = (search || '').trim();
  if (searchStr) {
    const escaped = searchStr.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    mongoQuery.emailText = { $regex: escaped, $options: 'i' };
  }

  const allowedSorts = ['createdAt', 'spamProbability', 'confidence', 'label'];
  const sortField = allowedSorts.includes(sortBy) ? sortBy : 'createdAt';
  const sortDirection = String(order).toLowerCase() === 'asc' ? 1 : -1;
  const sort = { [sortField]: sortDirection };
  if (sortField !== 'createdAt') {
    sort.createdAt = -1;
  }

  return {
    mongoQuery,
    sort,
    sortField,
    sortDirection,
    fromDate,
    toDate,
    label: normalizedLabel,
    searchStr
  };
};

const mapRawRow = (doc) => ({
  id: String(doc._id || doc.id),
  createdAt: doc.createdAt,
  emailText: typeof doc.emailText === 'string' ? doc.emailText.slice(0, 200) : '',
  label: doc.label,
  spamProbability: typeof doc.spamProbability === 'number' ? doc.spamProbability : 0,
  confidence: typeof doc.confidence === 'number' ? doc.confidence : 0,
  suspiciousTerms: Array.isArray(doc.suspiciousTerms) ? doc.suspiciousTerms : [],
  suspiciousPhrases: Array.isArray(doc.suspiciousPhrases) ? doc.suspiciousPhrases : []
});

const escapeCsv = (val) => {
  if (val === null || val === undefined) return '""';
  const str = String(val);
  return `"${str.replace(/"/g, '""')}"`;
};

const formatCsv = (docs) => {
  const headers = [
    'Date',
    'Email Text',
    'Label',
    'Spam Probability',
    'Confidence',
    'Suspicious Terms'
  ];
  const lines = [headers.join(',')];

  for (const doc of docs) {
    const dateStr = doc.createdAt ? new Date(doc.createdAt).toISOString() : '';
    const emailText = doc.emailText || '';
    const label = doc.label || '';
    const spamProb = doc.spamProbability !== undefined ? doc.spamProbability : '';
    const conf = doc.confidence !== undefined ? doc.confidence : '';
    const terms = Array.isArray(doc.suspiciousTerms) ? doc.suspiciousTerms.join('; ') : '';

    lines.push(
      [
        escapeCsv(dateStr),
        escapeCsv(emailText),
        escapeCsv(label),
        escapeCsv(spamProb),
        escapeCsv(conf),
        escapeCsv(terms)
      ].join(',')
    );
  }

  return lines.join('\r\n');
};

exports.getAnalytics = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { from, to } = req.query;
    const { fromDate, toDate, dateQuery, hasDateFilter } = parseDateFilter(from, to);

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    thirtyDaysAgo.setHours(0, 0, 0, 0);

    if (mongoose.connection.readyState === 1) {
      const userObjectId = new mongoose.Types.ObjectId(userId);
      const matchCriteria = { user: userObjectId };
      if (hasDateFilter) {
        matchCriteria.createdAt = dateQuery;
      }

      const [totalsAgg] = await Classification.aggregate([
        { $match: matchCriteria },
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            spam: { $sum: { $cond: [{ $eq: ['$label', 'spam'] }, 1, 0] } },
            ham: { $sum: { $cond: [{ $eq: ['$label', 'ham'] }, 1, 0] } }
          }
        }
      ]);

      const perDayMatch = hasDateFilter
        ? matchCriteria
        : { user: userObjectId, createdAt: { $gte: thirtyDaysAgo } };

      const perDayAgg = await Classification.aggregate([
        { $match: perDayMatch },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            total: { $sum: 1 },
            spam: { $sum: { $cond: [{ $eq: ['$label', 'spam'] }, 1, 0] } },
            ham: { $sum: { $cond: [{ $eq: ['$label', 'ham'] }, 1, 0] } }
          }
        },
        { $sort: { _id: 1 } }
      ]);

      const termsAgg = await Classification.aggregate([
        { $match: matchCriteria },
        { $unwind: '$suspiciousTerms' },
        {
          $match: {
            suspiciousTerms: { $exists: true, $ne: '' }
          }
        },
        {
          $group: {
            _id: '$suspiciousTerms',
            count: { $sum: 1 }
          }
        },
        { $sort: { count: -1, _id: 1 } },
        { $limit: 10 }
      ]);

      const total = totalsAgg?.total || 0;
      const spam = totalsAgg?.spam || 0;
      const ham = totalsAgg?.ham || 0;

      const countsPerDay = perDayAgg.map((item) => ({
        date: item._id,
        total: item.total,
        spam: item.spam,
        ham: item.ham
      }));

      const topSuspiciousTerms = termsAgg.map((item) => ({
        term: item._id,
        count: item.count
      }));

      return res.status(200).json({
        success: true,
        data: {
          total,
          spam,
          ham,
          countsPerDay,
          topSuspiciousTerms
        },
        message: 'Analytics retrieved successfully'
      });
    }

    let userItems = getLocalClassifications().filter((doc) => String(doc.user) === String(userId));

    if (hasDateFilter) {
      userItems = userItems.filter((doc) => {
        const t = new Date(doc.createdAt).getTime();
        if (fromDate && t < fromDate.getTime()) return false;
        if (toDate && t > toDate.getTime()) return false;
        return true;
      });
    }

    let total = userItems.length;
    let spam = 0;
    let ham = 0;
    const dailyMap = {};
    const termMap = {};

    const thirtyDaysAgoMs = thirtyDaysAgo.getTime();

    for (const doc of userItems) {
      if (doc.label === 'spam') {
        spam++;
      } else if (doc.label === 'ham') {
        ham++;
      }

      const docDate = new Date(doc.createdAt);
      const isWithinDailyWindow = hasDateFilter || docDate.getTime() >= thirtyDaysAgoMs;
      if (isWithinDailyWindow) {
        const dateStr = docDate.toISOString().slice(0, 10);
        if (!dailyMap[dateStr]) {
          dailyMap[dateStr] = { date: dateStr, total: 0, spam: 0, ham: 0 };
        }
        dailyMap[dateStr].total++;
        if (doc.label === 'spam') {
          dailyMap[dateStr].spam++;
        } else if (doc.label === 'ham') {
          dailyMap[dateStr].ham++;
        }
      }

      if (Array.isArray(doc.suspiciousTerms)) {
        for (const term of doc.suspiciousTerms) {
          if (typeof term === 'string' && term.trim()) {
            const key = term.trim();
            termMap[key] = (termMap[key] || 0) + 1;
          }
        }
      }
    }

    const countsPerDay = Object.values(dailyMap).sort((a, b) => a.date.localeCompare(b.date));

    const topSuspiciousTerms = Object.entries(termMap)
      .map(([term, count]) => ({ term, count }))
      .sort((a, b) => b.count - a.count || a.term.localeCompare(b.term))
      .slice(0, 10);

    return res.status(200).json({
      success: true,
      data: {
        total,
        spam,
        ham,
        countsPerDay,
        topSuspiciousTerms
      },
      message: 'Analytics retrieved successfully'
    });
  } catch (error) {
    return next(error);
  }
};

exports.getRawAnalytics = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.max(1, Math.min(100, parseInt(req.query.limit, 10) || 10));
    const skip = (page - 1) * limit;

    const { mongoQuery, sort, sortField, sortDirection, fromDate, toDate, label, searchStr } =
      buildRawQuery(userId, req.query);

    if (mongoose.connection.readyState === 1) {
      const [total, docs] = await Promise.all([
        Classification.countDocuments(mongoQuery),
        Classification.find(mongoQuery).sort(sort).skip(skip).limit(limit).lean()
      ]);

      const rows = docs.map(mapRawRow);

      return res.status(200).json({
        success: true,
        data: {
          rows,
          total,
          page,
          limit
        },
        message: 'Raw analytics retrieved successfully'
      });
    }

    let items = getLocalClassifications().filter((doc) => String(doc.user) === String(userId));

    if (label) {
      items = items.filter((doc) => doc.label === label);
    }
    if (fromDate) {
      items = items.filter((doc) => new Date(doc.createdAt).getTime() >= fromDate.getTime());
    }
    if (toDate) {
      items = items.filter((doc) => new Date(doc.createdAt).getTime() <= toDate.getTime());
    }
    if (searchStr) {
      const s = searchStr.toLowerCase();
      items = items.filter(
        (doc) => typeof doc.emailText === 'string' && doc.emailText.toLowerCase().includes(s)
      );
    }

    items.sort((a, b) => {
      let valA = a[sortField];
      let valB = b[sortField];
      if (sortField === 'createdAt') {
        valA = new Date(valA).getTime();
        valB = new Date(valB).getTime();
      } else if (typeof valA === 'string') {
        return sortDirection * valA.localeCompare(valB);
      }
      if (valA < valB) return -1 * sortDirection;
      if (valA > valB) return 1 * sortDirection;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    const total = items.length;
    const rows = items.slice(skip, skip + limit).map(mapRawRow);

    return res.status(200).json({
      success: true,
      data: {
        rows,
        total,
        page,
        limit
      },
      message: 'Raw analytics retrieved successfully'
    });
  } catch (error) {
    return next(error);
  }
};

exports.exportRawAnalytics = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { mongoQuery, sort, sortField, sortDirection, fromDate, toDate, label, searchStr } =
      buildRawQuery(userId, req.query);

    const EXPORT_CAP = 5000;

    let docs = [];
    if (mongoose.connection.readyState === 1) {
      docs = await Classification.find(mongoQuery).sort(sort).limit(EXPORT_CAP).lean();
    } else {
      let items = getLocalClassifications().filter((doc) => String(doc.user) === String(userId));
      if (label) items = items.filter((doc) => doc.label === label);
      if (fromDate)
        items = items.filter((doc) => new Date(doc.createdAt).getTime() >= fromDate.getTime());
      if (toDate)
        items = items.filter((doc) => new Date(doc.createdAt).getTime() <= toDate.getTime());
      if (searchStr) {
        const s = searchStr.toLowerCase();
        items = items.filter(
          (doc) => typeof doc.emailText === 'string' && doc.emailText.toLowerCase().includes(s)
        );
      }
      items.sort((a, b) => {
        let valA = a[sortField];
        let valB = b[sortField];
        if (sortField === 'createdAt') {
          valA = new Date(valA).getTime();
          valB = new Date(valB).getTime();
        } else if (typeof valA === 'string') {
          return sortDirection * valA.localeCompare(valB);
        }
        if (valA < valB) return -1 * sortDirection;
        if (valA > valB) return 1 * sortDirection;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
      docs = items.slice(0, EXPORT_CAP);
    }

    const csvContent = formatCsv(docs);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="classification-records.csv"');
    return res.status(200).send(csvContent);
  } catch (error) {
    return next(error);
  }
};
