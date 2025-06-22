import os
from pymongo import MongoClient
from dotenv import load_dotenv
import logging

# Load environment variables from .env file
load_dotenv()

logger = logging.getLogger(__name__)

# Never commit secrets or credentials to GitHub!
MONGODB_URI = os.environ.get("MONGODB_URI")

def get_database():
    try:
        client = MongoClient(MONGODB_URI)
        
        # Test the connection
        client.admin.command('ping')
        logger.info("Successfully connected to MongoDB!")
        
        # Return the face_recognition database
        return client.face_recognition_db
    except Exception as e:
        logger.error(f"Error connecting to MongoDB: {str(e)}")
        raise

# Initialize database
db = get_database()

# Collections
face_collection = db.face_encodings
employee_collection = db.employees
attendance_collection = db.attendance_logs

# Example collections (adjust as needed)
face_collection = db.get_collection('faces')
employee_collection = db.get_collection('employees')
attendance_collection = db.get_collection('attendance') 
 