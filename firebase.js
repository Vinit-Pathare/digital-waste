// Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyDfIU2S_RbNqLmgH0qdOvXSH5nmh2vzDwM",
  authDomain: "waste-27fda.firebaseapp.com",
  projectId: "waste-27fda",
  storageBucket: "waste-27fda.firebasestorage.app",
  messagingSenderId: "129511618879",
  appId: "1:129511618879:web:7812563b4cc6789fb63b8a",
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const storage = firebase.storage();
