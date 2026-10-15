require('dotenv').config();
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');

const LOCAL_USERS_FILE = path.join(__dirname, '..', '.local_users.json');

const parseArgs = (args) => {
  let name = '';
  let email = '';
  let password = '';

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--name' && args[i + 1]) {
      name = args[++i];
    } else if (args[i] === '--email' && args[i + 1]) {
      email = args[++i];
    } else if (args[i] === '--password' && args[i + 1]) {
      password = args[++i];
    }
  }

  if (!name && !email && !password) {
    name = args[0] || '';
    email = args[1] || '';
    password = args[2] || '';
  }

  return {
    name: name.trim(),
    email: email.trim().toLowerCase(),
    password: password.trim()
  };
};

const getLocalUsers = () => {
  if (fs.existsSync(LOCAL_USERS_FILE)) {
    try {
      const content = fs.readFileSync(LOCAL_USERS_FILE, 'utf-8');
      return JSON.parse(content);
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

const createAdmin = async () => {
  const args = process.argv.slice(2);
  const { name, email, password } = parseArgs(args);

  if (!name) {
    process.stderr.write('Error: Name is required.\n');
    process.stderr.write('Usage: npm run create-admin -- <name> <email> <password>\n');
    process.exit(1);
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!email || !emailRegex.test(email)) {
    process.stderr.write('Error: A valid email address is required.\n');
    process.exit(1);
  }

  if (!password || password.length < 8) {
    process.stderr.write('Error: Password must be at least 8 characters long.\n');
    process.exit(1);
  }

  let dbConnected = false;
  const mongoUri = process.env.MONGO_URI;

  if (mongoUri) {
    try {
      await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 2000 });
      dbConnected = true;
    } catch {
      dbConnected = false;
    }
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  if (dbConnected) {
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      process.stderr.write(`Error: User with email '${email}' already exists.\n`);
      await mongoose.disconnect();
      process.exit(1);
    }

    await User.create({
      name,
      email,
      password: hashedPassword,
      role: 'admin',
      isActive: true
    });

    await mongoose.disconnect();
  } else {
    const localUsers = getLocalUsers();
    if (localUsers[email]) {
      process.stderr.write(`Error: User with email '${email}' already exists.\n`);
      process.exit(1);
    }

    saveLocalUser({
      id: new mongoose.Types.ObjectId().toString(),
      name,
      email,
      password: hashedPassword,
      role: 'admin',
      isActive: true,
      createdAt: new Date().toISOString()
    });
  }

  process.stdout.write(`Admin user '${email}' created successfully with role 'admin'.\n`);
  process.exit(0);
};

createAdmin();
