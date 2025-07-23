// backend/controllers/analytics.controller.js

const mongoose = require('mongoose');
const Attendance = require('../models/attendance.models');
const User = require('../models/user.models');

exports.getAttendanceTrend = async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const start = new Date(today);
    start.setDate(today.getDate() - 29); // last 30 days

    const trend = await Attendance.aggregate([
      {
        $match: {
          date: { $gte: start, $lte: today }
        }
      },
      {
        $group: {
          _id: "$date",
          present: { $sum: { $cond: [{ $eq: ["$status", "present"] }, 1, 0] } },
          late: { $sum: { $cond: [{ $eq: ["$status", "late"] }, 1, 0] } },
          absent: { $sum: { $cond: [{ $eq: ["$status", "absent"] }, 1, 0] } },
          on_leave: { $sum: { $cond: [{ $eq: ["$status", "on_leave"] }, 1, 0] } },
          total: { $sum: 1 }
        }
      },
      {
        $project: {
          _id: 0,
          date: "$_id",
          present: 1,
          late: 1,
          absent: 1,
          on_leave: 1,
          attendanceRate: {
            $cond: [
              { $gt: ["$total", 0] },
              { $multiply: [{ $divide: [{ $add: ["$present", "$late"] }, "$total"] }, 100] },
              0
            ]
          }
        }
      },
      { $sort: { date: 1 } }
    ]);
    res.json({ trend });
  } catch (err) {
    res.status(500).json({ message: 'Error generating attendance trend', error: err.message });
  }
};

exports.getStatusBreakdown = async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const start = new Date(today);
    start.setDate(today.getDate() - 29); // last 30 days

    const result = await Attendance.aggregate([
      {
        $match: {
          date: { $gte: start, $lte: today }
        }
      },
      {
        $group: {
          _id: null,
          present: { $sum: { $cond: [{ $eq: ["$status", "present"] }, 1, 0] } },
          absent: { $sum: { $cond: [{ $eq: ["$status", "absent"] }, 1, 0] } },
          late: { $sum: { $cond: [{ $eq: ["$status", "late"] }, 1, 0] } },
          on_leave: { $sum: { $cond: [{ $eq: ["$status", "on_leave"] }, 1, 0] } }
        }
      }
    ]);
    const breakdown = result[0] || { present: 0, absent: 0, late: 0, on_leave: 0 };
    res.json({ breakdown });
  } catch (err) {
    res.status(500).json({ message: 'Error generating status breakdown', error: err.message });
  }
};

exports.getEmployeeStatusBreakdown = async (req, res) => {
  try {
    const { employeeId } = req.params;
    if (!employeeId) return res.status(400).json({ message: 'employeeId required' });
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const start = new Date(today);
    start.setDate(today.getDate() - 29); // last 30 days

    const result = await Attendance.aggregate([
      {
        $match: {
          date: { $gte: start, $lte: today },
          user: new mongoose.Types.ObjectId(employeeId)
        }
      },
      {
        $group: {
          _id: null,
          present: { $sum: { $cond: [{ $eq: ["$status", "present"] }, 1, 0] } },
          absent: { $sum: { $cond: [{ $eq: ["$status", "absent"] }, 1, 0] } },
          late: { $sum: { $cond: [{ $eq: ["$status", "late"] }, 1, 0] } },
          on_leave: { $sum: { $cond: [{ $eq: ["$status", "on_leave"] }, 1, 0] } }
        }
      }
    ]);
    const breakdown = result[0] || { present: 0, absent: 0, late: 0, on_leave: 0 };
    res.json({ breakdown });
  } catch (err) {
    res.status(500).json({ message: 'Error generating employee status breakdown', error: err.message });
  }
};

exports.getDepartmentStatusBreakdown = async (req, res) => {
  try {
    const { department } = req.params;
    if (!department) return res.status(400).json({ message: 'department required' });
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const start = new Date(today);
    start.setDate(today.getDate() - 29); // last 30 days

    // Need to join Attendance with User to filter by department
    const result = await Attendance.aggregate([
      {
        $match: {
          date: { $gte: start, $lte: today }
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: 'employeeId',
          foreignField: 'employeeId',
          as: 'user'
        }
      },
      { $unwind: '$user' },
      { $match: { 'user.department': department } },
      {
        $group: {
          _id: null,
          present: { $sum: { $cond: [{ $eq: ["$status", "present"] }, 1, 0] } },
          absent: { $sum: { $cond: [{ $eq: ["$status", "absent"] }, 1, 0] } },
          late: { $sum: { $cond: [{ $eq: ["$status", "late"] }, 1, 0] } },
          on_leave: { $sum: { $cond: [{ $eq: ["$status", "on_leave"] }, 1, 0] } }
        }
      }
    ]);
    const breakdown = result[0] || { present: 0, absent: 0, late: 0, on_leave: 0 };
    res.json({ breakdown });
  } catch (err) {
    res.status(500).json({ message: 'Error generating department status breakdown', error: err.message });
  }
};

exports.getAttendanceLeaderboard = (req, res) => {
  // TODO: Implement MongoDB aggregation for top attendance
  res.json({ leaderboard: [] });
};

exports.getOvertimeSummary = (req, res) => {
  // TODO: Implement MongoDB aggregation for overtime summary
  res.json({ overtime: [] });
};

// Generate sample attendance data for all employees for the last 30 days
exports.generateSampleData = async (req, res) => {
  try {
    const employees = await User.find({ role: 'employee', leavingDate: { $exists: false } });
    if (!employees.length) return res.status(400).json({ message: 'No employees found.' });
    const Attendance = require('../models/attendance.models');
    const statuses = ['present', 'absent', 'late', 'on_leave'];
    const now = new Date();
    const attendanceDocs = [];
    for (const emp of employees) {
      for (let i = 0; i < 30; i++) {
        const date = new Date(now);
        date.setDate(now.getDate() - i);
        // Weighted random status: more likely present, some late, some absent, some on_leave
        const rand = Math.random();
        let status = 'present';
        if (rand < 0.1) status = 'absent';
        else if (rand < 0.2) status = 'late';
        else if (rand < 0.25) status = 'on_leave';
        // Random check-in/check-out for present/late
        let checkInTime = null, checkOutTime = null, totalHours = 0;
        if (status === 'present' || status === 'late') {
          // 9:00-9:30 for present, 9:31-10:30 for late
          const baseHour = status === 'present' ? 9 : 9 + Math.floor(Math.random() * 2) + 1;
          const min = status === 'present' ? Math.floor(Math.random() * 30) : Math.floor(Math.random() * 60);
          checkInTime = new Date(date);
          checkInTime.setHours(baseHour, min, 0, 0);
          checkOutTime = new Date(date);
          checkOutTime.setHours(17, Math.floor(Math.random() * 30), 0, 0); // 17:00-17:30
          totalHours = (checkOutTime - checkInTime) / (1000 * 60 * 60);
        }
        attendanceDocs.push({
          user: emp._id,
          date,
          checkInTime,
          checkOutTime,
          status,
          method: 'manual',
          totalHours,
        });
      }
    }
    await Attendance.deleteMany({}); // Clear old data for demo
    await Attendance.insertMany(attendanceDocs);
    res.json({ message: 'Sample data generated.' });
  } catch (err) {
    res.status(500).json({ message: 'Error generating sample data', error: err.message });
  }
};

// Get average work hours for all employees for the last 30 days
exports.getAverageWorkHours = async (req, res) => {
  try {
    const Attendance = require('../models/attendance.models');
    const now = new Date();
    const start = new Date(now);
    start.setDate(now.getDate() - 29);
    start.setHours(0, 0, 0, 0);
    const result = await Attendance.aggregate([
      { $match: { date: { $gte: start, $lte: now }, totalHours: { $gt: 0 } } },
      { $group: { _id: null, avgWorkHours: { $avg: '$totalHours' } } }
    ]);
    const avgWorkHours = result[0]?.avgWorkHours || 0;
    res.json({ avgWorkHours });
  } catch (err) {
    res.status(500).json({ message: 'Error calculating average work hours', error: err.message });
  }
}; 