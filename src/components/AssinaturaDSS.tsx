/* eslint-disable @next/next/no-img-element */
// Assinatura discreta do desenvolvedor (DSS Hub Tech) no rodapé.
// O símbolo tem fundo próprio (funciona em qualquer tema); o nome é texto,
// então herda a cor do tema e fica sempre nítido e sutil.
export default function AssinaturaDSS() {
  return (
    <footer className="assinatura">
      <img className="assinatura-logo" src="/dss-hub-tech.svg" alt="" width={16} height={16} />
      <span>
        desenvolvido por <b>DSS Hub Tech</b>
      </span>
    </footer>
  );
}
