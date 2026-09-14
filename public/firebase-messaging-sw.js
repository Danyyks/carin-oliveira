/* Service worker do Firebase Cloud Messaging (push em segundo plano).
 * Fica na RAIZ pública (escopo "/") — é onde o FCM procura por ele.
 * As chaves abaixo são identificadores PÚBLICOS do projeto (não são segredo);
 * a segurança fica nas regras do Firestore e na chave de servidor (Vercel). */
importScripts("https://www.gstatic.com/firebasejs/12.19.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/12.19.0/firebase-messaging-compat.js");

firebase.initializeApp({
  apiKey: "AIzaSyC7WFiFkEfQLs0PJgeGkmXmpGk5-q95F0o",
  authDomain: "carin-nail.firebaseapp.com",
  projectId: "carin-nail",
  storageBucket: "carin-nail.firebasestorage.app",
  messagingSenderId: "145566063485",
  appId: "1:145566063485:web:9c8089e743f05491e80a14",
});

const messaging = firebase.messaging();

// Chega um pedido com o app fechado / em segundo plano: mostra a notificação na tela.
messaging.onBackgroundMessage((payload) => {
  const d = payload.data || {};
  self.registration.showNotification(d.title || "Novo agendamento", {
    body: d.body || "Você tem um pedido pendente.",
    icon: "/icon-192.png",
    badge: "/icon-192.png",
    tag: "novo-agendamento",
    data: { url: "/admin" },
  });
});

// Ao tocar na notificação, abre ou foca o painel.
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((wins) => {
      for (const w of wins) {
        if (w.url.includes("/admin") && "focus" in w) return w.focus();
      }
      if (clients.openWindow) return clients.openWindow("/admin");
    })
  );
});
