// config/firebaseAdmin.js
const admin = require('firebase-admin');
const dotenv = require('dotenv');

// Load environment variables from the .env file
dotenv.config();

// Construct the service account object using environment variables
const serviceAccount = {
  type: process.env.FIREBASE_TYPE,
  project_id: process.env.FIREBASE_PROJECT_ID,
  private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
  private_key: process.env.FIREBASE_PRIVATE_KEY 
    ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n') 
    : '', // Replace escaped newlines if private key is present
  client_email: process.env.FIREBASE_CLIENT_EMAIL,
  client_id: process.env.FIREBASE_CLIENT_ID,
  auth_uri: process.env.FIREBASE_AUTH_URI,
  token_uri: process.env.FIREBASE_TOKEN_URI,
  auth_provider_x509_cert_url: process.env.FIREBASE_AUTH_PROVIDER_CERT_URL,
  client_x509_cert_url: process.env.FIREBASE_CLIENT_CERT_URL
}; 

// Initialize the Firebase Admin SDK using the service account object
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

module.exports = admin;
