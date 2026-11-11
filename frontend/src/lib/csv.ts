/** Limite igual ao da API (300 mil caracteres), checado antes de enviar. */
export const MAX_CSV_BYTES = 300_000;
/** Na análise com IA o arquivo vai em partes; o limite total é 150 mil caracteres. */
export const MAX_AI_CSV_BYTES = 150_000;

export const ROADMAP_TEMPLATE = `etapa,item,link,notas
Fundamentos,Variáveis e tipos,https://docs.python.org/pt-br/3/tutorial/introduction.html,
Fundamentos,Condicionais e laços,,if/elif/else e for/while
Fundamentos,Funções,,
Web,HTTP e APIs,https://developer.mozilla.org/pt-BR/docs/Web/HTTP,
Web,FastAPI,https://fastapi.tiangolo.com,"Rotas, schemas e testes"
`;

/**
 * O Excel em português costuma salvar CSV em Windows-1252, não em UTF-8.
 * Tenta UTF-8 de forma estrita e, se houver byte inválido, lê como Windows-1252.
 */
export function decodeCsv(buffer: ArrayBuffer): string {
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(buffer);
  } catch {
    return new TextDecoder("windows-1252").decode(buffer);
  }
}

export function titleFromFileName(name: string): string {
  return name
    .replace(/\.csv$/i, "")
    .replace(/[_-]+/g, " ")
    .trim();
}

export function downloadTemplate() {
  // O BOM faz o Excel abrir o arquivo com os acentos corretos.
  const blob = new Blob(["﻿", ROADMAP_TEMPLATE], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "modelo-roadmap.csv";
  link.click();
  URL.revokeObjectURL(url);
}
