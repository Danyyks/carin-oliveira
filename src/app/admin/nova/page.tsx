"use client";

import AdminGate from "../AdminGate";
import PainelNovo from "../painel/PainelNovo";

// Prévia do painel novo (Fase B, em construção) — não é o `/admin` de produção. Serve
// para o Dany testar e aprovar antes da troca final (Fase B4), sem nenhum risco: mesmo
// login, mesmos dados, e o `/admin` clássico continua exatamente como está.
export default function AdminNovaPage() {
  return <AdminGate render={(props) => <PainelNovo {...props} />} />;
}
