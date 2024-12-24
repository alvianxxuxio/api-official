// firebase.js
const { initializeApp } = require("firebase/app");
const { getDatabase } = require("firebase/database");
const { getAuth, applyActionCode } = require("firebase/auth");

// Your Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCrvPC6iJZNG5x2BliKjAXfrpt91PFCz8w",
  authDomain: "apis-30c71.firebaseapp.com",
  databaseURL: "https://apis-30c71-default-rtdb.firebaseio.com",
  projectId: "apis-30c71",
  storageBucket: "apis-30c71.appspot.com",
  messagingSenderId: "948592713618",
  appId: "1:948592713618:web:0bda8f328ca42e318eeb4b",
  measurementId: "G-XSZGLP3DMH",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const database = getDatabase(app);
const auth = getAuth(app);

module.exports = { database, auth };