import { describe, expect, it } from "vitest";
import { countSelected, finalizePlan, selectAll } from "./importPlan";
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

it("conta os itens selecionados", () => {
  const selection = selectAll(plan);
  expect(countSelected(selection)).toBe(6);
  selection.tasks[0] = false;
  expect(countSelected(selection)).toBe(5);
});
