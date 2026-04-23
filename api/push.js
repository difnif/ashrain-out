// ============================================================
// ashrain.out — /api/push.js (FCM 푸시 알림 발송)
// ============================================================
// POST { title, body }
// → Firestore에서 admin의 FCM 토큰 조회
// → Firebase Admin SDK로 푸시 발송
// 환경 변수: FCM_SERVICE_ACCOUNT (JSON 문자열)

import admin from "firebase-admin";

let adminApp = null;

function getAdminApp() {
  if (adminApp) return adminApp;
  try {
    const raw = process.env.FCM_SERVICE_ACCOUNT;
    if (!raw) throw new Error("FCM_SERVICE_ACCOUNT env not set");
    const serviceAccount = JSON.parse(raw);
    adminApp = admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
    return adminApp;
  } catch (e) {
    console.error("Firebase Admin init failed:", e.message);
    throw e;
  }
}

export default async function handler(req, res) {
  // CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { title, body } = req.body || {};
  if (!title) return res.status(400).json({ error: "Missing title" });

  try {
    const app = getAdminApp();
    const db = admin.firestore(app);

    // Firestore에서 admin FCM 토큰 조회
    const tokensDoc = await db.collection("ashrain").doc("fcm-tokens").get();
    const tokensData = tokensDoc.exists ? tokensDoc.data() : {};

    // admin 역할의 토큰만 필터
    const adminTokens = Object.values(tokensData)
      .filter(t => t && t.role === "admin" && t.token)
      .map(t => t.token);

    if (adminTokens.length === 0) {
      return res.status(200).json({ sent: 0, message: "No admin tokens registered" });
    }

    // 각 admin 기기에 푸시 발송
    const results = await Promise.allSettled(
      adminTokens.map(token =>
        admin.messaging(app).send({
          token,
          notification: { title, body },
          webpush: {
            notification: {
              icon: "/favicon.svg",
              tag: "ashrain-call",
              renotify: true,
            },
            fcmOptions: {
              link: "/",
            },
          },
        })
      )
    );

    // 실패한 토큰 정리 (만료/무효 토큰 삭제)
    const failedTokens = [];
    results.forEach((r, i) => {
      if (r.status === "rejected") {
        const errCode = r.reason?.code;
        if (errCode === "messaging/registration-token-not-registered" ||
            errCode === "messaging/invalid-registration-token") {
          failedTokens.push(adminTokens[i]);
        }
      }
    });

    // 무효 토큰 Firestore에서 제거
    if (failedTokens.length > 0) {
      const updates = {};
      for (const [userId, data] of Object.entries(tokensData)) {
        if (data && failedTokens.includes(data.token)) {
          updates[userId] = admin.firestore.FieldValue.delete();
        }
      }
      if (Object.keys(updates).length > 0) {
        await db.collection("ashrain").doc("fcm-tokens").update(updates);
      }
    }

    const sent = results.filter(r => r.status === "fulfilled").length;
    return res.status(200).json({ sent, total: adminTokens.length, cleaned: failedTokens.length });
  } catch (e) {
    console.error("Push error:", e.message);
    return res.status(500).json({ error: e.message });
  }
}
