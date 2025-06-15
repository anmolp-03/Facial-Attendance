const Attendance = require('../models/attendance.models');
const User = require('../models/user.models');

exports.markAttendance = async (req, res) => {
  try {
    const { email, employeeId, faceId, status, method, location } = req.body;
    let user;
    if (email) {
      user = await User.findOne({ email });
    } else if (employeeId) {
      user = await User.findOne({ employeeId });
    } else if (faceId) {
      user = await User.findOne({ faceEmbeddings: faceId }); // Placeholder: adjust for real face recognition
    }
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }
    if (!status || !method) {
      return res.status(400).json({ message: 'Status and method are required.' });
    }
    const attendance = new Attendance({
      user: user._id,
      status,
      method,
      location,
      timestamp: new Date(),
    });
    await attendance.save();
    res.status(201).json({ message: 'Attendance marked successfully.' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
}; 