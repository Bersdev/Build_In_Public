import type { ImportPlan } from "./types";

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
