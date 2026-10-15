const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const { parse } = require('csv-parse/sync');
const User = require('../models/User');
const Classification = require('../models/Classification');
const Dataset = require('../models/Dataset');
const ModelVersion = require('../models/ModelVersion');
const mlClient = require('../services/mlClient');

const LOCAL_USERS_FILE = path.join(__dirname, '..', '.local_users.json');
const LOCAL_CLASSIFICATIONS_FILE = path.join(__dirname, '..', '.local_classifications.json');
const LOCAL_DATASETS_FILE = path.join(__dirname, '..', '.local_datasets.json');
const LOCAL_MODELS_FILE = path.join(__dirname, '..', '.local_models.json');

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

const saveLocalUsers = (users) => {
  fs.writeFileSync(LOCAL_USERS_FILE, JSON.stringify(users, null, 2), 'utf-8');
};

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

const getLocalDatasets = () => {
  if (fs.existsSync(LOCAL_DATASETS_FILE)) {
    try {
      return JSON.parse(fs.readFileSync(LOCAL_DATASETS_FILE, 'utf-8'));
    } catch {
      return [];
    }
  }
  return [];
};

const saveLocalDatasets = (datasets) => {
  fs.writeFileSync(LOCAL_DATASETS_FILE, JSON.stringify(datasets, null, 2), 'utf-8');
};

const getLocalModels = () => {
  if (fs.existsSync(LOCAL_MODELS_FILE)) {
    try {
      return JSON.parse(fs.readFileSync(LOCAL_MODELS_FILE, 'utf-8'));
    } catch {
      return [];
    }
  }
  return [];
};

const saveLocalModels = (models) => {
  fs.writeFileSync(LOCAL_MODELS_FILE, JSON.stringify(models, null, 2), 'utf-8');
};

const isValidObjectId = (id) => {
  return typeof id === 'string' && /^[0-9a-fA-F]{24}$/.test(id);
};

const safeUnlink = (filePath) => {
  if (filePath && fs.existsSync(filePath)) {
    try {
      fs.unlinkSync(filePath);
    } catch {
      // ignore
    }
  }
};

exports.uploadDataset = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        data: null,
        message: 'Dataset CSV file is required'
      });
    }

    const uploadedFilePath = req.file.path;
    let records;

    try {
      const fileContent = fs.readFileSync(uploadedFilePath, 'utf-8');
      records = parse(fileContent, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
        relax_column_count: true
      });
    } catch {
      safeUnlink(uploadedFilePath);
      return res.status(400).json({
        success: false,
        data: null,
        message: 'Invalid CSV format or unable to parse file'
      });
    }

    if (!Array.isArray(records) || records.length === 0) {
      safeUnlink(uploadedFilePath);
      return res.status(400).json({
        success: false,
        data: null,
        message: 'Dataset CSV cannot be empty'
      });
    }

    const firstRow = records[0];
    const textKey = Object.keys(firstRow).find((k) => k.toLowerCase().trim() === 'text');
    const labelKey = Object.keys(firstRow).find((k) => k.toLowerCase().trim() === 'label');

    if (!textKey || !labelKey) {
      safeUnlink(uploadedFilePath);
      return res.status(400).json({
        success: false,
        data: null,
        message: "CSV must contain 'text' and 'label' columns"
      });
    }

    let spamCount = 0;
    let hamCount = 0;

    for (let i = 0; i < records.length; i++) {
      const row = records[i];
      const textVal = typeof row[textKey] === 'string' ? row[textKey].trim() : '';
      const labelVal = typeof row[labelKey] === 'string' ? row[labelKey].trim().toLowerCase() : '';

      if (!textVal) {
        safeUnlink(uploadedFilePath);
        return res.status(400).json({
          success: false,
          data: null,
          message: `Row ${i + 1} contains empty text`
        });
      }

      if (labelVal !== 'spam' && labelVal !== 'ham') {
        safeUnlink(uploadedFilePath);
        return res.status(400).json({
          success: false,
          data: null,
          message: `Row ${i + 1} has invalid label '${row[labelKey]}'. Labels must be 'spam' or 'ham'`
        });
      }

      if (labelVal === 'spam') {
        spamCount++;
      } else {
        hamCount++;
      }
    }

    if (spamCount === 0 || hamCount === 0) {
      safeUnlink(uploadedFilePath);
      return res.status(400).json({
        success: false,
        data: null,
        message: "Dataset must contain both 'spam' and 'ham' examples"
      });
    }

    const datasetName = (req.body.name || req.file.originalname || 'Dataset').trim();

    const datasetData = {
      uploadedBy: req.user.id,
      name: datasetName,
      filePath: path.resolve(uploadedFilePath),
      rowCount: records.length,
      spamCount,
      hamCount
    };

    let dataset;
    if (mongoose.connection.readyState === 1) {
      dataset = await Dataset.create(datasetData);
    } else {
      dataset = {
        _id: new mongoose.Types.ObjectId().toString(),
        ...datasetData,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      const localDatasets = getLocalDatasets();
      localDatasets.push(dataset);
      saveLocalDatasets(localDatasets);
    }

    return res.status(201).json({
      success: true,
      data: dataset,
      message: 'Dataset uploaded and processed successfully'
    });
  } catch (error) {
    if (req.file && req.file.path) {
      safeUnlink(req.file.path);
    }
    return next(error);
  }
};

exports.getDatasets = async (_req, res, next) => {
  try {
    if (mongoose.connection.readyState === 1) {
      const datasets = await Dataset.find()
        .populate('uploadedBy', 'name email')
        .sort({ createdAt: -1 });

      return res.status(200).json({
        success: true,
        data: datasets,
        message: 'Datasets retrieved successfully'
      });
    }

    const datasets = getLocalDatasets().sort(
      (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
    );

    return res.status(200).json({
      success: true,
      data: datasets,
      message: 'Datasets retrieved successfully'
    });
  } catch (error) {
    return next(error);
  }
};

exports.deleteDataset = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        data: null,
        message: 'Invalid dataset ID'
      });
    }

    let filePathToDelete = null;

    if (mongoose.connection.readyState === 1) {
      const dataset = await Dataset.findById(id);
      if (!dataset) {
        return res.status(404).json({
          success: false,
          data: null,
          message: 'Dataset not found'
        });
      }

      filePathToDelete = dataset.filePath;
      await Dataset.findByIdAndDelete(id);
    } else {
      const datasets = getLocalDatasets();
      const index = datasets.findIndex((d) => String(d._id || d.id) === String(id));

      if (index === -1) {
        return res.status(404).json({
          success: false,
          data: null,
          message: 'Dataset not found'
        });
      }

      filePathToDelete = datasets[index].filePath;
      datasets.splice(index, 1);
      saveLocalDatasets(datasets);
    }

    safeUnlink(filePathToDelete);

    return res.status(200).json({
      success: true,
      data: null,
      message: 'Dataset deleted successfully'
    });
  } catch (error) {
    return next(error);
  }
};

exports.trainModel = async (req, res, next) => {
  try {
    const { datasetId, testSize, algorithm } = req.body;

    if (!datasetId) {
      return res.status(400).json({
        success: false,
        data: null,
        message: 'datasetId is required'
      });
    }

    if (!isValidObjectId(datasetId)) {
      return res.status(400).json({
        success: false,
        data: null,
        message: 'Invalid dataset ID'
      });
    }

    let dataset;
    if (mongoose.connection.readyState === 1) {
      dataset = await Dataset.findById(datasetId);
    } else {
      const datasets = getLocalDatasets();
      dataset = datasets.find((d) => String(d._id || d.id) === String(datasetId));
    }

    if (!dataset) {
      return res.status(404).json({
        success: false,
        data: null,
        message: 'Dataset not found'
      });
    }

    const resolvedFilePath = path.resolve(dataset.filePath);
    if (!fs.existsSync(resolvedFilePath)) {
      return res.status(400).json({
        success: false,
        data: null,
        message: 'Dataset file does not exist on disk'
      });
    }

    const selectedAlgorithm =
      algorithm && typeof algorithm === 'string'
        ? algorithm.trim().toLowerCase()
        : 'logistic_regression';

    const allowedAlgorithms = ['logistic_regression', 'naive_bayes'];
    if (!allowedAlgorithms.includes(selectedAlgorithm)) {
      return res.status(400).json({
        success: false,
        data: null,
        message: `Algorithm must be one of: ${allowedAlgorithms.join(', ')}`
      });
    }

    let selectedTestSize = 0.2;
    if (testSize !== undefined && testSize !== null) {
      const parsedSize = parseFloat(testSize);
      if (isNaN(parsedSize) || parsedSize <= 0 || parsedSize >= 1) {
        return res.status(400).json({
          success: false,
          data: null,
          message: 'testSize must be a float between 0.0 and 1.0'
        });
      }
      selectedTestSize = parsedSize;
    }

    const metrics = await mlClient.train({
      file_path: resolvedFilePath,
      test_size: selectedTestSize,
      algorithm: selectedAlgorithm
    });

    const modelVersionData = {
      version: metrics.version,
      dataset: dataset._id ? dataset._id : dataset.id,
      algorithm: metrics.algorithm || selectedAlgorithm,
      accuracy: metrics.accuracy,
      precision: metrics.precision,
      recall: metrics.recall,
      f1: metrics.f1,
      confusionMatrix: metrics.confusion_matrix,
      isActive: false
    };

    let modelVersion;
    if (mongoose.connection.readyState === 1) {
      modelVersion = await ModelVersion.create(modelVersionData);
    } else {
      modelVersion = {
        _id: new mongoose.Types.ObjectId().toString(),
        ...modelVersionData,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      const models = getLocalModels();
      models.push(modelVersion);
      saveLocalModels(models);
    }

    return res.status(201).json({
      success: true,
      data: modelVersion,
      message: 'Model trained successfully'
    });
  } catch (error) {
    return next(error);
  }
};

exports.getModels = async (_req, res, next) => {
  try {
    if (mongoose.connection.readyState === 1) {
      const models = await ModelVersion.find()
        .populate('dataset', 'name rowCount spamCount hamCount')
        .sort({ createdAt: -1 });

      return res.status(200).json({
        success: true,
        data: models,
        message: 'Model versions retrieved successfully'
      });
    }

    const models = getLocalModels().sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    return res.status(200).json({
      success: true,
      data: models,
      message: 'Model versions retrieved successfully'
    });
  } catch (error) {
    return next(error);
  }
};

exports.activateModel = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        data: null,
        message: 'Invalid model version ID'
      });
    }

    let modelVersion;
    if (mongoose.connection.readyState === 1) {
      modelVersion = await ModelVersion.findById(id);
    } else {
      const models = getLocalModels();
      modelVersion = models.find((m) => String(m._id || m.id) === String(id));
    }

    if (!modelVersion) {
      return res.status(404).json({
        success: false,
        data: null,
        message: 'Model version not found'
      });
    }

    await mlClient.activate(modelVersion.version);

    if (mongoose.connection.readyState === 1) {
      await ModelVersion.updateMany({}, { isActive: false });
      modelVersion.isActive = true;
      await modelVersion.save();
    } else {
      const models = getLocalModels();
      for (const m of models) {
        m.isActive = String(m._id || m.id) === String(id);
      }
      saveLocalModels(models);
      modelVersion.isActive = true;
    }

    return res.status(200).json({
      success: true,
      data: modelVersion,
      message: `Model version '${modelVersion.version}' activated successfully`
    });
  } catch (error) {
    return next(error);
  }
};

exports.getUsers = async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.max(1, Math.min(100, parseInt(req.query.limit, 10) || 10));
    const skip = (page - 1) * limit;
    const searchTerm = (req.query.search || req.query.q || '').trim();

    if (mongoose.connection.readyState === 1) {
      const query = {};
      if (searchTerm) {
        const escaped = searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        query.$or = [
          { name: { $regex: escaped, $options: 'i' } },
          { email: { $regex: escaped, $options: 'i' } }
        ];
      }

      const total = await User.countDocuments(query);
      const users = await User.find(query)
        .select('-password')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);

      return res.status(200).json({
        success: true,
        data: {
          users,
          pagination: {
            total,
            page,
            limit,
            pages: Math.ceil(total / limit) || 1
          }
        },
        message: 'Users retrieved successfully'
      });
    }

    const localUsersMap = getLocalUsers();
    let userList = Object.values(localUsersMap).map((u) => ({
      _id: u.id || u._id,
      name: u.name,
      email: u.email,
      role: u.role,
      isActive: u.isActive !== false,
      twoFactorEnabled: u.twoFactorEnabled !== false,
      createdAt: u.createdAt || new Date().toISOString()
    }));

    if (searchTerm) {
      const lower = searchTerm.toLowerCase();
      userList = userList.filter(
        (u) =>
          (u.name && u.name.toLowerCase().includes(lower)) ||
          (u.email && u.email.toLowerCase().includes(lower))
      );
    }

    userList.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    const total = userList.length;
    const paginatedUsers = userList.slice(skip, skip + limit);

    return res.status(200).json({
      success: true,
      data: {
        users: paginatedUsers,
        pagination: {
          total,
          page,
          limit,
          pages: Math.ceil(total / limit) || 1
        }
      },
      message: 'Users retrieved successfully'
    });
  } catch (error) {
    return next(error);
  }
};

exports.updateUserStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { isActive } = req.body;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        data: null,
        message: 'Invalid user ID'
      });
    }

    if (typeof isActive !== 'boolean') {
      return res.status(400).json({
        success: false,
        data: null,
        message: 'isActive must be a boolean'
      });
    }

    if (String(id) === String(req.user.id) && isActive === false) {
      return res.status(400).json({
        success: false,
        data: null,
        message: 'An admin cannot deactivate their own account'
      });
    }

    if (mongoose.connection.readyState === 1) {
      const user = await User.findById(id).select('-password');
      if (!user) {
        return res.status(404).json({
          success: false,
          data: null,
          message: 'User not found'
        });
      }

      user.isActive = isActive;
      await user.save();

      return res.status(200).json({
        success: true,
        data: user,
        message: `User account ${isActive ? 'activated' : 'deactivated'} successfully`
      });
    }

    const localUsers = getLocalUsers();
    const userKey = Object.keys(localUsers).find(
      (k) =>
        String(localUsers[k].id || localUsers[k]._id) === String(id) || localUsers[k].email === id
    );

    if (!userKey || !localUsers[userKey]) {
      return res.status(404).json({
        success: false,
        data: null,
        message: 'User not found'
      });
    }

    localUsers[userKey].isActive = isActive;
    saveLocalUsers(localUsers);

    const updatedUser = {
      _id: localUsers[userKey].id || localUsers[userKey]._id,
      name: localUsers[userKey].name,
      email: localUsers[userKey].email,
      role: localUsers[userKey].role,
      isActive: localUsers[userKey].isActive,
      createdAt: localUsers[userKey].createdAt
    };

    return res.status(200).json({
      success: true,
      data: updatedUser,
      message: `User account ${isActive ? 'activated' : 'deactivated'} successfully`
    });
  } catch (error) {
    return next(error);
  }
};

exports.updateUserRole = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { role } = req.body;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        data: null,
        message: 'Invalid user ID'
      });
    }

    if (
      !role ||
      typeof role !== 'string' ||
      !['user', 'admin'].includes(role.trim().toLowerCase())
    ) {
      return res.status(400).json({
        success: false,
        data: null,
        message: "Role must be either 'user' or 'admin'"
      });
    }

    const normalizedRole = role.trim().toLowerCase();

    if (String(id) === String(req.user.id) && normalizedRole !== 'admin') {
      return res.status(400).json({
        success: false,
        data: null,
        message: 'An admin cannot demote their own account'
      });
    }

    if (mongoose.connection.readyState === 1) {
      const user = await User.findById(id).select('-password');
      if (!user) {
        return res.status(404).json({
          success: false,
          data: null,
          message: 'User not found'
        });
      }

      user.role = normalizedRole;
      await user.save();

      return res.status(200).json({
        success: true,
        data: user,
        message: `User role updated to '${normalizedRole}' successfully`
      });
    }

    const localUsers = getLocalUsers();
    const userKey = Object.keys(localUsers).find(
      (k) =>
        String(localUsers[k].id || localUsers[k]._id) === String(id) || localUsers[k].email === id
    );

    if (!userKey || !localUsers[userKey]) {
      return res.status(404).json({
        success: false,
        data: null,
        message: 'User not found'
      });
    }

    localUsers[userKey].role = normalizedRole;
    saveLocalUsers(localUsers);

    const updatedUser = {
      _id: localUsers[userKey].id || localUsers[userKey]._id,
      name: localUsers[userKey].name,
      email: localUsers[userKey].email,
      role: localUsers[userKey].role,
      isActive: localUsers[userKey].isActive,
      createdAt: localUsers[userKey].createdAt
    };

    return res.status(200).json({
      success: true,
      data: updatedUser,
      message: `User role updated to '${normalizedRole}' successfully`
    });
  } catch (error) {
    return next(error);
  }
};

exports.getAdminStats = async (_req, res, next) => {
  try {
    if (mongoose.connection.readyState === 1) {
      const totalUsers = await User.countDocuments();

      const [classCounts] = await Classification.aggregate([
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            spam: { $sum: { $cond: [{ $eq: ['$label', 'spam'] }, 1, 0] } }
          }
        }
      ]);

      const totalClassifications = classCounts?.total || 0;
      const spamCount = classCounts?.spam || 0;
      const spamRatio =
        totalClassifications > 0 ? Number((spamCount / totalClassifications).toFixed(4)) : 0;

      const activeModel = await ModelVersion.findOne({ isActive: true })
        .populate('dataset', 'name rowCount')
        .lean();

      return res.status(200).json({
        success: true,
        data: {
          totalUsers,
          totalClassifications,
          spamRatio,
          activeModel
        },
        message: 'Admin statistics retrieved successfully'
      });
    }

    const localUsers = getLocalUsers();
    const totalUsers = Object.keys(localUsers).length;

    const classifications = getLocalClassifications();
    const totalClassifications = classifications.length;
    let spamCount = 0;
    for (const c of classifications) {
      if (c.label === 'spam') {
        spamCount++;
      }
    }
    const spamRatio =
      totalClassifications > 0 ? Number((spamCount / totalClassifications).toFixed(4)) : 0;

    const models = getLocalModels();
    const activeModel = models.find((m) => m.isActive === true) || null;

    return res.status(200).json({
      success: true,
      data: {
        totalUsers,
        totalClassifications,
        spamRatio,
        activeModel
      },
      message: 'Admin statistics retrieved successfully'
    });
  } catch (error) {
    return next(error);
  }
};
