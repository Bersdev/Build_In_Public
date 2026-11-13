import { describe, expect, it } from "vitest";
import { normalize, searchResults } from "../../components/Search";
import type { Goal, LearningPath, Project, Task } from "../../lib/types";
import { sortGoals } from "./GoalsCard";
import { sortProjects } from "./ProjectsCard";
import { sortPending } from "./TasksCard";

const task = (id: number, due_date: string | null, priority: Task["priority"] = "medium") => ({ id, title: `t${id}`, due_date, priority }) as Task;

describe("listas do dashboard", () => {
  it("tarefas pendentes: prazo mais próximo primeiro, sem prazo no fim, depois prioridade", () => {
    const ordem = sortPending([task(1, null, "high"), task(2, "2026-11-20"), task(3, "2026-11-10"), task(4, "2026-11-20", "high")]);
    expect(ordem.map((t) => t.id)).toEqual([3, 4, 2, 1]);
  });

  it("projetos: em andamento primeiro e arquivados fora", () => {
    const p = (id: number, status: Project["status"], progress_percent = 0) => ({ id, status, progress_percent }) as Project;
    expect(sortProjects([p(1, "completed"), p(2, "archived"), p(3, "planning"), p(4, "in_progress", 10), p(5, "in_progress", 80)]).map((x) => x.id)).toEqual([5, 4, 3, 1]);
  });

  it("metas: em andamento antes das concluídas", () => {
    const g = (id: number, is_reached: boolean, progress_percent: number) => ({ id, is_reached, progress_percent }) as Goal;
    expect(sortGoals([g(1, true, 100), g(2, false, 20), g(3, false, 70)]).map((x) => x.id)).toEqual([3, 2, 1]);
  });
});

describe("busca", () => {
  it("ignora acentos e maiúsculas", () => {
    expect(normalize("Programação Áge")).toBe("programacao age");
  });

  it("encontra por título e por tecnologia e aponta para a página certa", () => {
    const resultados = searchResults("python", {
      paths: [{ id: 3, title: "Back-end", technology: "Python", description: null } as LearningPath],
      projects: [{ id: 7, name: "API", description: null, technologies: ["Python", "FastAPI"] } as Project],
      tasks: [{ id: 1, title: "Ler docs", technology: null, project_name: null } as Task],
    });
    expect(resultados.map((r) => [r.kind, r.to])).toEqual([
      ["Roadmap", "/roadmaps?trilha=3"],
      ["Projeto", "/projetos/7"],
    ]);
    expect(searchResults("   ", {})).toEqual([]);
  });
});
