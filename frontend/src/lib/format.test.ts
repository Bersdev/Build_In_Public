import { describe, expect, it } from "vitest";
import { formValues, formatDate, formatHours, formatMinutes, formatMonth, splitList, toIsoDate } from "./format";

describe("formatMinutes", () => {
  it.each([
    [135, "2h 15min"],
    [45, "45min"],
    [60, "1h"],
    [0, "0min"],
  ])("%i minutos viram %s", (minutos, esperado) => {
    expect(formatMinutes(minutos)).toBe(esperado);
  });
});

describe("formatHours", () => {
  it("usa vírgula e remove zeros desnecessários", () => {
    expect(formatHours(2.5)).toBe("2,5");
    expect(formatHours(2)).toBe("2");
  });
});

describe("datas", () => {
  it("não muda de dia por causa do fuso horário", () => {
    expect(formatDate("2026-11-01")).toContain("1 de nov");
  });

  it("gera a data local em formato ISO", () => {
    expect(toIsoDate(new Date(2026, 0, 5))).toBe("2026-01-05");
  });

  it("nomeia o mês abreviado", () => {
    expect(formatMonth("2026-03")).toBe("mar");
  });
});

describe("splitList", () => {
  it("separa por vírgula e ignora vazios", () => {
    expect(splitList("Python, SQL,, ")).toEqual(["Python", "SQL"]);
    expect(splitList(null)).toEqual([]);
  });
});

describe("formValues", () => {
  it("converte texto vazio em null e apara espaços", () => {
    const dados = new FormData();
    dados.set("title", "  Listas ");
    dados.set("notes", "   ");
    expect(formValues(dados)).toEqual({ title: "Listas", notes: null });
  });

  it("converte campos numéricos indicados", () => {
    const dados = new FormData();
    dados.set("minutes", "45");
    dados.set("empty", "");
    expect(formValues(dados, { numbers: ["minutes", "empty"] })).toEqual({ minutes: 45, empty: null });
  });

  it("transforma listas indicadas em arrays", () => {
    const dados = new FormData();
    dados.set("tags", "a, b");
    expect(formValues(dados, { lists: ["tags"] })).toEqual({ tags: ["a", "b"] });
  });
});
