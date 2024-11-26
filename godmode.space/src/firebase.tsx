import { FirebaseOptions, initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';

const firebaseConfig: FirebaseOptions = {
    apiKey: "AIzaSyBi_1lqGI1EVKvhNJtWeMFbEOVrD7IILWU",
    authDomain: "consulting-17de1.firebaseapp.com",
    projectId: "consulting-17de1",
    storageBucket: "consulting-17de1.appspot.com",
    messagingSenderId: "579090407696",
    appId: "1:579090407696:web:3ee95ad14243da259d0595",
    measurementId: "G-6NR5XNHL5B",
};

export const firebase = initializeApp(firebaseConfig, 'godmode');
export const godmode_auth = getAuth(firebase);
