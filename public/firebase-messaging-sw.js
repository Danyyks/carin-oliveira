/* Service worker do Firebase Cloud Messaging (push em segundo plano).
 * Fica na RAIZ pública (escopo "/") — é onde o FCM procura por ele.
 * As chaves abaixo são identificadores PÚBLICOS do projeto (não são segredo);
 * a segurança fica nas regras do Firestore e na chave de servidor (Vercel).
 *
 * Estratégia: o servidor manda uma mensagem do tipo "notification" (webpush).
 * Assim o próprio FCM/SO exibe a notificação na tela automaticamente — inclusive
 * no iPhone (iOS 16.4+ com o app instalado na tela inicial), que NÃO exibe de
 * forma confiável as mensagens "só de dados". O clique abre /admin (fcmOptions.link). */
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

// Inicializar o messaging registra o handler que exibe as mensagens
// "notification" automaticamente quando o app está em segundo plano.
firebase.messaging();
