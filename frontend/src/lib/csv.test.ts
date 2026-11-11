import { describe, expect, it } from "vitest";
import { ROADMAP_TEMPLATE, decodeCsv, titleFromFileName } from "./csv";

describe("decodeCsv", () => {
  it("lê UTF-8", () => {
    const bytes = new TextEncoder().encode("etapa,item\nBase,Funções");
    expect(decodeCsv(bytes.buffer)).toBe("etapa,item\nBase,Funções");
  });

  it("lê o Windows-1252 que o Excel em português usa", () => {
    // "Conteúdo" em Windows-1252: ú = 0xFA, inválido em UTF-8.
    const bytes = new Uint8Array([0x43, 0x6f, 0x6e, 0x74, 0x65, 0xfa, 0x64, 0x6f]);
    expect(decodeCsv(bytes.buffer)).toBe("Conteúdo");
  });
});

describe("titleFromFileName", () => {
  it("tira a extensão e troca separadores por espaço", () => {
    expect(titleFromFileName("roadmap_back-end.csv")).toBe("roadmap back end");
    expect(titleFromFileName("Python.CSV")).toBe("Python");
  });
});

it("o modelo tem cabeçalho e exemplos", () => {
  const [header, ...rows] = ROADMAP_TEMPLATE.trim().split("\n");
  expect(header).toBe("etapa,item,link,notas");
  expect(rows.length).toBeGreaterThan(2);
});
