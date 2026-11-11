import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiError, api, queryString } from "./api";

afterEach(() => vi.unstubAllGlobals());

function respondWith(status: number, body?: unknown) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => new Response(body === undefined ? null : JSON.stringify(body), { status })),
  );
}

describe("api", () => {
  it("devolve os dados de uma resposta bem-sucedida", async () => {
    respondWith(200, { id: 1 });
    await expect(api.get("/x")).resolves.toEqual({ id: 1 });
  });

  it("transforma erros da API em ApiError com os campos inválidos", async () => {
    const errors = [{ field: "title", message: "Campo obrigatório." }];
    respondWith(422, { detail: "Confira os campos informados.", errors });
    const error = (await api.post("/x", {}).catch((e) => e)) as ApiError;
    expect(error).toBeInstanceOf(ApiError);
    expect(error.status).toBe(422);
    expect(error.errors).toEqual(errors);
  });

  it.each([502, 503, 504])("explica que a API está fora do ar no status %i", async (status) => {
    respondWith(status);
    await expect(api.get("/x")).rejects.toThrow("Não foi possível conectar à API");
  });

  it.each([502, 503])("mostra a mensagem da própria API no status %i", async (status) => {
    respondWith(status, { detail: "O arquivo é grande demais para a IA." });
    await expect(api.get("/x")).rejects.toThrow("O arquivo é grande demais para a IA.");
  });

  it("guarda quantos segundos esperar quando a API pede pausa", async () => {
    respondWith(429, { detail: "Limite da Groq.", retry_after: 12 });
    const error = (await api.get("/x").catch((e) => e)) as ApiError;
    expect(error.status).toBe(429);
    expect(error.retryAfter).toBe(12);
  });

  it("explica quando não há conexão", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => Promise.reject(new TypeError("failed"))));
    await expect(api.get("/x")).rejects.toThrow("Não foi possível conectar à API");
  });
});

describe("queryString", () => {
  it("ignora valores vazios e codifica os demais", () => {
    expect(queryString({ q: "a b", vazio: "", nulo: null, ano: 2026 })).toBe("?q=a+b&ano=2026");
    expect(queryString({ q: "" })).toBe("");
  });
});
