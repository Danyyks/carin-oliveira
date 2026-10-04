// Mensagem de erro em português claro, sem código técnico — para o painel novo (Fase C).
// Diferente de `detalheErro` (admin/detalheErro.ts), que é diagnóstico técnico e continua
// servindo o painel clássico; este é o texto que a Carin realmente lê.
const MAPA: Record<string, string> = {
  "permission-denied": "Sem permissão para fazer isso. Saia e entre de novo.",
  unauthenticated: "Sua sessão caiu. Saia e entre de novo.",
  unavailable: "Sem conexão com a internet agora. Tente de novo.",
  "deadline-exceeded": "A conexão está lenta. Tente de novo.",
  "resource-exhausted": "Muitas tentativas em pouco tempo. Aguarde um instante.",
  cancelled: "A operação foi interrompida. Tente de novo.",
  "already-exists": "Esse horário já está ocupado.",
};

export function erroHumano(e: unknown): string {
  const code = (e as { code?: string })?.code;
  if (code && MAPA[code]) return MAPA[code];
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    return "Sem conexão com a internet agora. Tente de novo.";
  }
  return "Algo deu errado. Tente de novo.";
}
