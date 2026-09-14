// Notificações push do painel (lado do cliente).
// Fluxo: pede permissão -> registra o SW do FCM -> pega o token -> salva no
// Firestore. O envio de verdade acontece no servidor (/api/notify-owner).
import { getMessaging, getToken, isSupported, onMessage } from "firebase/messaging";
import app from "./firebase";
import { salvarPushToken } from "./db";

// Chave pública do Web Push (Firebase -> Cloud Messaging -> Certificados push).
const VAPID_KEY =
  "BBkq-rcqCEk_JaAkoFj2YicegC_v9Sx_k2H3DR_0pPqcv271vOXYuwWyshL1BVpG2DNU8XPUTJsVadO5sQWbJwA";

/** O aparelho/navegador consegue receber push? (iOS só com o app instalado.) */
export async function notificacoesSuportadas(): Promise<boolean> {
  if (typeof window === "undefined") return false;
  if (!("Notification" in window) || !("serviceWorker" in navigator)) return false;
  try {
    return await isSupported();
  } catch {
    return false;
  }
}

export function permissaoAtual(): NotificationPermission | "indisponivel" {
  if (typeof window === "undefined" || !("Notification" in window)) return "indisponivel";
  return Notification.permission;
}

/** Pede permissão, gera o token FCM e o salva no Firestore. Retorna o token. */
export async function ativarNotificacoes(): Promise<string> {
  if (!(await notificacoesSuportadas())) {
    throw new Error("Este aparelho não suporta notificações. No iPhone, instale o app na tela primeiro.");
  }
  const permissao = await Notification.requestPermission();
  if (permissao !== "granted") {
    throw new Error("Permissão negada. Ative as notificações nas configurações do navegador/app.");
  }
  const swReg = await navigator.serviceWorker.register("/firebase-messaging-sw.js");
  const messaging = getMessaging(app);
  const token = await getToken(messaging, {
    vapidKey: VAPID_KEY,
    serviceWorkerRegistration: swReg,
  });
  if (!token) throw new Error("Não consegui gerar o token de notificação. Tente de novo.");
  await salvarPushToken(token);
  return token;
}

/** Notificação quando o painel está ABERTO (primeiro plano). Retorna o unsubscribe. */
export async function ouvirMensagensEmPrimeiroPlano(): Promise<(() => void) | void> {
  if (!(await notificacoesSuportadas())) return;
  const messaging = getMessaging(app);
  return onMessage(messaging, (payload) => {
    const d = payload.data || {};
    try {
      new Notification(d.title || "Novo agendamento", {
        body: d.body || "Você tem um pedido pendente.",
        icon: "/icon-192.png",
      });
    } catch {
      /* alguns navegadores não deixam criar Notification direto; o SW cobre esse caso */
    }
  });
}
