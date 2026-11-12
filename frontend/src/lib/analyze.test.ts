import { describe, expect, it, vi } from "vitest";
import { analyzeInParts, type AnalyzeResponse } from "./analyze";
import { ApiError } from "./api";

const parte = (title: string, next: number | null): AnalyzeResponse => ({
  plan: { roadmap: null, goals: [{ title, description: null, kind: "manual", target_value: 1, due_date: null }], projects: [], tasks: [] },
  warnings: [`aviso ${title}`],
  columns: { title: 1, stage: 0, url: null, notes: null },
  stage: "Etapa",
  next_row: next,
  total_rows: 120,
});

describe("analyzeInParts", () => {
  it("pede as partes em sequência, repassando colunas e etapa, e junta tudo", async () => {
    const post = vi.fn().mockResolvedValueOnce(parte("A", 60)).mockResolvedValueOnce(parte("B", null));
    const progress = vi.fn();
    const result = await analyzeInParts("csv", { post, wait: async () => {}, onProgress: progress });

    expect(post).toHaveBeenNthCalledWith(1, { content: "csv", start_row: 0, columns: null, stage: null });
    expect(post).toHaveBeenNthCalledWith(2, { content: "csv", start_row: 60, columns: { title: 1, stage: 0, url: null, notes: null }, stage: "Etapa" });
    expect(result.plan.goals.map((g) => g.title)).toEqual(["A", "B"]);
    expect(result.warnings).toEqual(["aviso A", "aviso B"]);
    expect(progress).toHaveBeenCalledWith({ done: 60, total: 120, waiting: 0 });
  });

  it("espera o tempo pedido quando a Groq atinge o limite e tenta de novo", async () => {
    const post = vi
      .fn()
      .mockRejectedValueOnce(new ApiError("Limite.", 429, [], 7))
      .mockResolvedValueOnce(parte("A", null));
    const wait = vi.fn(async () => {});
    const result = await analyzeInParts("csv", { post, wait, onProgress: () => {} });
    expect(wait).toHaveBeenCalledWith(7);
    expect(result.plan.goals).toHaveLength(1);
  });

  it("desiste depois de várias esperas seguidas", async () => {
    const post = vi.fn().mockRejectedValue(new ApiError("Limite.", 429, [], 1));
    await expect(analyzeInParts("csv", { post, wait: async () => {}, onProgress: () => {} })).rejects.toThrow("Limite.");
  });

  it("não espera quando o limite é do app (pausa longa), mostra o erro", async () => {
    const post = vi.fn().mockRejectedValue(new ApiError("Muitas tentativas.", 429, [], 3000));
    const wait = vi.fn(async () => {});
    await expect(analyzeInParts("csv", { post, wait, onProgress: () => {} })).rejects.toThrow("Muitas tentativas.");
    expect(wait).not.toHaveBeenCalled();
  });

  it("repassa outros erros sem tentar de novo", async () => {
    const post = vi.fn().mockRejectedValue(new ApiError("Chave recusada.", 502));
    await expect(analyzeInParts("csv", { post, wait: async () => {}, onProgress: () => {} })).rejects.toThrow("Chave recusada.");
    expect(post).toHaveBeenCalledTimes(1);
  });
});
