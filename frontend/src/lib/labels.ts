import type { CourseStatus, GoalKind, Priority, ProjectStatus, TaskStatus } from "./types";

export const PRIORITY: Record<Priority, string> = { low: "Baixa", medium: "Média", high: "Alta" };

export const PROJECT_STATUS: Record<ProjectStatus, string> = {
  planning: "Planejamento",
  in_progress: "Em andamento",
  paused: "Pausado",
  completed: "Concluído",
  archived: "Arquivado",
};

export const TASK_STATUS: Record<TaskStatus, string> = {
  todo: "A fazer",
  in_progress: "Em andamento",
  done: "Concluído",
};

export const COURSE_STATUS: Record<CourseStatus, string> = {
  planned: "Planejado",
  in_progress: "Em andamento",
  completed: "Concluído",
};

export const GOAL_KIND: Record<GoalKind, string> = {
  weekly_study_hours: "Horas de estudo por semana",
  total_study_hours: "Horas de estudo no total",
  completed_projects: "Projetos concluídos",
  completed_courses: "Cursos concluídos",
  manual: "Acompanhamento manual",
};

export const EXPERIENCE: Record<string, string> = {
  beginner: "Iniciante",
  intermediate: "Intermediário",
  advanced: "Avançado",
};

export function options(labels: Record<string, string>): [string, string][] {
  return Object.entries(labels);
}
