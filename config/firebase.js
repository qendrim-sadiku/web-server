var admin = require("firebase-admin");

var serviceAccount = require("./aroit-firebase.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});