import { auth } from "@/lib/firebase";

// Diagnóstico: código do erro do Firestore + se há login ativo no momento.
export function detalheErro(e: unknown) {
  const code = (e as { code?: string })?.code || "erro";
  const uid = auth.currentUser?.uid;
  return `${code} · ${uid ? "login: " + uid.slice(0, 6) : "SEM login"}`;
}
