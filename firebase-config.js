const firebaseConfig = {
  apiKey: "AIzaSyAy-eKSkvXGMsulSAmfaV2YBKhcR4ABkLg",
  authDomain: "daily-dbf81.firebaseapp.com",
  projectId: "daily-dbf81",
  storageBucket: "daily-dbf81.firebasestorage.app",
  messagingSenderId: "24168797966",
  appId: "1:24168797966:web:d0996c9ac06ba8bb2b695f"
};

firebase.initializeApp(firebaseConfig);

const auth = firebase.auth();
const db = firebase.firestore();
const provider = new firebase.auth.GoogleAuthProvider();
