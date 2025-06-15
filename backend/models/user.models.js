const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['employee', 'admin'], default: 'employee' },
  faceEmbeddings: { type: Array, default: [] },
  rfid: { type: String },
  nfc: { type: String },
  createdAt: { type: Date, default: Date.now },
  employeeId: { type: String, unique: true, sparse: true, index: true },
});

module.exports = mongoose.model('User', userSchema); 