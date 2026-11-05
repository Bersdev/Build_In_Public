import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchMe } from "./auth";

afterEach(() => vi.unstubAllGlobals());

function respondWith(status: number, body: unknown) {
  vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify(body), { status })));
}

describe("fetchMe", () => {
  it("devolve o usuário logado", async () => {
    respondWith(200, { id: 1 });
    await expect(fetchMe()).resolves.toEqual({ id: 1 });
  });

  it("entende 401 como ninguém logado", async () => {
    respondWith(401, { detail: "É preciso entrar na conta." });
    await expect(fetchMe()).resolves.toBeNull();
  });

  it("explica quando a API ainda não tem a autenticação", async () => {
    respondWith(404, { detail: "Not Found" });
    await expect(fetchMe()).rejects.toThrow("ainda não tem a autenticação");
  });
});
