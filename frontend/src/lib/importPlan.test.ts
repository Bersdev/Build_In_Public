import { describe, expect, it } from "vitest";
import { countSelected, finalizePlan, mergePlans, selectAll } from "./importPlan";
import type { ImportPlan } from "./types";

const plan: ImportPlan = {
  roadmap: { title: "Python", technology: "Python", description: null, stages: [{ title: "Base", items: [{ title: "Funções", url: null, notes: null }] }] },
  goals: [{ title: "10h por semana", description: null, kind: "weekly_study_hours", target_value: 10, due_date: null }],
  projects: [
    { name: "API", description: null, objective: null, technologies: [], due_date: null },
    { name: "Portfólio", description: null, objective: null, technologies: [], due_date: null },
  ],
  tasks: [
    { title: "Criar repo da API", description: null, priority: "high", due_date: null, project: "API", technology: null },
    { title: "Publicar portfólio", description: null, priority: "medium", due_date: null, project: "Portfólio", technology: null },
  ],
};

describe("finalizePlan", () => {
  it("mantém tudo quando nada é desmarcado e aplica o título editado", () => {
    const result = finalizePlan(plan, selectAll(plan), "Back-end");
    expect(result.roadmap?.title).toBe("Back-end");
    expect(result.projects).toHaveLength(2);
    expect(result.tasks).toHaveLength(2);
  });

  it("tira o que foi desmarcado e solta tarefas de projetos removidos", () => {
    const selection = selectAll(plan);
    selection.roadmap = false;
    selection.projects[1] = false;
    selection.goals[0] = false;
    const result = finalizePlan(plan, selection, "Python");
    expect(result.roadmap).toBeNull();
    expect(result.goals).toEqual([]);
    expect(result.projects.map((p) => p.name)).toEqual(["API"]);
    expect(result.tasks.map((t) => t.project)).toEqual(["API", null]);
  });
});

describe("mergePlans", () => {
  const parte = (stages: [string, string[]][], goals = 0): ImportPlan => ({
    roadmap: stages.length
      ? { title: "Trilha", technology: null, description: null, stages: stages.map(([title, items]) => ({ title, items: items.map((t) => ({ title: t, url: null, notes: null })) })) }
      : null,
    goals: Array.from({ length: goals }, (_, i) => ({ title: `Meta ${i}`, description: null, kind: "manual" as const, target_value: 1, due_date: null })),
    projects: [],
    tasks: [],
  });

  it("começa pela primeira parte", () => {
    expect(mergePlans(null, parte([["A", ["1"]]]))).toEqual(parte([["A", ["1"]]]));
  });

  it("emenda a etapa que continua de uma parte para a outra", () => {
    const juntos = mergePlans(parte([["A", ["1"]], ["B", ["2"]]], 1), parte([["B", ["3"]], ["C", ["4"]]], 1));
    expect(juntos.roadmap?.stages.map((s) => [s.title, s.items.map((i) => i.title)])).toEqual([
      ["A", ["1"]],
      ["B", ["2", "3"]],
      ["C", ["4"]],
    ]);
    expect(juntos.goals).toHaveLength(2);
  });

  it("mantém o título da trilha da primeira parte e aceita partes sem trilha", () => {
    const primeira = { ...parte([["A", ["1"]]]), roadmap: { ...parte([["A", ["1"]]]).roadmap!, title: "Back-end" } };
    expect(mergePlans(primeira, parte([], 2)).roadmap?.title).toBe("Back-end");
    expect(mergePlans(parte([], 1), primeira).roadmap?.title).toBe("Back-end");
  });
});

it("conta os itens selecionados", () => {
  const selection = selectAll(plan);
  expect(countSelected(selection)).toBe(6);
  selection.tasks[0] = false;
  expect(countSelected(selection)).toBe(5);
});
