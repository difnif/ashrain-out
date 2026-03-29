import { initializeApp } from "firebase/app";
import { getFirestore, doc, getDoc, setDoc, onSnapshot } from "firebase/firestore";

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

const COLLECTION = "ashrain";

// Test write on load
setDoc(doc(db, COLLECTION, "test"), { ok: true, time: Date.now() }, { merge: true })
  .then(() => console.log("✅ Firestore write OK"))
  .catch(e => console.error("❌ Firestore write FAIL:", e));

export async function fbGet(docId) {
  try {
    const snap = await getDoc(doc(db, COLLECTION, docId));
    return snap.exists() ? snap.data() : null;
  } catch (e) {
    console.error("fbGet error:", docId, e);
    return null;
  }
}

export async function fbSet(docId, data) {
  try {
    await setDoc(doc(db, COLLECTION, docId), data, { merge: true });
    console.log("fbSet OK:", docId, Object.keys(data));
  } catch (e) {
    console.error("fbSet FAIL:", docId, e);
  }
}

export function fbListen(docId, callback) {
  return onSnapshot(doc(db, COLLECTION, docId), (snap) => {
    console.log("fbListen:", docId, snap.exists() ? "exists" : "empty");
    callback(snap.exists() ? snap.data() : null);
  }, (e) => {
    console.error("fbListen error:", docId, e);
  });
}
