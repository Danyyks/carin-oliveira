import { defineConfig } from "vitest/config";

// Config separada pros testes das regras do Firestore: rodam contra o emulador (real, via
// rede local), não contra funções puras — por isso um arquivo à parte do vitest.config.ts
// normal, sem paralelismo entre arquivos (o emulador é um processo só, compartilhado).
export default defineConfig({
  test: {
    environment: "node",
    include: ["tests-regras/**/*.test.ts"],
    fileParallelism: false,
    testTimeout: 20000,
    hookTimeout: 20000,
  },
});
