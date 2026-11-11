import type { ImportPlan } from "./types";

/**
 * Junta o plano de uma parte do arquivo ao que já foi analisado. A etapa que continua de uma
 * parte para a outra vira uma só; o título da trilha é o da primeira parte que tiver trilha.
 */
export function mergePlans(current: ImportPlan | null, next: ImportPlan): ImportPlan {
  if (!current) return next;
  let roadmap = current.roadmap ?? next.roadmap;
  if (current.roadmap && next.roadmap) {
    const stages = current.roadmap.stages.map((stage) => ({ ...stage, items: [...stage.items] }));
    for (const stage of next.roadmap.stages) {
      const last = stages[stages.length - 1];
      if (last && last.title === stage.title) last.items.push(...stage.items);
      else stages.push({ ...stage, items: [...stage.items] });
    }
    roadmap = { ...current.roadmap, technology: current.roadmap.technology ?? next.roadmap.technology, stages };
  }
  return {
    roadmap,
    goals: [...current.goals, ...next.goals],
    projects: [...current.projects, ...next.projects],
    tasks: [...current.tasks, ...next.tasks],
  };
}

/** O que a pessoa manteve marcado na revisão do plano. */
export interface Selection {
  roadmap: boolean;
  goals: boolean[];
  projects: boolean[];
  tasks: boolean[];
}

export function selectAll(plan: ImportPlan): Selection {
  return {
    roadmap: plan.roadmap !== null,
    goals: plan.goals.map(() => true),
    projects: plan.projects.map(() => true),
    tasks: plan.tasks.map(() => true),
  };
}

export function countSelected(selection: Selection): number {
  const count = (list: boolean[]) => list.filter(Boolean).length;
  return (selection.roadmap ? 1 : 0) + count(selection.goals) + count(selection.projects) + count(selection.tasks);
}

/** Monta o plano que vai para /imports/apply. Tarefas de projetos removidos ficam sem projeto. */
export function finalizePlan(plan: ImportPlan, selection: Selection, roadmapTitle: string): ImportPlan {
  const projects = plan.projects.filter((_, index) => selection.projects[index]);
  const kept = new Set(projects.map((project) => project.name.toLowerCase()));
  return {
    roadmap: plan.roadmap && selection.roadmap ? { ...plan.roadmap, title: roadmapTitle.trim() || plan.roadmap.title } : null,
    goals: plan.goals.filter((_, index) => selection.goals[index]),
    projects,
    tasks: plan.tasks
      .filter((_, index) => selection.tasks[index])
      .map((task) => (task.project && !kept.has(task.project.toLowerCase()) ? { ...task, project: null } : task)),
  };
}
