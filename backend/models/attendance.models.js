const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  timestamp: { type: Date, default: Date.now },
  status: { type: String, enum: ['present', 'absent', 'late'], default: 'present' },
  method: { type: String, enum: ['face', 'rfid', 'nfc'], required: true },
  location: { type: String },
});

module.exports = mongoose.model('Attendance', attendanceSchema); 