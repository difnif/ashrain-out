import { initializeApp } from "firebase/app";
import { getFirestore, doc, getDoc, setDoc, onSnapshot, collection, getDocs } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBKoX09H6ehh7KIpkSp_MgW0Z4_FYHsEmA",
  authDomain: "ashrain-out-1e202.firebaseapp.com",
  projectId: "ashrain-out-1e202",
  storageBucket: "ashrain-out-1e202.firebasestorage.app",
  messagingSenderId: "753223091142",
  appId: "1:753223091142:web:75aaa6f77097510990a8c7"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);

// === Firestore helpers ===
const COLLECTION = "ashrain";

// Read a document
export async function fbGet(docId) {
  try {
    const snap = await getDoc(doc(db, COLLECTION, docId));
    return snap.exists() ? snap.data() : null;
  } catch (e) {
    console.warn("fbGet error:", docId, e);
    return null;
  }
}

// Write a document (merge)
export async function fbSet(docId, data) {
  try {
    await setDoc(doc(db, COLLECTION, docId), data, { merge: true });
  } catch (e) {
    console.warn("fbSet error:", docId, e);
  }
}

// Listen to a document (real-time)
export function fbListen(docId, callback) {
  return onSnapshot(doc(db, COLLECTION, docId), (snap) => {
    callback(snap.exists() ? snap.data() : null);
  }, (e) => {
    console.warn("fbListen error:", docId, e);
  });
}
