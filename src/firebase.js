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

// ============================================================
// FCM Push Notification — 토큰 등록 + 포그라운드 메시지 수신
// ============================================================

const VAPID_KEY = "BLBsSpX2GzAyDCFOWexlBsQLratEeA2YqO_A_olMVohZrZ_RXQ8bGPvWaSw1WZbvTngtLiS3faCYkcfQw-aPNTw";

/**
 * FCM 토큰 등록 — 알림 권한 요청 → 토큰 발급 → Firestore에 저장
 * admin 로그인 시 호출. 토큰이 Firestore에 저장되면 서버(api/push)가 읽어서 푸시 발송.
 */
export async function registerFCMToken(userId, userRole) {
  try {
    if (typeof window === "undefined" || !("Notification" in window) || !("serviceWorker" in navigator)) {
      console.log("FCM: 이 브라우저에서 푸시 알림을 지원하지 않음");
      return null;
    }

    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      console.log("FCM: 알림 권한 거부됨");
      return null;
    }

    // 서비스 워커 등록
    const swReg = await navigator.serviceWorker.register("/firebase-messaging-sw.js");
    console.log("FCM: 서비스 워커 등록 완료");

    // Firebase Messaging 모듈 동적 로드 (지원 안 되는 브라우저에서 크래시 방지)
    const { getMessaging, getToken } = await import("firebase/messaging");
    const messaging = getMessaging(app);

    const token = await getToken(messaging, {
      vapidKey: VAPID_KEY,
      serviceWorkerRegistration: swReg,
    });

    if (token) {
      // Firestore에 토큰 저장 (api/push.js가 이 데이터를 읽어서 푸시 발송)
      await setDoc(doc(db, COLLECTION, "fcm-tokens"), {
        [userId]: { token, role: userRole, updatedAt: Date.now() },
      }, { merge: true });
      console.log("FCM: 토큰 등록 완료");
    }

    return token;
  } catch (e) {
    console.error("FCM: 토큰 등록 실패:", e);
    return null;
  }
}

/**
 * 포그라운드 메시지 수신 리스너
 * 앱이 열려 있을 때 푸시가 오면 이 콜백이 호출됨.
 * (앱이 닫혀 있을 때는 서비스 워커가 처리)
 */
export async function onFCMMessage(callback) {
  try {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return () => {};
    const { getMessaging, onMessage } = await import("firebase/messaging");
    const messaging = getMessaging(app);
    return onMessage(messaging, callback);
  } catch {
    return () => {};
  }
}
