from pymongo import MongoClient
from dotenv import load_dotenv
import os
import logging

load_dotenv()

logger = logging.getLogger(__name__)

def get_database():
    try:
        # Get MongoDB connection string from environment variable
        mongo_uri = os.getenv('MONGODB_URI', 'mongodb://localhost:27017/')
        client = MongoClient(mongo_uri)
        
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
 