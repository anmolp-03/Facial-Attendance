const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const dotenv = require('dotenv');
const connectDB = require('./config/db');
const cookieParser = require('cookie-parser');

// Load environment variables
dotenv.config();

const app = express();

// CORS configuration
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:5173',
];

const corsOptions = {
  origin: function (origin, callback) {
    // allow requests with no origin (like mobile apps, curl, etc.)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    } else {
      return callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors(corsOptions));
app.use(helmet());
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 100 }));
app.use(cookieParser());

// Connect to MongoDB
connectDB();

// Basic route
app.get('/', (req, res) => {
  res.send('Face Recognition Attendance System Backend');
});

// Routes
app.use('/api/attendance', require('./routes/attendance.routes'));
app.use('/api/auth', require('./routes/auth.routes'));
app.use('/api/analytics', require('./routes/analytics.routes'));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
}); 