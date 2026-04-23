// ============================================================
// ashrain.out — FCM Service Worker (백그라운드 푸시 알림 수신)
// ============================================================
// 앱이 닫혀 있어도 이 서비스 워커가 백그라운드에서 실행되어
// Firebase Cloud Messaging 푸시를 받아 OS 알림을 표시합니다.

/* eslint-disable no-undef */
importScripts("https://www.gstatic.com/firebasejs/10.14.1/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.14.1/firebase-messaging-compat.js");

firebase.initializeApp({
  apiKey: "AIzaSyBKoX09H6ehh7KIpkSp_MgW0Z4_FYHsEmA",
  authDomain: "ashrain-out-1e202.firebaseapp.com",
  projectId: "ashrain-out-1e202",
  storageBucket: "ashrain-out-1e202.firebasestorage.app",
  messagingSenderId: "753223091142",
  appId: "1:753223091142:web:75aaa6f77097510990a8c7",
});

const messaging = firebase.messaging();

// 백그라운드 메시지 수신 시 알림 표시
messaging.onBackgroundMessage((payload) => {
  const title = (payload.notification && payload.notification.title) || "ashrain.out";
  const body = (payload.notification && payload.notification.body) || "새 알림이 있어요";
  var options = {
    body: body,
    icon: "/favicon.svg",
    badge: "/favicon.svg",
    tag: "ashrain-push",
    renotify: true,
    data: { url: "/" },
  };
  self.registration.showNotification(title, options);
});

// 알림 클릭 시 앱 열기 (또는 포커스)
self.addEventListener("notificationclick", function(event) {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: "window" }).then(function(clientList) {
      for (var i = 0; i < clientList.length; i++) {
        var client = clientList[i];
        if (client.url && client.url.indexOf("ashrain") !== -1 && "focus" in client) {
          return client.focus();
        }
      }
      return clients.openWindow(event.notification.data && event.notification.data.url || "/");
    })
  );
});
