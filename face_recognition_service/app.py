import os
import logging
import numpy as np
from flask import Flask, request, jsonify
import face_recognition
import cv2
import cloudinary
import cloudinary.uploader
from dotenv import load_dotenv
from datetime import datetime
import bcrypt
from jose import jwt
from functools import wraps
from db_config import face_collection, employee_collection, attendance_collection
from flask_cors import CORS
import base64

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

load_dotenv()

app = Flask(__name__)
app.config['SECRET_KEY'] = os.getenv('JWT_SECRET_KEY', 'your-secret-key-here')

# Configure Cloudinary
cloudinary.config(
    cloud_name=os.getenv('CLOUDINARY_CLOUD_NAME'),
    api_key=os.getenv('CLOUDINARY_API_KEY'),
    api_secret=os.getenv('CLOUDINARY_API_SECRET')
)

CORS(app)

def admin_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = request.headers.get('Authorization')
        if not token:
            return jsonify({'error': 'Token is missing'}), 401
        try:
            token = token.split(' ')[1]  # Remove 'Bearer ' prefix
            data = jwt.decode(token, app.config['SECRET_KEY'], algorithms=['HS256'])
            current_user = employee_collection.find_one({'_id': data['employee_id']})
            if not current_user or not current_user.get('is_admin', False):
                return jsonify({'error': 'Admin access required'}), 403
        except Exception as e:
            return jsonify({'error': 'Invalid token'}), 401
        return f(current_user, *args, **kwargs)
    return decorated

def detect_liveness(image):
    """
    Enhanced liveness detection using multiple checks
    """
    try:
        # Convert to grayscale
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        # Load the pre-trained classifiers
        haarcascades_path = cv2.__file__.replace('cv2.cpython-{}.so'.format(cv2.__version__.split('.')[0]), '') + 'data/'
        face_cascade = cv2.CascadeClassifier(haarcascades_path + 'haarcascade_frontalface_default.xml')
        eye_cascade = cv2.CascadeClassifier(haarcascades_path + 'haarcascade_eye.xml')

        # Detect faces
        faces = face_cascade.detectMultiScale(gray, 1.3, 5)
        
        if len(faces) == 0:
            return False
            
        for (x, y, w, h) in faces:
            roi_gray = gray[y:y+h, x:x+w]
            roi_color = image[y:y+h, x:x+w]
            eyes = eye_cascade.detectMultiScale(roi_gray)
            
            # Check for multiple faces (anti-spoofing)
            if len(faces) > 1:
                return False
                
            # Check for eye presence
            if len(eyes) < 1:
                return False
                
            # Check face size (anti-spoofing)
            if w < 100 or h < 100:  # Face too small
                return False
                
            # Check face position (should be centered)
            height, width = image.shape[:2]
            if x < width * 0.1 or x + w > width * 0.9 or y < height * 0.1 or y + h > height * 0.9:
                return False
                
        return True
    except Exception as e:
        logger.error(f"Error in liveness detection: {str(e)}")
        return False

# Public endpoints (no authentication required)
@app.route('/api/attendance/mark', methods=['POST'])
def mark_attendance():
    """
    Public endpoint for marking attendance using face recognition
    """
    try:
        if 'image' not in request.files:
            return jsonify({'error': 'No image file provided'}), 400
            
        image_file = request.files['image']
        
        # Read image for face detection
        image_array = np.frombuffer(image_file.read(), np.uint8)
        image = cv2.imdecode(image_array, cv2.IMREAD_COLOR)
        
        # Check for liveness
        if not detect_liveness(image):
            return jsonify({'error': 'Liveness detection failed. Please ensure you are a real person.'}), 400
        
        # Detect face and get encoding
        face_locations = face_recognition.face_locations(image)
        if not face_locations:
            return jsonify({'error': 'No face detected in the image'}), 400
            
        face_encoding = face_recognition.face_encodings(image, face_locations)[0]
        
        # Get all face encodings from database
        stored_faces = list(face_collection.find({}, {'face_encoding': 1, 'employee_id': 1}))
        
        if not stored_faces:
            return jsonify({'error': 'No faces registered in the system'}), 404
            
        # Compare with stored faces
        matches = face_recognition.compare_faces(
            [np.array(face['face_encoding']) for face in stored_faces],
            face_encoding,
            tolerance=0.6
        )
        
        if True not in matches:
            return jsonify({'error': 'Face not recognized'}), 404
            
        # Get the matched employee
        matched_index = matches.index(True)
        matched_employee = stored_faces[matched_index]
        
        # Check if attendance already marked today
        today = datetime.utcnow().date()
        existing_attendance = attendance_collection.find_one({
            'employee_id': matched_employee['employee_id'],
            'timestamp': {
                '$gte': datetime.combine(today, datetime.min.time()),
                '$lte': datetime.combine(today, datetime.max.time())
            }
        })
        
        if existing_attendance:
            return jsonify({
                'message': 'Attendance already marked for today',
                'employee_id': matched_employee['employee_id'],
                'timestamp': existing_attendance['timestamp']
            }), 200
        
        # Log attendance
        attendance_log = {
            'employee_id': matched_employee['employee_id'],
            'timestamp': datetime.utcnow(),
            'confidence': float(1 - face_recognition.face_distance(
                [face_encoding],
                [np.array(matched_employee['face_encoding'])]
            )[0])
        }
        
        attendance_collection.insert_one(attendance_log)
        
        return jsonify({
            'message': 'Attendance marked successfully',
            'employee_id': matched_employee['employee_id'],
            'timestamp': attendance_log['timestamp']
        }), 200
        
    except Exception as e:
        logger.error(f"Error in marking attendance: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500

# Protected endpoints (require authentication)
@app.route('/api/admin/register', methods=['POST'])
@admin_required
def register_employee(current_user):
    """
    Admin endpoint for registering new employees
    """
    try:
        data = request.form
        required_fields = ['employee_id', 'name', 'email', 'password']
        
        # Validate required fields
        if not all(field in data for field in required_fields):
            return jsonify({'error': 'Missing required fields'}), 400
            
        # Check if employee already exists
        if employee_collection.find_one({'employee_id': data['employee_id']}):
            return jsonify({'error': 'Employee ID already exists'}), 400
            
        # Hash password
        hashed_password = bcrypt.hashpw(data['password'].encode('utf-8'), bcrypt.gensalt())
        
        # Create employee document
        employee = {
            'employee_id': data['employee_id'],
            'name': data['name'],
            'email': data['email'],
            'password': hashed_password,
            'is_admin': data.get('is_admin', False),
            'created_at': datetime.utcnow()
        }
        
        employee_collection.insert_one(employee)
        
        return jsonify({'message': 'Employee registered successfully'}), 201
        
    except Exception as e:
        logger.error(f"Error in employee registration: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500

@app.route('/api/admin/upload-face', methods=['POST'])
@admin_required
def upload_face(current_user):
    """
    Admin endpoint for uploading employee face data
    """
    try:
        if 'image' not in request.files:
            return jsonify({'error': 'No image file provided'}), 400
            
        employee_id = request.form.get('employee_id')
        if not employee_id:
            return jsonify({'error': 'Employee ID is required'}), 400
            
        # Verify employee exists
        employee = employee_collection.find_one({'employee_id': employee_id})
        if not employee:
            return jsonify({'error': 'Employee not found'}), 404
            
        image_file = request.files['image']
        
        # Read image for face detection
        image_array = np.frombuffer(image_file.read(), np.uint8)
        image = cv2.imdecode(image_array, cv2.IMREAD_COLOR)
        
        # Check for liveness
        if not detect_liveness(image):
            return jsonify({'error': 'Liveness detection failed. Please ensure you are a real person.'}), 400
            
        # Detect face and get encoding
        face_locations = face_recognition.face_locations(image)
        if not face_locations:
            return jsonify({'error': 'No face detected in the image'}), 400
            
        face_encoding = face_recognition.face_encodings(image, face_locations)[0]
        
        # Store face encoding in MongoDB
        face_data = {
            'employee_id': employee_id,
            'face_encoding': face_encoding.tolist(),
            'created_at': datetime.utcnow()
        }
        
        # Update or insert face encoding
        face_collection.update_one(
            {'employee_id': employee_id},
            {'$set': face_data},
            upsert=True
        )
        
        # Upload to Cloudinary
        image_file.seek(0)
        upload_result = cloudinary.uploader.upload(
            image_file,
            folder="employee_faces",
            public_id=f"employee_{employee_id}_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
        )
        
        return jsonify({
            'message': 'Face registered successfully',
            'image_url': upload_result['secure_url']
        }), 201
        
    except Exception as e:
        logger.error(f"Error in face upload: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500

@app.route('/api/employee/login', methods=['POST'])
def login():
    """
    Employee login endpoint
    """
    try:
        data = request.form
        if not all(k in data for k in ['employee_id', 'password']):
            return jsonify({'error': 'Missing credentials'}), 400
            
        employee = employee_collection.find_one({'employee_id': data['employee_id']})
        if not employee:
            return jsonify({'error': 'Invalid credentials'}), 401
            
        if not bcrypt.checkpw(data['password'].encode('utf-8'), employee['password']):
            return jsonify({'error': 'Invalid credentials'}), 401
            
        # Generate JWT token
        token = jwt.encode(
            {
                'employee_id': employee['employee_id'],
                'is_admin': employee.get('is_admin', False)
            },
            app.config['SECRET_KEY'],
            algorithm='HS256'
        )
        
        return jsonify({
            'token': token,
            'is_admin': employee.get('is_admin', False)
        }), 200
        
    except Exception as e:
        logger.error(f"Error in login: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500

@app.route('/api/employee/attendance', methods=['GET'])
def get_attendance():
    """
    Get employee's attendance history
    """
    try:
        token = request.headers.get('Authorization')
        if not token:
            return jsonify({'error': 'Token is missing'}), 401
            
        token = token.split(' ')[1]
        data = jwt.decode(token, app.config['SECRET_KEY'], algorithms=['HS256'])
        employee_id = data['employee_id']
        
        # Get attendance records
        attendance_records = list(attendance_collection.find(
            {'employee_id': employee_id},
            {'_id': 0, 'employee_id': 1, 'timestamp': 1, 'confidence': 1}
        ).sort('timestamp', -1))
        
        return jsonify({
            'employee_id': employee_id,
            'attendance_records': attendance_records
        }), 200
        
    except Exception as e:
        logger.error(f"Error in getting attendance: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500

@app.route('/face-recognition/scan', methods=['POST'])
def face_scan():
    data = request.get_json()
    if not data or 'image' not in data:
        return jsonify({'success': False, 'message': 'No image provided'}), 400
    image_b64 = data['image']
    # Decode base64 image
    image_data = image_b64.split(',')[1] if ',' in image_b64 else image_b64
    nparr = np.frombuffer(base64.b64decode(image_data), np.uint8)
    image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    # Face recognition logic
    try:
        # Detect face and get encoding
        face_locations = face_recognition.face_locations(image)
        if not face_locations:
            return jsonify({'success': False, 'message': 'No face detected in the image'}), 404
        face_encoding = face_recognition.face_encodings(image, face_locations)[0]
        # Get all face encodings from database
        stored_faces = list(face_collection.find({}, {'face_encoding': 1, 'employee_id': 1}))
        if not stored_faces:
            return jsonify({'success': False, 'message': 'No faces registered in the system'}), 404
        # Compare with stored faces
        matches = face_recognition.compare_faces(
            [np.array(face['face_encoding']) for face in stored_faces],
            face_encoding,
            tolerance=0.6
        )
        if True not in matches:
            return jsonify({'success': False, 'message': 'Unknown user. Please register first.'}), 404
        # Get the matched employee
        matched_index = matches.index(True)
        matched_employee = stored_faces[matched_index]
        # Look up employee details
        employee = employee_collection.find_one({'employee_id': matched_employee['employee_id']})
        if not employee:
            return jsonify({'success': False, 'message': 'Unknown user. Please register first.'}), 404
        # Check if attendance already marked today
        today = datetime.utcnow().date()
        existing_attendance = attendance_collection.find_one({
            'employee_id': matched_employee['employee_id'],
            'timestamp': {
                '$gte': datetime.combine(today, datetime.min.time()),
                '$lte': datetime.combine(today, datetime.max.time())
            }
        })
        if existing_attendance:
            return jsonify({
                'success': True,
                'message': 'Attendance already marked for today',
                'name': employee['name'],
                'employeeId': employee['employee_id']
            }), 200
        # Log attendance
        attendance_log = {
            'employee_id': matched_employee['employee_id'],
            'timestamp': datetime.utcnow(),
            'confidence': float(1 - face_recognition.face_distance(
                [face_encoding],
                [np.array(matched_employee['face_encoding'])]
            )[0])
        }
        attendance_collection.insert_one(attendance_log)
        return jsonify({
            'success': True,
            'message': 'Attendance marked successfully',
            'name': employee['name'],
            'employeeId': employee['employee_id']
        }), 200
    except Exception as e:
        logger.error(f"Error in face scan: {str(e)}")
        return jsonify({'success': False, 'message': 'Internal server error'}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8000, debug=True) 