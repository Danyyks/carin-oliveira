// Mostra a inicial no gradiente; se houver foto em /public, ela cobre por cima.
// Usa background-image: se o arquivo não existir, simplesmente não aparece
// (nada de ícone de "imagem quebrada") e a inicial continua visível.
export default function Avatar({ nome, foto }: { nome: string; foto?: string }) {
  return (
    <div className="avatar">
      <span>{nome.trim().charAt(0)}</span>
      {foto ? <div className="avatar-foto" style={{ backgroundImage: `url(${foto})` }} /> : null}
    </div>
  );
}
