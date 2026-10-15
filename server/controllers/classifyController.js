const fs = require('fs');
const path = require('path');
const axios = require('axios');
const mongoose = require('mongoose');
const { parse } = require('csv-parse/sync');
const Classification = require('../models/Classification');
const Batch = require('../models/Batch');
const mlClient = require('../services/mlClient');

const LOCAL_CLASSIFICATIONS_FILE = path.join(__dirname, '..', '.local_classifications.json');
const LOCAL_BATCHES_FILE = path.join(__dirname, '..', '.local_batches.json');

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

const saveLocalClassification = (classification) => {
  const list = getLocalClassifications();
  list.push(classification);
  fs.writeFileSync(LOCAL_CLASSIFICATIONS_FILE, JSON.stringify(list, null, 2), 'utf-8');
};

const saveLocalClassifications = (classifications) => {
  const list = getLocalClassifications();
  list.push(...classifications);
  fs.writeFileSync(LOCAL_CLASSIFICATIONS_FILE, JSON.stringify(list, null, 2), 'utf-8');
};

const getLocalBatches = () => {
  if (fs.existsSync(LOCAL_BATCHES_FILE)) {
    try {
      return JSON.parse(fs.readFileSync(LOCAL_BATCHES_FILE, 'utf-8'));
    } catch {
      return [];
    }
  }
  return [];
};

const saveLocalBatch = (batch) => {
  const list = getLocalBatches();
  list.push(batch);
  fs.writeFileSync(LOCAL_BATCHES_FILE, JSON.stringify(list, null, 2), 'utf-8');
};

const ensureStringArray = (val) => {
  if (Array.isArray(val)) {
    return val.filter((item) => typeof item === 'string' && item.trim().length > 0);
  }
  return [];
};

exports.classifyText = async (req, res, next) => {
  try {
    const { text } = req.body;

    const mlResult = await mlClient.predict(text);

    const classificationData = {
      user: req.user.id,
      emailText: text,
      label: mlResult.label,
      spamProbability: mlResult.spam_probability,
      confidence: mlResult.confidence,
      suspiciousTerms: ensureStringArray(mlResult.suspicious_terms),
      suspiciousPhrases: ensureStringArray(mlResult.suspicious_phrases),
      batch: null
    };

    let classification;
    if (mongoose.connection.readyState === 1) {
      classification = await Classification.create(classificationData);
    } else {
      classification = {
        _id: new mongoose.Types.ObjectId().toString(),
        ...classificationData,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      saveLocalClassification(classification);
    }

    return res.status(201).json({
      success: true,
      data: classification,
      message: 'Classification completed successfully'
    });
  } catch (error) {
    return next(error);
  }
};

exports.bulkClassify = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        data: null,
        message: 'CSV file is required'
      });
    }

    let records;
    try {
      records = parse(req.file.buffer, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
        relax_column_count: true
      });
    } catch {
      return res.status(400).json({
        success: false,
        data: null,
        message: 'Invalid CSV format or unable to parse file'
      });
    }

    if (!Array.isArray(records) || records.length === 0) {
      return res.status(400).json({
        success: false,
        data: null,
        message: 'CSV file cannot be empty'
      });
    }

    const firstRow = records[0];
    const textKey = Object.keys(firstRow).find((k) => k.toLowerCase().trim() === 'text');

    if (!textKey) {
      return res.status(400).json({
        success: false,
        data: null,
        message: 'CSV file must have a column named text'
      });
    }

    if (records.length > 1000) {
      return res.status(400).json({
        success: false,
        data: null,
        message: 'CSV file cannot exceed 1,000 rows'
      });
    }

    const texts = records.map((r) =>
      typeof r[textKey] === 'string'
        ? r[textKey].slice(0, 20000)
        : String(r[textKey] || '').slice(0, 20000)
    );

    const predictions = await mlClient.predictBatch(texts);

    let spamCount = 0;
    let hamCount = 0;
    for (const pred of predictions) {
      if (pred.label === 'spam') {
        spamCount++;
      } else {
        hamCount++;
      }
    }
    const total = predictions.length;

    let batch;
    let classifications;

    if (mongoose.connection.readyState === 1) {
      batch = await Batch.create({
        user: req.user.id,
        fileName: req.file.originalname,
        total,
        spamCount,
        hamCount
      });

      const docsToInsert = predictions.map((pred, i) => ({
        user: req.user.id,
        emailText: texts[i],
        label: pred.label,
        spamProbability: pred.spam_probability,
        confidence: pred.confidence,
        suspiciousTerms: ensureStringArray(pred.suspicious_terms),
        suspiciousPhrases: ensureStringArray(pred.suspicious_phrases),
        batch: batch._id
      }));

      classifications = await Classification.insertMany(docsToInsert);
    } else {
      const batchId = new mongoose.Types.ObjectId().toString();
      batch = {
        _id: batchId,
        user: req.user.id,
        fileName: req.file.originalname,
        total,
        spamCount,
        hamCount,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      saveLocalBatch(batch);

      classifications = predictions.map((pred, i) => ({
        _id: new mongoose.Types.ObjectId().toString(),
        user: req.user.id,
        emailText: texts[i],
        label: pred.label,
        spamProbability: pred.spam_probability,
        confidence: pred.confidence,
        suspiciousTerms: ensureStringArray(pred.suspicious_terms),
        suspiciousPhrases: ensureStringArray(pred.suspicious_phrases),
        batch: batchId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }));
      saveLocalClassifications(classifications);
    }

    return res.status(201).json({
      success: true,
      data: {
        batchId: batch._id ? batch._id.toString() : batch.id,
        summary: {
          total,
          spam: spamCount,
          ham: hamCount,
          spamCount,
          hamCount
        },
        results: classifications
      },
      message: 'Bulk classification completed successfully'
    });
  } catch (error) {
    return next(error);
  }
};

const decodeBase64Url = (encoded) => {
  if (!encoded) return '';
  try {
    const sanitized = encoded.replace(/-/g, '+').replace(/_/g, '/');
    return Buffer.from(sanitized, 'base64').toString('utf-8');
  } catch {
    return '';
  }
};

const extractBodyFromPayload = (payload) => {
  if (!payload) return '';
  if (payload.body && payload.body.data) {
    return decodeBase64Url(payload.body.data);
  }
  if (Array.isArray(payload.parts)) {
    for (const part of payload.parts) {
      if (part.mimeType === 'text/plain' && part.body && part.body.data) {
        return decodeBase64Url(part.body.data);
      }
      if (Array.isArray(part.parts)) {
        const nested = extractBodyFromPayload(part);
        if (nested) return nested;
      }
    }
    for (const part of payload.parts) {
      if (part.mimeType === 'text/html' && part.body && part.body.data) {
        const html = decodeBase64Url(part.body.data);
        return html.replace(/<[^>]*>?/gm, ' ');
      }
    }
  }
  return '';
};

exports.classifyGmail = async (req, res, next) => {
  try {
    const { accessToken, maxResults = 15 } = req.body;

    if (!accessToken || typeof accessToken !== 'string') {
      return res.status(400).json({
        success: false,
        data: null,
        message: 'Google Access Token is required to fetch Gmail messages.'
      });
    }

    const limit = Math.min(Math.max(parseInt(maxResults, 10) || 15, 1), 30);

    let listResponse;
    try {
      listResponse = await axios.get(
        `https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=${limit}`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`
          },
          timeout: 10000
        }
      );
    } catch (err) {
      if (err.response?.status === 401) {
        return res.status(401).json({
          success: false,
          data: null,
          message: 'Google Access Token expired or invalid. Please reconnect to Gmail.'
        });
      }
      if (err.response?.status === 403) {
        return res.status(403).json({
          success: false,
          data: null,
          message:
            'Gmail API access was denied. Please ensure the Gmail API is enabled in your Google Cloud Console for this project and the gmail.readonly permission is granted.'
        });
      }
      return res.status(502).json({
        success: false,
        data: null,
        message:
          err.response?.data?.error?.message || 'Failed to communicate with Google Gmail API.'
      });
    }

    const messages = listResponse.data.messages || [];
    if (messages.length === 0) {
      return res.status(200).json({
        success: true,
        data: {
          total: 0,
          spamCount: 0,
          hamCount: 0,
          results: []
        },
        message: 'No messages found in your Gmail inbox.'
      });
    }

    const messagePromises = messages.map(async (msg) => {
      try {
        const detailRes = await axios.get(
          `https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}?format=full`,
          {
            headers: {
              Authorization: `Bearer ${accessToken}`
            },
            timeout: 8000
          }
        );
        const data = detailRes.data;
        const headers = data.payload?.headers || [];
        const fromHeader =
          headers.find((h) => h.name.toLowerCase() === 'from')?.value || 'Unknown Sender';
        const subjectHeader =
          headers.find((h) => h.name.toLowerCase() === 'subject')?.value || '(No Subject)';
        const dateHeader =
          headers.find((h) => h.name.toLowerCase() === 'date')?.value || new Date().toISOString();

        const bodyContent = extractBodyFromPayload(data.payload) || data.snippet || '';
        const combinedText = `${subjectHeader}. ${bodyContent}`.trim().slice(0, 4000);

        return {
          id: data.id,
          threadId: data.threadId,
          from: fromHeader,
          subject: subjectHeader,
          date: dateHeader,
          snippet: data.snippet || '',
          textToClassify: combinedText.length > 0 ? combinedText : subjectHeader
        };
      } catch {
        return null;
      }
    });

    const emailDetails = (await Promise.all(messagePromises)).filter(Boolean);

    if (emailDetails.length === 0) {
      return res.status(200).json({
        success: true,
        data: {
          total: 0,
          spamCount: 0,
          hamCount: 0,
          results: []
        },
        message: 'Could not retrieve email contents from Gmail.'
      });
    }

    const texts = emailDetails.map((e) => e.textToClassify);
    const predictions = await mlClient.predictBatch(texts);

    let spamCount = 0;
    let hamCount = 0;

    const classifiedEmails = emailDetails.map((email, idx) => {
      const pred = predictions[idx] || {
        label: 'ham',
        spam_probability: 0.1,
        confidence: 0.9,
        suspicious_terms: [],
        suspicious_phrases: []
      };

      if (pred.label === 'spam') {
        spamCount += 1;
      } else {
        hamCount += 1;
      }

      return {
        id: email.id,
        threadId: email.threadId,
        from: email.from,
        subject: email.subject,
        date: email.date,
        snippet: email.snippet,
        label: pred.label,
        isSpam: pred.label === 'spam',
        spamProbability: pred.spam_probability,
        confidence: pred.confidence,
        suspiciousTerms: ensureStringArray(pred.suspicious_terms),
        suspiciousPhrases: ensureStringArray(pred.suspicious_phrases)
      };
    });

    return res.status(200).json({
      success: true,
      data: {
        total: classifiedEmails.length,
        spamCount,
        hamCount,
        results: classifiedEmails
      },
      message: `Scanned and analyzed ${classifiedEmails.length} Gmail messages successfully.`
    });
  } catch (error) {
    return next(error);
  }
};
