// config/firebaseAdmin.js
const admin = require('firebase-admin');
const dotenv = require('dotenv');

// Load environment variables from the .env file
dotenv.config();

// Construct the service account object using environment variables
const serviceAccount = {
  type: process.env.FIREBASE_TYPE || 'service_account',
  project_id: process.env.FIREBASE_PROJECT_ID || '',
  private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID || '',
  private_key: process.env.FIREBASE_PRIVATE_KEY 
    ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n') 
    : '', // Replace escaped newlines if private key is present
  client_email: process.env.FIREBASE_CLIENT_EMAIL || '',
  client_id: process.env.FIREBASE_CLIENT_ID || '',
  auth_uri: process.env.FIREBASE_AUTH_URI || 'https://accounts.google.com/o/oauth2/auth',
  token_uri: process.env.FIREBASE_TOKEN_URI || 'https://oauth2.googleapis.com/token',
  auth_provider_x509_cert_url: process.env.FIREBASE_AUTH_PROVIDER_CERT_URL || 'https://www.googleapis.com/oauth2/v1/certs',
  client_x509_cert_url: process.env.FIREBASE_CLIENT_CERT_URL || ''
};

// Check if the required properties are set
if (!serviceAccount.project_id) {
  throw new Error('FIREBASE_PROJECT_ID is not set or invalid. Please check your environment variables.');
}

// Initialize the Firebase Admin SDK using the service account object
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

module.exports = admin;
