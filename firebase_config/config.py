import firebase_admin
from firebase_admin import credentials, firestore

# Initialize Firebase with service account credentials
# Check if Firebase app is already initialized to avoid duplicate initialization
if not firebase_admin._apps:
    cred = credentials.Certificate("firebase_config/firebase_key.json")
    firebase_admin.initialize_app(cred)

# Initialize Firestore client
db = firestore.client()