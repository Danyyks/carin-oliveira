// Abre o WhatsApp de forma confiável — inclusive no iPhone (Safari e app instalado).
// O iOS só deixa abrir uma aba nova se isso acontecer NO MESMO toque; por isso a
// janela é aberta ANTES de esperar o Firebase (o chamador passa `win` já aberto).
// Se o iPhone bloquear a aba mesmo assim (`win` nulo), navega na própria aba, que
// nunca é bloqueada. Depois do await, é só apontar a janela para a URL.
export function abrirWhatsapp(win: Window | null, url: string) {
  if (win && !win.closed) win.location.href = url;
  else window.location.href = url;
}

/**
 * Grava a mudança e, só se deu certo, manda a aba (já aberta no toque) para o WhatsApp.
 * Se a gravação falhar, fecha a aba em branco e não avisa ninguém por WhatsApp — `onErro`
 * (opcional) deixa quem chamou mostrar isso na tela; sem ele, o erro só vai pro console
 * (comportamento de sempre, mantido pro painel clássico).
 */
export async function gravarEAbrirWhatsapp(
  win: Window | null,
  gravar: () => Promise<unknown>,
  url: string | null,
  onErro?: (e: unknown) => void,
) {
  try {
    await gravar();
  } catch (e) {
    win?.close();
    console.error("Não consegui gravar a mudança do agendamento:", e);
    onErro?.(e);
    return;
  }
  if (url) abrirWhatsapp(win, url);
}
