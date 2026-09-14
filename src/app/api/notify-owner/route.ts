// API que avisa a dona (push) quando chega um novo agendamento.
// Roda no servidor da Vercel usando o Firebase Admin SDK.
// A credencial vem da env FIREBASE_SERVICE_ACCOUNT (JSON inteiro da chave privada).
import { NextResponse } from "next/server";
import { cert, getApps, initializeApp, type App } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getMessaging } from "firebase-admin/messaging";

export const runtime = "nodejs"; // firebase-admin não roda no edge

function adminApp(): App {
  const existentes = getApps();
  if (existentes.length) return existentes[0];
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!raw) throw new Error("FIREBASE_SERVICE_ACCOUNT não configurada.");
  return initializeApp({ credential: cert(JSON.parse(raw)) });
}

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => ({}))) as {
      clienteNome?: string;
      servicoNome?: string;
      diaLabel?: string;
      hora?: string;
    };

    const app = adminApp();
    const dbAdmin = getFirestore(app);

    const snap = await dbAdmin.collection("pushTokens").get();
    const tokens = snap.docs.map((d) => d.id).filter(Boolean);
    if (tokens.length === 0) return NextResponse.json({ ok: true, enviados: 0 });

    const quando = [body.diaLabel, body.hora].filter(Boolean).join(" às ");
    const corpo =
      [body.clienteNome, body.servicoNome].filter(Boolean).join(" · ") +
      (quando ? ` — ${quando}` : "");

    const res = await getMessaging(app).sendEachForMulticast({
      tokens,
      // Mensagem só de dados: o service worker monta a notificação (evita duplicar).
      data: { title: "Novo agendamento", body: corpo || "Você tem um pedido pendente." },
      webpush: { headers: { Urgency: "high" }, fcmOptions: { link: "/admin" } },
    });

    // Remove tokens que não valem mais (app desinstalado, permissão revogada).
    const invalidos: string[] = [];
    res.responses.forEach((r, i) => {
      const code = r.error?.code || "";
      if (
        !r.success &&
        (code.includes("registration-token-not-registered") || code.includes("invalid-argument"))
      ) {
        invalidos.push(tokens[i]);
      }
    });
    await Promise.all(
      invalidos.map((t) => dbAdmin.collection("pushTokens").doc(t).delete().catch(() => {}))
    );

    return NextResponse.json({ ok: true, enviados: res.successCount });
  } catch (e) {
    return NextResponse.json({ ok: false, erro: (e as Error).message }, { status: 500 });
  }
}
