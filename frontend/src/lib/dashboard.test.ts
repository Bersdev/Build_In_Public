import { describe, expect, it } from "vitest";
import { niceMinutes, shortMinutes } from "../components/Charts";
import { dailyMinutes, dueLabel, nextContent, overallProgress, pickCurrentPath, progressSeries, stageStates } from "./dashboard";
import type { LearningItem, LearningPathDetail, LearningStage, StudySession } from "./types";

let ids = 0;
function item(title: string, completed_at: string | null = null, notes: string | null = null): LearningItem {
  ids += 1;
  return { id: ids, title, url: null, notes, course_id: null, course_title: null, completed_at };
}
function stage(title: string, items: LearningItem[]): LearningStage {
  ids += 1;
  return { id: ids, title, items };
}
function path(id: number, stages: LearningStage[]): LearningPathDetail {
  const all = stages.flatMap((s) => s.items);
  const done = all.filter((i) => i.completed_at).length;
  return {
    id,
    title: `Trilha ${id}`,
    description: null,
    technology: null,
    start_date: null,
    target_date: null,
    total_items: all.length,
    completed_items: done,
    progress_percent: all.length ? Math.round((done / all.length) * 100) : 0,
    stages,
  };
}

describe("próximo conteúdo do roadmap", () => {
  it("é o primeiro conteúdo pendente, respeitando a ordem das etapas", () => {
    const trilha = path(1, [
      stage("Fundamentos", [item("Variáveis", "2026-11-01T10:00:00Z"), item("Funções", "2026-11-02T10:00:00Z")]),
      stage("Estruturas de Dados", [item("Listas", "2026-11-03T10:00:00Z"), item("Dicionários", null, "Chaves e valores")]),
      stage("Back-end", [item("FastAPI")]),
    ]);
    const proximo = nextContent(trilha)!;
    expect(proximo.item.title).toBe("Dicionários");
    expect(proximo.stage.title).toBe("Estruturas de Dados");
    expect(proximo.stageIndex).toBe(1);
    expect(proximo.stageProgress).toBe(50);
  });

  it("não pula para uma etapa adiantada se a anterior tem pendência", () => {
    const trilha = path(1, [
      stage("A", [item("a1", "2026-11-01T10:00:00Z"), item("a2")]),
      stage("B", [item("b1", "2026-11-05T10:00:00Z")]),
    ]);
    expect(nextContent(trilha)!.item.title).toBe("a2");
  });

  it("ignora etapas vazias", () => {
    const trilha = path(1, [stage("Vazia", []), stage("B", [item("b1")])]);
    expect(nextContent(trilha)!.item.title).toBe("b1");
  });

  it("não existe quando tudo foi concluído ou a trilha não tem conteúdo", () => {
    expect(nextContent(path(1, [stage("A", [item("a", "2026-11-01T10:00:00Z")])]))).toBeNull();
    expect(nextContent(path(2, []))).toBeNull();
  });
});

describe("estado das etapas", () => {
  it("marca concluídas, a atual e as bloqueadas depois dela", () => {
    const trilha = path(1, [
      stage("A", [item("a", "2026-11-01T10:00:00Z")]),
      stage("Vazia", []),
      stage("B", [item("b")]),
      stage("C", [item("c", "2026-11-02T10:00:00Z"), item("c2")]),
    ]);
    expect(stageStates(trilha)).toEqual(["done", "empty", "current", "locked"]);
  });

  it("sem pendências, todas ficam concluídas", () => {
    const trilha = path(1, [stage("A", [item("a", "2026-11-01T10:00:00Z")])]);
    expect(stageStates(trilha)).toEqual(["done"]);
  });
});

describe("trilha atual", () => {
  it("é a que teve conteúdo concluído mais recentemente, entre as que têm pendência", () => {
    const antiga = path(1, [stage("A", [item("a", "2026-10-01T10:00:00Z"), item("b")])]);
    const recente = path(2, [stage("A", [item("a", "2026-11-10T10:00:00Z"), item("b")])]);
    const terminada = path(3, [stage("A", [item("a", "2026-11-12T10:00:00Z")])]);
    expect(pickCurrentPath([antiga, recente, terminada])!.id).toBe(2);
  });

  it("sem nada iniciado, é a primeira criada", () => {
    expect(pickCurrentPath([path(5, [stage("A", [item("x")])]), path(3, [stage("A", [item("y")])])])!.id).toBe(3);
  });

  it("não existe sem conteúdo pendente", () => {
    expect(pickCurrentPath([path(1, [stage("A", [item("a", "2026-11-01T10:00:00Z")])])])).toBeNull();
    expect(pickCurrentPath([])).toBeNull();
  });
});

describe("progresso", () => {
  it("geral soma os conteúdos de todas as trilhas", () => {
    const resultado = overallProgress([
      { ...path(1, []), total_items: 10, completed_items: 4 },
      { ...path(2, []), total_items: 10, completed_items: 2 },
    ]);
    expect(resultado).toEqual({ completed: 6, total: 20, percent: 30 });
    expect(overallProgress([]).percent).toBe(0);
  });

  it("ao longo do tempo acumula os conteúdos concluídos até cada dia", () => {
    const trilha = path(1, [
      stage("A", [item("a", "2026-11-10T12:00:00Z"), item("b", "2026-11-12T12:00:00Z"), item("c"), item("d")]),
    ]);
    const serie = progressSeries([trilha], 4, "2026-11-12");
    expect(serie.map((p) => p.date)).toEqual(["2026-11-09", "2026-11-10", "2026-11-11", "2026-11-12"]);
    expect(serie.map((p) => p.value)).toEqual([0, 25, 25, 50]);
  });
});

describe("minutos por dia", () => {
  it("soma as sessões de cada dia da janela e zera os dias sem estudo", () => {
    const sessoes = [
      { study_date: "2026-11-12", duration_minutes: 30 },
      { study_date: "2026-11-12", duration_minutes: 15 },
      { study_date: "2026-11-10", duration_minutes: 60 },
      { study_date: "2026-10-01", duration_minutes: 99 },
    ] as StudySession[];
    expect(dailyMinutes(sessoes, 3, "2026-11-12")).toEqual([
      { date: "2026-11-10", value: 60 },
      { date: "2026-11-11", value: 0 },
      { date: "2026-11-12", value: 45 },
    ]);
  });
});

describe("prazo das tarefas", () => {
  const hoje = "2026-11-13"; // sexta-feira
  it("usa palavras próximas de hoje", () => {
    expect(dueLabel("2026-11-13", hoje)).toEqual({ text: "Hoje", tone: "accent" });
    expect(dueLabel("2026-11-14", hoje)).toEqual({ text: "Amanhã", tone: "neutral" });
    expect(dueLabel("2026-11-12", hoje)).toEqual({ text: "Atrasada", tone: "danger" });
  });
  it("usa o dia da semana até 6 dias e a data depois disso", () => {
    expect(dueLabel("2026-11-16", hoje)?.text).toBe("Segunda");
    expect(dueLabel("2026-11-30", hoje)?.text).toMatch(/30/);
    expect(dueLabel(null, hoje)).toBeNull();
  });
});


describe("eixo de minutos", () => {
  it("usa passos de 30 min acima de 1 hora e rótulos curtos", () => {
    expect(niceMinutes(90)).toBe(120);
    expect(niceMinutes(130)).toBe(240);
    expect(niceMinutes(45)).toBe(50);
    expect([30, 60, 90, 45].map(shortMinutes)).toEqual(["30min", "1h", "1h30", "45min"]);
  });
});
