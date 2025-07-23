const User = require('../models/user.models');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const fetch = require('node-fetch');
const cloudinary = require('cloudinary').v2;
const { spawn } = require('child_process');
const path = require('path');
const scriptPath = path.join(__dirname, '..', '..', 'face_recognition_service', 'face_scan.py');

// Configure Cloudinary (make sure your .env has these variables)
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

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
    let { name, email, password, role = 'employee', department, position, joiningDate } = req.body;

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
      position: position || 'Employee',
      joiningDate: joiningDate ? new Date(joiningDate) : Date.now()
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
    const { role, department, position, employeeId, name, sortBy, sortOrder = 'asc', search, joiningDateFrom, joiningDateTo, leavingDateFrom, leavingDateTo, activeOnly, inactiveOnly } = req.query;
    let query = {};
    let sort = {};

    if (role) query.role = role;
    if (department) query.department = department;
    if (position) query.position = position;
    if (employeeId) query.employeeId = employeeId;
    if (name) query.name = { $regex: name, $options: 'i' };
    if (search) {
      const s = String(search);
      query.$or = [
        { name: { $regex: s, $options: 'i' } },
        { email: { $regex: s, $options: 'i' } },
        { department: { $regex: s, $options: 'i' } },
        { position: { $regex: s, $options: 'i' } },
      ];
    }
    if (joiningDateFrom || joiningDateTo) {
      query.joiningDate = {};
      if (joiningDateFrom) query.joiningDate.$gte = new Date(joiningDateFrom);
      if (joiningDateTo) query.joiningDate.$lte = new Date(joiningDateTo);
    }
    if (leavingDateFrom || leavingDateTo) {
      query.leavingDate = {};
      if (leavingDateFrom) query.leavingDate.$gte = new Date(leavingDateFrom);
      if (leavingDateTo) query.leavingDate.$lte = new Date(leavingDateTo);
    }
    if (activeOnly === 'true') {
      query.leavingDate = null;
    }
    if (inactiveOnly === 'true') {
      query.leavingDate = { $ne: null };
    }
    if (sortBy) {
      if (sortBy === 'employeeId') {
        sort.employeeId = sortOrder === 'desc' ? -1 : 1;
      } else if (sortBy === 'joiningDate') {
        sort.joiningDate = sortOrder === 'desc' ? -1 : 1;
      } else {
        sort[sortBy] = sortOrder === 'desc' ? -1 : 1;
      }
    } else {
      sort.name = 1;
    }
    const users = await User.find(query, '-password').sort(sort);
    const usersWithFace = users.map(u => {
      const obj = u.toObject();
      if (!('faceImageUrl' in obj)) obj.faceImageUrl = '';
      return obj;
    });
    res.json(usersWithFace);
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

exports.registerWithFace = async (req, res) => {
  try {
    const { name, email, password, department, position, faceImage } = req.body;
    if (!name || !email || !password || !faceImage) {
      return res.status(400).json({ message: 'All fields and face image are required.' });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({ message: 'User already exists.' });
    }

    // 1. Upload image to Cloudinary
    const dataUri = `data:image/jpeg;base64,${faceImage}`;
    const uploadResult = await cloudinary.uploader.upload(dataUri, {
      folder: 'employee_faces',
      resource_type: 'image',
    });
    const cloudinaryUrl = uploadResult.secure_url;

    // 2. Call Python script to get face encoding
    const getFaceEncoding = (imageUrl) => {
      return new Promise((resolve, reject) => {
        const py = spawn('python', [scriptPath, imageUrl]);
        let result = '';
        let error = '';
        py.stdout.on('data', (data) => { result += data.toString(); });
        py.stderr.on('data', (data) => { error += data.toString(); });
        py.on('close', (code) => {
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

    let faceEncoding;
    try {
      faceEncoding = await getFaceEncoding(cloudinaryUrl);
    } catch (err) {
      return res.status(400).json({ message: 'Face encoding failed: ' + err });
    }

    // 3. Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // 4. Create user in MongoDB with Cloudinary URL and face encoding
    const user = new User({
      name,
      email,
      password: hashedPassword,
      role: 'employee',
      department: department || 'General',
      position: position || 'Employee',
      employeeId: await generateEmployeeId(),
      faceImageUrl: cloudinaryUrl,
      faceEmbeddings: faceEncoding,
    });
    await user.save();

    res.status(201).json({
      message: 'User and face registered successfully.',
      user: {
        employeeId: user.employeeId,
        name: user.name,
        email: user.email,
        role: user.role,
        department: user.department,
        position: user.position,
        faceImageUrl: user.faceImageUrl,
      }
    });
  } catch (err) {
    console.error('registerWithFace error:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

exports.addFaceToUser = async (req, res) => {
  try {
    const { email, faceImage } = req.body;
    if (!email || !faceImage) {
      return res.status(400).json({ message: 'Email and face image are required.' });
    }
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: 'User not found.' });

    // 1. Upload image to Cloudinary
    const dataUri = `data:image/jpeg;base64,${faceImage}`;
    const uploadResult = await cloudinary.uploader.upload(dataUri, {
      folder: 'employee_faces',
      resource_type: 'image',
    });
    const cloudinaryUrl = uploadResult.secure_url;

    // 2. Call Python script to get face encoding
    const getFaceEncoding = (imageUrl) => {
      return new Promise((resolve, reject) => {
        const py = spawn('python', [scriptPath, imageUrl]);
        let result = '';
        let error = '';
        py.stdout.on('data', (data) => { result += data.toString(); });
        py.stderr.on('data', (data) => { error += data.toString(); });
        py.on('close', (code) => {
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

    let faceEncoding;
    try {
      faceEncoding = await getFaceEncoding(cloudinaryUrl);
    } catch (err) {
      return res.status(400).json({ message: 'Face encoding failed: ' + err });
    }

    // 3. Update user in MongoDB with Cloudinary URL and face encoding
    user.faceImageUrl = cloudinaryUrl;
    user.faceEmbeddings = faceEncoding;
    await user.save();

    res.json({
      message: 'Face registered successfully.',
      faceImageUrl: user.faceImageUrl,
    });
  } catch (err) {
    console.error('addFaceToUser error:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

exports.adminReauth = async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'No token provided.' });
    }
    const token = authHeader.split(' ')[1];
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch {
      return res.status(401).json({ message: 'Invalid token.' });
    }
    const admin = await User.findById(decoded.id);
    if (!admin || admin.role !== 'admin') {
      return res.status(401).json({ message: 'Not an admin.' });
    }
    const { password } = req.body;
    if (!password) {
      return res.status(400).json({ message: 'Password required.' });
    }
    const isMatch = await bcrypt.compare(password, admin.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Incorrect password.' });
    }
    res.json({ message: 'Re-authenticated.' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

exports.updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, department, position, joiningDate, leavingDate } = req.body;
    const user = await User.findById(id);
    if (!user) return res.status(404).json({ message: 'User not found.' });
    if (name) user.name = name;
    if (email) user.email = email;
    if (department !== undefined) user.department = department;
    if (position !== undefined) user.position = position;
    if (joiningDate !== undefined) user.joiningDate = joiningDate ? new Date(joiningDate) : null;
    if (leavingDate !== undefined) user.leavingDate = leavingDate ? new Date(leavingDate) : null;
    await user.save();
    const { password, ...userData } = user.toObject();
    res.json({ message: 'User updated successfully.', user: userData });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
}; 

// Admin resets an employee's password
exports.adminResetPassword = async (req, res) => {
  try {
    const { adminEmail, adminPassword, employeeEmail, newPassword } = req.body;
    if (!adminEmail || !adminPassword || !employeeEmail || !newPassword) {
      return res.status(400).json({ message: 'All fields are required.' });
    }
    // Find admin
    const admin = await User.findOne({ email: adminEmail.toLowerCase(), role: 'admin' });
    if (!admin) {
      return res.status(401).json({ message: 'Invalid admin credentials.' });
    }
    const isAdminMatch = await bcrypt.compare(adminPassword, admin.password);
    if (!isAdminMatch) {
      return res.status(401).json({ message: 'Invalid admin credentials.' });
    }
    // Find employee
    const employee = await User.findOne({ email: employeeEmail.toLowerCase(), role: 'employee' });
    if (!employee) {
      return res.status(404).json({ message: 'Employee not found.' });
    }
    // Validate new password
    if (newPassword.length < 8) {
      return res.status(400).json({ message: 'Password must be at least 8 characters long.' });
    }
    // Hash and update password
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    employee.password = hashedPassword;
    await employee.save();
    res.json({ message: 'Password reset successfully.' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
}; 