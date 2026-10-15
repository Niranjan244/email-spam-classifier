# Email Spam Classifier

A full-stack web application for detecting and analyzing spam emails using machine learning. The app supports single email text analysis, bulk classification via CSV uploads, live Gmail scanning, and personal classification history and analytics.

---

## Tech Stack

- **Frontend:** React 18, Vite, Tailwind CSS, Lucide React, Recharts
- **Backend:** Node.js, Express.js, JWT Authentication, Multer, Mongoose (with automatic local JSON storage fallback)
- **Machine Learning Service:** Python 3.10+, FastAPI, Scikit-learn, TF-IDF Vectorizer, Multinomial Naive Bayes / Logistic Regression, Joblib

---

## Features

- **Single Email Classification:** Paste any email text or subject to get immediate spam/ham predictions, confidence scores, spam probabilities, and highlighted suspicious keywords.
- **Bulk CSV Classification:** Upload `.csv` files (up to 1,000 rows) with drag-and-drop support, real-time batch progress tracking, and batch summary statistics.
- **Live Gmail Scanner:** Connect your Google account via OAuth to scan recent inbox messages directly for spam threats.
- **Classification History:** View past classifications with full filtering by classification type, date, and status.
- **Analytics & Records:** Visual trend charts, spam breakdown, and an exportable classification records table (CSV download).
- **User Profile Management:** Update personal information, upload profile photos, and change account passwords.
- **Admin Dashboard:** Manage uploaded benchmark datasets, retrain ML models, switch active model versions, and oversee user accounts.
- **Theme Support:** Polished light and dark theme modes with auto-saved preference.

---

## Project Structure

```text
email-spam-classifier/
├── client/          # React + Vite frontend
├── server/          # Node.js + Express backend API
├── ml-service/      # Python FastAPI machine learning microservice
└── README.md
```

---

## Getting Started

### 1. Prerequisites
- Node.js (v18+) and npm
- Python (v3.10+) and pip
- (Optional) MongoDB running locally or a MongoDB Atlas URI (server will automatically fall back to local storage if MongoDB is not running)

---

### 2. Setup the ML Service

```bash
cd ml-service

# Create virtual environment
python -m venv .venv

# Activate virtual environment
# Windows:
.venv\Scripts\activate
# macOS/Linux:
# source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Start the ML server
uvicorn main:app --reload --port 8000
```

ML service runs at: `http://localhost:8000`  
Health check: `http://localhost:8000/health`

---

### 3. Setup the Backend Server

Open a new terminal window:

```bash
cd server

# Install dependencies
npm install

# Start the server in development mode
npm run dev
```

Backend API runs at: `http://localhost:5000`  
Health check: `http://localhost:5000/api/health`

---

### 4. Setup the Frontend Client

Open another terminal window:

```bash
cd client

# Install dependencies
npm install

# Start Vite dev server
npm run dev
```

Frontend app runs at: `http://localhost:5173`

---

## Environment Variables

### Server (`server/.env`)
Create a `.env` file inside the `server/` folder:

```env
PORT=5000
CLIENT_URL=http://localhost:5173
ML_SERVICE_URL=http://localhost:8000
JWT_SECRET=super_secret_jwt_key_12345
MONGO_URI=mongodb://localhost:27017/email-spam-classifier
```

### Client (`client/.env`)
Create a `.env` file inside the `client/` folder:

```env
VITE_API_URL=http://localhost:5000/api
```

---

## Creating an Admin Account

To access admin features (dataset management, model retraining, user management), generate an admin user using the included script:

```bash
cd server
npm run create-admin -- "Admin User" "admin@example.com" "Admin@12345"
```

---

## Running Tests

### Backend Tests
```bash
cd server
npm test
```

### Linting and Formatting
```bash
# Client
cd client
npm run lint
npm run format:check

# Server
cd server
npm run lint
npm run format:check
```

---

## Author
Developed by **Niranjan** ([a.niranjan244@gmail.com](mailto:a.niranjan244@gmail.com))
