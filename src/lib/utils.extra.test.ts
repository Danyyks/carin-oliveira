// Testes adicionais para src/lib/utils.ts — cobrindo casos que faltavam
// no utils.test.ts original (decimais/negativos em brl, caracteres
// especiais em wppUrl, e mais profundidade em proximosDias).
import { describe, it, expect } from "vitest";
import { brl, wppUrl, proximosDias, hojeKey } from "./utils";

describe("brl - casos adicionais", () => {
  it("formata valor decimal com duas casas", () => {
    expect(brl(19.99)).toBe("R$ 19,99");
  });

  it("formata valor negativo mantendo o sinal", () => {
    expect(brl(-10.5)).toBe("R$ -10,5");
  });

  it("formata valor negativo inteiro", () => {
    expect(brl(-1)).toBe("R$ -1");
  });

  it("formata valor com várias casas decimais sem arredondar", () => {
    expect(brl(3.14159)).toBe("R$ 3,14159");
  });

  it("formata valor muito pequeno (menor que 1)", () => {
    expect(brl(0.5)).toBe("R$ 0,5");
  });

  it("formata valor grande sem separador de milhar", () => {
    expect(brl(1234567)).toBe("R$ 1234567");
  });

  it("só troca o primeiro ponto decimal (não afeta inteiros sem ponto)", () => {
    expect(brl(100)).toBe("R$ 100");
  });
});

describe("wppUrl - casos adicionais", () => {
  it("codifica acentos e caracteres especiais no texto", () => {
    const url = wppUrl("5511999998888", "Confirmação: você tem horário às 14h!");
    expect(url).toBe(
      "https://wa.me/5511999998888?text=" +
        encodeURIComponent("Confirmação: você tem horário às 14h!"),
    );
  });

  it("codifica texto vazio corretamente", () => {
    expect(wppUrl("5511999998888", "")).toBe("https://wa.me/5511999998888?text=");
  });

  it("codifica símbolos como &, =, # e emojis", () => {
    const texto = "Pedido #1 & confirmação = ok 😊";
    const url = wppUrl("5511999998888", texto);
    expect(url).toBe(`https://wa.me/5511999998888?text=${encodeURIComponent(texto)}`);
    // garante que os caracteres não codificados perigosamente aparecem escapados
    expect(url).not.toContain("&confirmação");
    expect(url).not.toContain("#1");
  });

  it("codifica quebras de linha no texto", () => {
    const texto = "Linha 1\nLinha 2";
    const url = wppUrl("5511999998888", texto);
    expect(url).toBe(`https://wa.me/5511999998888?text=${encodeURIComponent(texto)}`);
    expect(url).not.toContain("\n");
  });

  it("mantém o número de telefone intacto na URL", () => {
    const url = wppUrl("5511911112222", "oi");
    expect(url.startsWith("https://wa.me/5511911112222?text=")).toBe(true);
  });
});

describe("proximosDias - casos adicionais", () => {
  it("com qtd=1 retorna exatamente um dia, que é amanhã", () => {
    const dias = proximosDias(1);
    expect(dias).toHaveLength(1);

    const amanha = new Date();
    amanha.setDate(amanha.getDate() + 1);
    const keyEsperada = `${amanha.getFullYear()}-${String(amanha.getMonth() + 1).padStart(2, "0")}-${String(
      amanha.getDate(),
    ).padStart(2, "0")}`;

    expect(dias[0].key).toBe(keyEsperada);
  });

  it("dia/mes/label são coerentes com o weekday e a data real", () => {
    const DIAS = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];
    const MESES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

    for (const d of proximosDias(10)) {
      const [ano, mes, dia] = d.key.split("-").map(Number);
      const dataReal = new Date(ano, mes - 1, dia);

      // weekday bate com o dia da semana real da data
      expect(d.weekday).toBe(dataReal.getDay());
      // dia (abreviação) bate com o weekday
      expect(d.dia).toBe(DIAS[d.weekday]);
      // num bate com o dia do mês
      expect(d.num).toBe(dia);
      // mes (abreviação) bate com o mês da data
      expect(d.mes).toBe(MESES[mes - 1]);
      // label combina dia da semana abreviado + dia/mês com zero à esquerda
      const mesPadded = String(mes).padStart(2, "0");
      expect(d.label).toBe(`${DIAS[d.weekday]}, ${dia}/${mesPadded}`);
    }
  });

  it("as datas são sequenciais (cada dia é o seguinte ao anterior)", () => {
    const dias = proximosDias(15);
    for (let i = 1; i < dias.length; i++) {
      const anterior = new Date(dias[i - 1].key + "T00:00:00");
      const atual = new Date(dias[i].key + "T00:00:00");
      const diffDias = (atual.getTime() - anterior.getTime()) / (1000 * 60 * 60 * 24);
      expect(diffDias).toBe(1);
    }
  });

  it("todas as datas retornadas são estritamente futuras (após hoje)", () => {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    for (const d of proximosDias(20)) {
      const data = new Date(d.key + "T00:00:00");
      expect(data.getTime()).toBeGreaterThan(hoje.getTime());
    }
  });

  it("com qtd=0 retorna array vazio", () => {
    expect(proximosDias(0)).toEqual([]);
  });

  it("usa o valor padrão (6) quando qtd não é informado", () => {
    expect(proximosDias()).toHaveLength(6);
  });

  it("todas as keys são únicas (sem datas duplicadas)", () => {
    const dias = proximosDias(30);
    const keys = dias.map((d) => d.key);
    expect(new Set(keys).size).toBe(keys.length);
  });
});

describe("hojeKey - data de hoje no formato do painel", () => {
  it("retorna a data de hoje no formato YYYY-MM-DD com zero à esquerda", () => {
    const d = new Date();
    const esperado = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
      d.getDate(),
    ).padStart(2, "0")}`;
    expect(hojeKey()).toBe(esperado);
    expect(hojeKey()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("é anterior a amanhã e não é maior que qualquer dia futuro (regra do filtro do painel)", () => {
    const [amanha] = proximosDias(1);
    // um agendamento de amanhã ou depois NÃO é escondido; um de ontem é.
    expect(hojeKey() < amanha.key).toBe(true);
    expect(amanha.key >= hojeKey()).toBe(true);
  });
});
