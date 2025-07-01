// backend/controllers/analytics.controller.js

const Attendance = require('../models/attendance.models');

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

exports.getStatusBreakdown = (req, res) => {
  // TODO: Implement MongoDB aggregation for status breakdown
  res.json({ breakdown: { present: 0, absent: 0, late: 0, on_leave: 0 } });
};

exports.getAttendanceLeaderboard = (req, res) => {
  // TODO: Implement MongoDB aggregation for top attendance
  res.json({ leaderboard: [] });
};

exports.getOvertimeSummary = (req, res) => {
  // TODO: Implement MongoDB aggregation for overtime summary
  res.json({ overtime: [] });
}; 