const User = require('../models/user.models');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

async function generateEmployeeId() {
  const lastUser = await User.findOne({ employeeId: { $exists: true } }).sort({ createdAt: -1 });
  let nextId = 1;
  if (lastUser && lastUser.employeeId) {
    const num = parseInt(lastUser.employeeId.replace('EMP', ''));
    if (!isNaN(num)) nextId = num + 1;
  }
  return `EMP${String(nextId).padStart(3, '0')}`;
}

exports.register = async (req, res) => {
  try {
    let { name, email, password, role } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Please provide all required fields.' });
    }
    email = email.trim().toLowerCase();
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({ message: 'User already exists.' });
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    const employeeId = await generateEmployeeId();
    const user = new User({ name, email, password: hashedPassword, role, employeeId });
    await user.save();
    res.status(201).json({ message: 'User registered successfully.', employeeId });
  } catch (err) {
    if (err.code === 11000) {
      if (err.keyPattern && err.keyPattern.email) {
        return res.status(409).json({ message: 'User already exists.' });
      }
      if (err.keyPattern && err.keyPattern.employeeId) {
        return res.status(409).json({ message: 'Employee ID already exists. Please try again.' });
      }
    }
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: 'Please provide email and password.' });
    }
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials.' });
    }
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials.' });
    }
    const token = jwt.sign(
      { id: user._id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 3600000 // 1 hour
    });
    res.json({ user: { id: user._id, name: user.name, email: user.email, role: user.role } });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

exports.logout = (req, res) => {
  res.clearCookie('token');
  res.json({ message: 'Logged out successfully.' });
}; 