import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    // Mesmo atalho "@/" do tsconfig, para os testes importarem como o app importa.
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    // Funções puras rodam em "node". Testes de tela usam, no topo do arquivo,
    // o comentário `// @vitest-environment jsdom` (um navegador simulado).
    environment: "node",
    include: ["src/**/*.test.{ts,tsx}"],
  },
});
