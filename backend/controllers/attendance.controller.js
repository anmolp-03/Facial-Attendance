const Attendance = require('../models/attendance.models');
const User = require('../models/user.models');
const mongoose = require('mongoose');
const cloudinary = require('cloudinary').v2;
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

// Helper to get start of day for consistent date querying
const getStartOfDay = (date) => {
    const d = new Date(date);
    d.setUTCHours(0, 0, 0, 0);
    return d;
};

// @desc Mark attendance (check-in/check-out) for an employee
// @route POST /api/attendance/mark
// @access Public (or adjust based on face rec service's auth needs)
exports.markAttendance = async (req, res) => {
    try {
        const { userId, method, location } = req.body;
        if (!userId || !method) {
            return res.status(400).json({ message: 'User ID and method are required.' });
        }
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found.' });
        }
        if (user.role === 'admin') {
            return res.status(403).json({ message: 'Admins cannot mark attendance via this endpoint.' });
        }
        // Check if this is a check-out (most recent record without checkOutTime)
        let attendanceRecord = await Attendance.findOne({
            user: userId,
            checkOutTime: { $exists: false }
        }).sort({ checkInTime: -1 });
        if (attendanceRecord) {
            attendanceRecord.checkOutTime = new Date();
            attendanceRecord.method = method;
            attendanceRecord.location = location || attendanceRecord.location;
            await attendanceRecord.save();
            return res.status(200).json({ message: 'Checked out successfully.', attendance: attendanceRecord });
        } else {
            // Always create a new record for check-in
            attendanceRecord = new Attendance({
                user: userId,
                date: getStartOfDay(new Date()),
                checkInTime: new Date(),
                status: 'present',
                method,
                location
            });
            await attendanceRecord.save();
            return res.status(201).json({ message: 'Checked in successfully.', attendance: attendanceRecord });
        }
    } catch (err) {
        console.error('Mark attendance error:', err);
        res.status(500).json({ message: 'Server error', error: err.message });
    }
};

// @desc Admin: Add a new attendance record (manual entry)
// @route POST /api/attendance/admin/add
// @access Private (Admin only)
exports.addAttendanceRecord = async (req, res) => {
    try {
        const { userId, date, checkInTime, checkOutTime, status, method = 'manual', location } = req.body;

        if (!userId || !date) {
            return res.status(400).json({ message: 'User ID and date are required.' });
        }

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found.' });
        }

        const recordDate = getStartOfDay(date);
        // Check if a record for this user and date already exists
        const existingRecord = await Attendance.findOne({
            user: userId,
            date: recordDate
        });

        if (existingRecord) {
            return res.status(409).json({ message: 'Attendance record for this user and date already exists. Use update endpoint instead.' });
        }

        const newRecord = new Attendance({
            user: userId,
            date: recordDate,
            checkInTime: checkInTime ? new Date(checkInTime) : undefined,
            checkOutTime: checkOutTime ? new Date(checkOutTime) : undefined,
            status: status || 'present',
            method,
            location
        });

        await newRecord.save();
        res.status(201).json({ message: 'Attendance record added successfully.', attendance: newRecord });

    } catch (err) {
        console.error('Add attendance record error:', err);
        res.status(500).json({ message: 'Server error', error: err.message });
    }
};

// @desc Admin: Update an existing attendance record
// @route PUT /api/attendance/admin/:id
// @access Private (Admin only)
exports.updateAttendanceRecord = async (req, res) => {
    try {
        const { id } = req.params;
        const { date, checkInTime, checkOutTime, status, method, location } = req.body;

        const attendanceRecord = await Attendance.findById(id);

        if (!attendanceRecord) {
            return res.status(404).json({ message: 'Attendance record not found.' });
        }

        if (date) attendanceRecord.date = getStartOfDay(date);
        if (checkInTime) attendanceRecord.checkInTime = new Date(checkInTime);
        if (checkOutTime) attendanceRecord.checkOutTime = new Date(checkOutTime);
        if (status) attendanceRecord.status = status;
        if (method) attendanceRecord.method = method;
        if (location) attendanceRecord.location = location;

        await attendanceRecord.save();
        res.status(200).json({ message: 'Attendance record updated successfully.', attendance: attendanceRecord });

    } catch (err) {
        console.error('Update attendance record error:', err);
        res.status(500).json({ message: 'Server error', error: err.message });
    }
};

// @desc Admin: Delete an attendance record
// @route DELETE /api/attendance/admin/:id
// @access Private (Admin only)
exports.deleteAttendanceRecord = async (req, res) => {
    try {
        const { id } = req.params;

        const result = await Attendance.findByIdAndDelete(id);

        if (!result) {
            return res.status(404).json({ message: 'Attendance record not found.' });
        }

        res.status(200).json({ message: 'Attendance record deleted successfully.' });

    } catch (err) {
        console.error('Delete attendance record error:', err);
        res.status(500).json({ message: 'Server error', error: err.message });
    }
};

// @desc Admin: Get attendance records for a specific user
// @route GET /api/attendance/admin/user/:userId
// @access Private (Admin only)
exports.getAttendanceRecordsByUser = async (req, res) => {
    try {
        const { userId } = req.params;
        const { startDate, endDate, status, sortBy = 'date', sortOrder = 'desc' } = req.query;

        const query = { user: userId };
        if (startDate) query.date = { ...query.date, $gte: getStartOfDay(startDate) };
        if (endDate) query.date = { ...query.date, $lte: getStartOfDay(endDate) };
        if (status) query.status = status;

        const sort = {};
        sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

        const attendanceRecords = await Attendance.find(query)
            .populate('user', 'name employeeId email') // Populate user details
            .sort(sort);

        res.status(200).json(attendanceRecords);

    } catch (err) {
        console.error('Get attendance records by user error:', err);
        res.status(500).json({ message: 'Server error', error: err.message });
    }
};

// @desc Admin: Get attendance summary (weekly, monthly, custom range)
// @route GET /api/attendance/admin/summary
// @access Private (Admin only)
exports.getAttendanceSummary = async (req, res) => {
    try {
        const { userId, period = 'daily', startDate, endDate } = req.query;
        let matchQuery = {};

        if (userId) {
            matchQuery.user = new mongoose.Types.ObjectId(userId);
        }

        let start;
        let end;

        if (startDate && endDate) {
            start = getStartOfDay(startDate);
            end = getStartOfDay(endDate);
            matchQuery.date = { $gte: start, $lte: end };
        } else {
            // Default to last 30 days if no range specified
            end = getStartOfDay(new Date());
            start = getStartOfDay(new Date());
            start.setDate(end.getDate() - 30);
            matchQuery.date = { $gte: start, $lte: end };
        }

        let group = {};
        let project = {
            _id: 0,
            user_id: '$_id.userId',
            user_name: '$userName',
            employee_id: '$employeeId',
            record_date: '$_id.attendanceDate',
            totalPresent: '$totalPresent',
            totalLate: '$totalLate',
            totalAbsent: '$totalAbsent',
            totalOnLeave: '$totalOnLeave',
            totalHoursWorked: '$totalHoursWorked',
            averageHoursPerDay: {
                $cond: [
                    { $gt: [{ $add: ['$totalPresent', '$totalLate'] }, 0] },
                    { $divide: ['$totalHoursWorked', { $add: ['$totalPresent', '$totalLate'] }] },
                    0
                ]
            }
        };

        if (period === 'daily') {
            group = {
                _id: { userId: '$user', attendanceDate: '$date' },
                userName: { $first: '$user.name' },
                employeeId: { $first: '$user.employeeId' },
                totalPresent: { $sum: { $cond: [{ $eq: ['$status', 'present'] }, 1, 0] } },
                totalLate: { $sum: { $cond: [{ $eq: ['$status', 'late'] }, 1, 0] } },
                totalAbsent: { $sum: { $cond: [{ $eq: ['$status', 'absent'] }, 1, 0] } },
                totalOnLeave: { $sum: { $cond: [{ $eq: ['$status', 'on_leave'] }, 1, 0] } },
                totalHoursWorked: { $sum: '$totalHours' },
                overtimeHours: { $sum: { $cond: [{ $gt: ['$totalHours', 8] }, { $subtract: ['$totalHours', 8] }, 0] } }
            };
        } else if (period === 'weekly') {
            group = {
                _id: { userId: '$user', attendanceWeek: { $isoWeek: '$date' }, attendanceYear: { $isoWeekYear: '$date' } },
                userName: { $first: '$user.name' },
                employeeId: { $first: '$user.employeeId' },
                totalPresent: { $sum: { $cond: [{ $eq: ['$status', 'present'] }, 1, 0] } },
                totalLate: { $sum: { $cond: [{ $eq: ['$status', 'late'] }, 1, 0] } },
                totalAbsent: { $sum: { $cond: [{ $eq: ['$status', 'absent'] }, 1, 0] } },
                totalOnLeave: { $sum: { $cond: [{ $eq: ['$status', 'on_leave'] }, 1, 0] } },
                totalHoursWorked: { $sum: '$totalHours' },
                overtimeHours: { $sum: { $cond: [{ $gt: ['$totalHours', 8] }, { $subtract: ['$totalHours', 8] }, 0] } },
                weekStartDate: { $min: '$date' },
                weekEndDate: { $max: '$date' }
            };
            project.record_week = '$_id.attendanceWeek';
            project.record_year = '$_id.attendanceYear';
            project.week_start_date = '$weekStartDate';
            project.week_end_date = '$weekEndDate';
            project.averageHoursPerWeek = {
                $cond: [
                  { $gt: [{ $add: ['$totalPresent', '$totalLate'] }, 0] },
                  { $divide: ['$totalHoursWorked', { $add: ['$totalPresent', '$totalLate'] }] },
                  0
                ]
              };
            delete project.record_date;
        } else if (period === 'monthly') {
            group = {
                _id: { userId: '$user', attendanceMonth: { $month: '$date' }, attendanceYear: { $year: '$date' } },
                userName: { $first: '$user.name' },
                employeeId: { $first: '$user.employeeId' },
                totalPresent: { $sum: { $cond: [{ $eq: ['$status', 'present'] }, 1, 0] } },
                totalLate: { $sum: { $cond: [{ $eq: ['$status', 'late'] }, 1, 0] } },
                totalAbsent: { $sum: { $cond: [{ $eq: ['$status', 'absent'] }, 1, 0] } },
                totalOnLeave: { $sum: { $cond: [{ $eq: ['$status', 'on_leave'] }, 1, 0] } },
                totalHoursWorked: { $sum: '$totalHours' },
                overtimeHours: { $sum: { $cond: [{ $gt: ['$totalHours', 8] }, { $subtract: ['$totalHours', 8] }, 0] } },
                monthStartDate: { $min: '$date' },
                monthEndDate: { $max: '$date' }
            };
            project.record_month = '$_id.attendanceMonth';
            project.record_year = '$_id.attendanceYear';
            project.month_start_date = '$monthStartDate';
            project.month_end_date = '$monthEndDate';
            project.averageHoursPerMonth = {
                $cond: [
                    { $gt: [{ $add: ['$totalPresent', '$totalLate'] }, 0] },
                    { $divide: ['$totalHoursWorked', { $add: ['$totalPresent', '$totalLate'] }] },
                    0
                ]
            };
            delete project.record_date;
        } else {
            return res.status(400).json({ message: 'Invalid period specified. Use daily, weekly, or monthly.' });
        }

        // Add attendance rate calculation
        project.attendance_rate = {
            $multiply: [
                { $divide: [
                    { $add: ['$totalPresent', '$totalLate'] },
                    { $add: ['$totalPresent', '$totalLate', '$totalAbsent', '$totalOnLeave'] }
                ]},
                100
            ]
        };

        const pipeline = [
            { '$match': matchQuery },
            { '$lookup': { 
                from: 'users', 
                localField: 'user', 
                foreignField: '_id', 
                as: 'user',
                pipeline: [
                    { '$project': { 
                        _id: 1,
                        name: 1,
                        employeeId: 1,
                        email: 1,
                        role: 1
                    }}
                ]
            }},
            { '$unwind': '$user' },
            { '$group': group },
            { '$project': project },
            { '$sort': { 'record_year': 1, 'record_month': 1, 'record_week': 1, 'record_date': 1 } }
        ];

        console.log('Attendance Summary Aggregation Pipeline:', JSON.stringify(pipeline, null, 2));

        const summary = await Attendance.aggregate(pipeline);

        res.status(200).json(summary);

    } catch (err) {
        console.error('Get attendance summary error:', err);
        res.status(500).json({ message: 'Server error', error: err.message });
    }
};

// @desc Admin: Get conceptual payroll data based on total hours
// @route GET /api/attendance/admin/payroll
// @access Private (Admin only)
exports.getPayrollData = async (req, res) => {
    try {
        const { userId, startDate, endDate } = req.query;

        let matchQuery = {};
        if (userId) {
            matchQuery.user = new mongoose.Types.ObjectId(userId);
        }

        let start;
        let end;

        if (startDate && endDate) {
            start = getStartOfDay(startDate);
            end = getStartOfDay(endDate);
            matchQuery.date = { '$gte': start, '$lte': end };
        } else {
            // Default to current month's data
            const now = new Date();
            start = new Date(now.getFullYear(), now.getMonth(), 1);
            end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
            matchQuery.date = { '$gte': start, '$lte': end };
        }

        const pipeline = [
            { '$match': matchQuery },
            { '$lookup': { 
                from: 'users', 
                localField: 'user', 
                foreignField: '_id', 
                as: 'user',
                pipeline: [
                    { '$project': { 
                        _id: 1,
                        name: 1,
                        employeeId: 1,
                        email: 1,
                        role: 1
                    }}
                ]
            }},
            { '$unwind': '$user' },
            { '$group': {
                _id: '$user._id',
                userName: { $first: '$user.name' },
                employeeId: { $first: '$user.employeeId' },
                totalHoursWorked: { $sum: '$totalHours' },
                totalPresentDays: { $sum: { $cond: [{ $eq: ['$status', 'present'] }, 1, 0] } }
            }},
            { '$project': {
                _id: 0,
                user_id: '$_id',
                user_name: '$userName',
                employee_id: '$employeeId',
                totalHoursWorked: 1,
                totalPresentDays: 1
            }}
        ];

        console.log('Payroll Aggregation Pipeline:', JSON.stringify(pipeline, null, 2));

        const payrollSummary = await Attendance.aggregate(pipeline);

        res.status(200).json(payrollSummary);

    } catch (err) {
        console.error('Get payroll data error:', err);
        res.status(500).json({ message: 'Server error', error: err.message });
    }
};

// @desc Employee: Get their own attendance records
// @route GET /api/attendance/my-records
// @access Private (Authenticated user)
exports.getMyAttendanceRecords = async (req, res) => {
    try {
        const userId = req.user._id; // Get user ID from authenticated token
        const { startDate, endDate, status, sortBy = 'date', sortOrder = 'desc' } = req.query;

        const query = { user: userId };
        if (startDate) query.date = { ...query.date, '$gte': getStartOfDay(startDate) };
        if (endDate) query.date = { ...query.date, '$lte': getStartOfDay(endDate) };
        if (status) query.status = status;

        const sort = {};
        sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

        const attendanceRecords = await Attendance.find(query)
            .populate('user', 'name employeeId email role') // Explicitly specify fields to populate
            .sort(sort);

        res.status(200).json(attendanceRecords);

    } catch (err) {
        console.error('Get my attendance records error:', err);
        res.status(500).json({ message: 'Server error', error: err.message });
    }
};

// @desc Employee: Get their own attendance summary
// @route GET /api/attendance/my-summary
// @access Private (Authenticated user)
exports.getMyAttendanceSummary = async (req, res) => {
    try {
        const userId = req.user._id; // Get user ID from authenticated token
        // Remove date filtering for overall summary
        const matchQuery = { user: new mongoose.Types.ObjectId(userId) };

        // Aggregate all records for this user
        const result = await Attendance.aggregate([
            { $match: matchQuery },
            {
                $group: {
                    _id: null,
                    presentDays: { $sum: { $cond: [{ $eq: ["$status", "present"] }, 1, 0] } },
                    lateDays: { $sum: { $cond: [{ $eq: ["$status", "late"] }, 1, 0] } },
                    absentDays: { $sum: { $cond: [{ $eq: ["$status", "absent"] }, 1, 0] } },
                    onLeaveDays: { $sum: { $cond: [{ $eq: ["$status", "on_leave"] }, 1, 0] } },
                    totalHours: { $sum: "$totalHours" },
                    totalDays: { $sum: 1 }
                }
            }
        ]);
        const data = result[0] || { presentDays: 0, lateDays: 0, absentDays: 0, onLeaveDays: 0, totalHours: 0, totalDays: 0 };
        const attended = data.presentDays + data.lateDays;
        const attendanceRate = data.totalDays > 0 ? Math.round((attended / data.totalDays) * 100) : 0;
        const averageHours = attended > 0 ? data.totalHours / attended : 0;
        res.status(200).json({
            presentDays: data.presentDays,
            lateDays: data.lateDays,
            absentDays: data.absentDays,
            onLeaveDays: data.onLeaveDays,
            totalDays: data.totalDays,
            averageHours,
            attendanceRate
        });
    } catch (err) {
        console.error('Get my attendance summary error:', err);
        res.status(500).json({ message: 'Server error', error: err.message });
    }
};

const scriptPath = path.join(__dirname, '..', '..', 'face_recognition_service', 'face_scan.py');

exports.scanAndMarkAttendance = async (req, res) => {
  try {
    const { faceImage, method = 'face', location } = req.body;
    if (!faceImage) {
      return res.status(400).json({ message: 'Face image is required.' });
    }
    // 1. Save the base64 image to a temporary file
    const tmpDir = path.join(__dirname, '../../tmp');
    if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir);
    const tmpFile = path.join(tmpDir, `scan_${Date.now()}.jpg`);
    fs.writeFileSync(tmpFile, Buffer.from(faceImage, 'base64'));

    // 2. Call Python script to get face encoding (pass local file path)
    const getFaceEncoding = (imagePath) => {
      return new Promise((resolve, reject) => {
        const py = spawn('python', [scriptPath, imagePath]);
        let result = '';
        let error = '';
        py.stdout.on('data', (data) => { result += data.toString(); });
        py.stderr.on('data', (data) => { error += data.toString(); });
        py.on('close', (code) => {
          fs.unlinkSync(tmpFile); // Clean up temp file
          if (code !== 0 || error) return reject(error || 'Python process failed');
          try {
            const parsed = JSON.parse(result);
            if (parsed.success) resolve(parsed.encoding);
            else reject(parsed.error);
          } catch (e) {
            reject('Invalid JSON from Python');
          }
        });
      });
    };

    let scanEncoding;
    try {
      scanEncoding = await getFaceEncoding(tmpFile);
    } catch (err) {
      return res.status(400).json({ message: 'Face encoding failed: ' + err });
    }

    // 3. Compare encoding to all users
    const users = await User.find({ faceEmbeddings: { $exists: true, $ne: [] } });
    const euclideanDistance = (a, b) => {
      if (!a || !b || a.length !== b.length) return Infinity;
      return Math.sqrt(a.reduce((sum, v, i) => sum + Math.pow(v - b[i], 2), 0));
    };
    let matchedUser = null;
    let minDistance = Infinity;
    for (const user of users) {
      const dist = euclideanDistance(scanEncoding, user.faceEmbeddings);
      if (dist < 0.6 && dist < minDistance) { // 0.6 is a common threshold
        minDistance = dist;
        matchedUser = user;
      }
    }
    if (!matchedUser) {
      return res.status(404).json({ message: 'No matching user found.' });
    }

    // 4. Mark attendance for matched user (reuse markAttendance logic)
    req.body.userId = matchedUser._id;
    req.body.method = method;
    req.body.location = location;
    // Call markAttendance and capture its response
    // Instead of returning directly, capture the response data
    const originalJson = res.json;
    res.json = (data) => {
      // Add employee name, employeeId, and time
      const user = matchedUser;
      let time = null;
      if (data && data.attendance) {
        if (data.attendance.checkInTime && !data.attendance.checkOutTime) {
          time = data.attendance.checkInTime;
        } else if (data.attendance.checkOutTime) {
          time = data.attendance.checkOutTime;
        }
      }
      let formattedTime = null;
      if (time) {
        const d = new Date(time);
        let hours = d.getHours();
        const minutes = d.getMinutes();
        const ampm = hours >= 12 ? 'pm' : 'am';
        hours = hours % 12;
        hours = hours ? hours : 12; // the hour '0' should be '12'
        const mins = minutes < 10 ? '0' + minutes : minutes;
        formattedTime = `${hours}:${mins} ${ampm}`;
      }
      return originalJson.call(res, {
        ...data,
        employeeId: user.employeeId,
        name: user.name,
        time: formattedTime,
      });
    };
    return exports.markAttendance(req, res);
  } catch (err) {
    console.error('scanAndMarkAttendance error:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
}; 