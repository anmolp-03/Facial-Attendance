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
        
        # Return the test database
        return client['test']
    except Exception as e:
        logger.error(f"Error connecting to MongoDB: {str(e)}")
        raise

# Initialize database
db = get_database()

# Collections - ensure these names match your Node.js models/collections
face_collection = db.get_collection('faces')
# The user collection is likely named 'users' by Mongoose default
employee_collection = db.get_collection('users') 
attendance_collection = db.get_collection('attendance') 
 