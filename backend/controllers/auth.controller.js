const User = require('../models/user.models');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

async function generateEmployeeId() {
  const lastUser = await User.findOne({ 
    employeeId: { $exists: true },
    role: 'employee'  // Only consider employee users
  }).sort({ createdAt: -1 });
  
  let nextId = 1;
  if (lastUser && lastUser.employeeId) {
    const num = parseInt(lastUser.employeeId.replace('EMP', ''));
    if (!isNaN(num)) nextId = num + 1;
  }
  return `EMP${String(nextId).padStart(3, '0')}`;
}

exports.setupFirstAdmin = async (req, res) => {
  try {
    // Check if any admin exists
    const adminExists = await User.findOne({ role: 'admin' });
    if (adminExists) {
      return res.status(403).json({ 
        message: 'Admin user already exists. Please login with admin credentials.' 
      });
    }

    let { name, email, password } = req.body;

    // Validate required fields
    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Please provide all required fields.' });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ message: 'Please provide a valid email address.' });
    }

    // Validate password strength
    if (password.length < 8) {
      return res.status(400).json({ message: 'Password must be at least 8 characters long.' });
    }

    email = email.trim().toLowerCase();

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({ message: 'User already exists.' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create admin user (without employeeId)
    const admin = new User({
      name,
      email,
      password: hashedPassword,
      role: 'admin',
      department: 'Administration',
      position: 'System Administrator'
    });

    await admin.save();

    // Generate token
    const token = jwt.sign(
      { id: admin._id, email: admin.email, role: admin.role },
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    );

    res.status(201).json({
      message: 'Admin user created successfully.',
      user: {
        name: admin.name,
        email: admin.email,
        role: admin.role
      },
      token
    });
  } catch (err) {
    console.error('Admin setup error:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

exports.register = async (req, res) => {
  try {
    let { name, email, password, role = 'employee', department, position } = req.body;

    // Validate required fields
    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Please provide all required fields.' });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ message: 'Please provide a valid email address.' });
    }

    // Validate password strength
    if (password.length < 8) {
      return res.status(400).json({ message: 'Password must be at least 8 characters long.' });
    }

    email = email.trim().toLowerCase();

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({ message: 'User already exists.' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user object
    const userData = {
      name,
      email,
      password: hashedPassword,
      role,
      department: department || 'General',
      position: position || 'Employee'
    };

    // Only generate employeeId for non-admin users
    if (role !== 'admin') {
      userData.employeeId = await generateEmployeeId();
    }

    const user = new User(userData);
    await user.save();

    res.status(201).json({
      message: 'User registered successfully.',
      user: {
        employeeId: user.employeeId,
        name: user.name,
        email: user.email,
        role: user.role,
        department: user.department,
        position: user.position
      }
    });
  } catch (err) {
    console.error('Registration error:', err);
    if (err.code === 11000) {
      if (err.keyPattern?.email) {
        return res.status(409).json({ message: 'Email already exists.' });
      }
      if (err.keyPattern?.employeeId) {
        return res.status(409).json({ message: 'Employee ID already exists. Please try again.' });
      }
    }
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({ message: 'Please provide email and password.' });
    }

    // Find user
    const user = await User.findOne({ 
      email: email.toLowerCase(),
      role: 'employee'  // Only allow employee login
    });

    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials.' });
    }

    // Verify password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials.' });
    }

    // Generate JWT token
    const token = jwt.sign(
      { id: user._id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    );

    // Send response
    res.json({
      message: 'Login successful',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        employeeId: user.employeeId
      },
      token
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

exports.adminLogin = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({ message: 'Please provide email and password.' });
    }

    // Find admin user
    const admin = await User.findOne({ 
      email: email.toLowerCase(),
      role: 'admin'  // Only allow admin login
    });

    if (!admin) {
      return res.status(401).json({ message: 'Invalid admin credentials.' });
    }

    // Verify password
    const isMatch = await bcrypt.compare(password, admin.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid admin credentials.' });
    }

    // Generate JWT token
    const token = jwt.sign(
      { id: admin._id, email: admin.email, role: admin.role },
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    );

    // Send response
    res.json({
      message: 'Admin login successful',
      user: {
        id: admin._id,
        name: admin.name,
        email: admin.email,
        role: admin.role
      },
      token
    });
  } catch (err) {
    console.error('Admin login error:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

exports.logout = (req, res) => {
  res.json({ message: 'Logged out successfully.' });
};

exports.getAllUsers = async (req, res) => {
  try {
    const { role, department, position, employeeId, name, sortBy, sortOrder = 'asc' } = req.query;
    let query = {};
    let sort = {};

    if (role) {
      query.role = role;
    }
    if (department) {
      query.department = department;
    }
    if (position) {
      query.position = position;
    }
    if (employeeId) {
      query.employeeId = employeeId;
    }
    if (name) {
      query.name = { $regex: name, $options: 'i' }; // Case-insensitive search
    }

    if (sortBy) {
      sort[sortBy] = sortOrder === 'desc' ? -1 : 1;
    } else {
      sort.name = 1; // Default sort by name ascending
    }

    const users = await User.find(query, '-password').sort(sort);
    res.json(users);
  } catch (err) {
    console.error('Get users error:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

exports.deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    // Prevent deleting the last admin
    const userToDelete = await User.findById(id);
    if (!userToDelete) {
      return res.status(404).json({ message: 'User not found.' });
    }

    if (userToDelete.role === 'admin') {
      const adminCount = await User.countDocuments({ role: 'admin' });
      if (adminCount <= 1) {
        return res.status(400).json({ message: 'Cannot delete the last admin user.' });
      }
    }

    await User.findByIdAndDelete(id);
    res.json({ message: 'User deleted successfully.' });
  } catch (err) {
    console.error('Delete user error:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
}; 