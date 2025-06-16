const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  date: { type: Date, required: true }, // Date of the attendance record (e.g., YYYY-MM-DD)
  checkInTime: { type: Date },
  checkOutTime: { type: Date },
  status: { type: String, enum: ['present', 'absent', 'late', 'on_leave'], default: 'present' },
  method: { type: String, enum: ['face', 'rfid', 'nfc', 'manual'], required: true }, // Added 'manual' for admin updates
  location: { type: String },
  // Optional: fields for further analysis
  totalHours: { type: Number, default: 0 },
  isLate: { type: Boolean, default: false },
  overtimeHours: { type: Number, default: 0 },
}, { timestamps: true }); // Add timestamps for createdAt and updatedAt

// Pre-save hook to calculate totalHours and isLate
attendanceSchema.pre('save', function(next) {
  if (this.checkInTime && this.checkOutTime) {
    const durationMs = this.checkOutTime.getTime() - this.checkInTime.getTime();
    this.totalHours = durationMs / (1000 * 60 * 60); // Convert milliseconds to hours
  }

  // You might need a more sophisticated 'isLate' logic based on company policy (e.g., comparing with a scheduled start time)
  // For now, let's assume if checkInTime is after a certain hour (e.g., 9 AM for a specific date),
  // we can mark it as late. This will require fetching company's work schedule.
  // For initial implementation, we'll rely on explicit 'status' for 'late'.
  
  // Reset status to 'present' if checkInTime and checkOutTime are both set
  if (this.checkInTime && this.checkOutTime && this.status !== 'on_leave') {
      this.status = 'present';
  }

  next();
});

module.exports = mongoose.model('Attendance', attendanceSchema); 