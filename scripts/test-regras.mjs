#!/usr/bin/env node
// Roda os testes das regras do Firestore contra o emulador local (npm run test:regras).
// Sobe o emulador, roda vitest.rules.config.ts contra ele e derruba tudo no final —
// nada disso publica ou muda as regras reais (isso é só `firebase deploy --only firestore:rules`,
// feito à parte, quando o Dany aprovar).
//
// O emulador do Firestore precisa do Java, e o padrão do sistema pode ser incompatível
// (JDK 25 não foi validado). Se houver um JDK 21 em ~/.jdks/jbr-21.0.11 (comum em quem usa
// Android Studio/IntelliJ), ele é usado; senão, cai no Java padrão do sistema.
import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

const jdk21 = join(homedir(), ".jdks", "jbr-21.0.11");
const env = { ...process.env };
if (existsSync(jdk21)) {
  console.log(`Usando o JDK 21 em ${jdk21} (o padrão do sistema pode não funcionar com o emulador).`);
  env.JAVA_HOME = jdk21;
} else {
  console.log("JDK 21 não encontrado em ~/.jdks/jbr-21.0.11 — tentando com o Java padrão do sistema.");
}

try {
  execFileSync(
    "firebase",
    [
      "emulators:exec",
      "--only",
      "firestore",
      "--project",
      "demo-carin",
      // Com `shell: true` os argumentos são só juntados por espaço: sem as aspas, o
      // Firebase CLI recebe o comando do vitest picado em vários argumentos e recusa.
      '"npx vitest run --config vitest.rules.config.ts"',
    ],
    { stdio: "inherit", shell: true, env },
  );
} catch (e) {
  process.exit(e.status ?? 1);
}
