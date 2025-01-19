import {getApp, getApps, initializeApp} from "firebase/app";
import { getFirestore } from "firebase/firestore";
import {getStorage} from "firebase/storage";

const firebaseConfig = {
    apiKey: "AIzaSyAWmHuGy2guA79kC6zZgH2v_5Az0L944yE",
    authDomain: "chat-with-pdf-c6eab.firebaseapp.com",
    projectId: "chat-with-pdf-c6eab",
    storageBucket: "chat-with-pdf-c6eab.firebasestorage.app",
    messagingSenderId: "256775680100",
    appId: "1:256775680100:web:131cb9043b4a65ed04ef71"
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig): getApp();

const db = getFirestore(app);
const storage = getStorage(app);

export {db, storage};