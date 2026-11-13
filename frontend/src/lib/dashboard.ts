/**
 * Lógica do dashboard, separada da tela para ser testada: qual é o próximo conteúdo do roadmap,
 * o estado de cada etapa, o progresso ao longo do tempo e o rótulo de prazo das tarefas.
 * Tudo é calculado a partir dos dados reais devolvidos pela API.
 */
import { formatShortDate, toIsoDate } from "./format";
import type { LearningItem, LearningPath, LearningPathDetail, LearningStage, StudySession } from "./types";

export type StageState = "done" | "current" | "locked" | "empty";

export interface NextContent {
  path: LearningPathDetail;
  stage: LearningStage;
  stageIndex: number;
  item: LearningItem;
  /** Conclusão da etapa atual, de 0 a 100. */
  stageProgress: number;
}

export interface SeriesPoint {
  date: string;
  value: number;
}

export function stagePercent(stage: LearningStage): number {
  if (stage.items.length === 0) return 0;
  return Math.round((stage.items.filter((item) => item.completed_at).length / stage.items.length) * 100);
}

/** Índice da primeira etapa com conteúdo pendente: as etapas seguem a ordem definida no roadmap. */
function currentStageIndex(path: LearningPathDetail): number {
  return path.stages.findIndex((stage) => stage.items.some((item) => !item.completed_at));
}

export function stageStates(path: LearningPathDetail): StageState[] {
  const current = currentStageIndex(path);
  return path.stages.map((stage, index) => {
    if (stage.items.length === 0) return "empty";
    if (current === -1 || index < current) return "done";
    return index === current ? "current" : "locked";
  });
}

export function nextContent(path: LearningPathDetail): NextContent | null {
  const index = currentStageIndex(path);
  if (index === -1) return null;
  const stage = path.stages[index];
  const item = stage.items.find((candidate) => !candidate.completed_at)!;
  return { path, stage, stageIndex: index, item, stageProgress: stagePercent(stage) };
}

function lastCompletion(path: LearningPathDetail): string | null {
  let latest: string | null = null;
  for (const stage of path.stages) {
    for (const item of stage.items) {
      if (item.completed_at && (!latest || item.completed_at > latest)) latest = item.completed_at;
    }
  }
  return latest;
}

/**
 * A trilha "atual" é a que tem pendência e foi estudada mais recentemente.
 * Se nenhuma foi iniciada, vale a primeira criada (menor id).
 */
export function pickCurrentPath(paths: LearningPathDetail[]): LearningPathDetail | null {
  const pending = paths.filter((path) => currentStageIndex(path) !== -1);
  if (pending.length === 0) return null;
  return [...pending].sort((a, b) => {
    const lastA = lastCompletion(a);
    const lastB = lastCompletion(b);
    if (lastA && lastB) return lastB.localeCompare(lastA);
    if (lastA || lastB) return lastA ? -1 : 1;
    return a.id - b.id;
  })[0];
}

export function overallProgress(paths: LearningPath[]): { completed: number; total: number; percent: number } {
  const completed = paths.reduce((sum, path) => sum + path.completed_items, 0);
  const total = paths.reduce((sum, path) => sum + path.total_items, 0);
  return { completed, total, percent: total ? Math.round((completed / total) * 100) : 0 };
}

function lastDays(days: number, todayIso: string): string[] {
  const [year, month, day] = todayIso.split("-").map(Number);
  return Array.from({ length: days }, (_, index) => toIsoDate(new Date(year, month - 1, day - (days - 1 - index))));
}

/** Percentual acumulado de conteúdos concluídos (sobre o total atual) ao fim de cada dia. */
export function progressSeries(paths: LearningPathDetail[], days: number, todayIso: string): SeriesPoint[] {
  const items = paths.flatMap((path) => path.stages.flatMap((stage) => stage.items));
  const doneDays = items.filter((item) => item.completed_at).map((item) => toIsoDate(new Date(item.completed_at!)));
  return lastDays(days, todayIso).map((date) => ({
    date,
    value: items.length ? Math.round((doneDays.filter((done) => done <= date).length / items.length) * 100) : 0,
  }));
}

/** Minutos estudados em cada dia da janela, a partir das sessões registradas. */
export function dailyMinutes(sessions: StudySession[], days: number, todayIso: string): SeriesPoint[] {
  const totals = new Map<string, number>();
  for (const session of sessions) totals.set(session.study_date, (totals.get(session.study_date) ?? 0) + session.duration_minutes);
  return lastDays(days, todayIso).map((date) => ({ date, value: totals.get(date) ?? 0 }));
}

const WEEKDAYS = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];

export function dueLabel(due: string | null, todayIso: string): { text: string; tone: "accent" | "neutral" | "danger" } | null {
  if (!due) return null;
  const [y1, m1, d1] = due.split("-").map(Number);
  const [y2, m2, d2] = todayIso.split("-").map(Number);
  const diff = Math.round((Date.UTC(y1, m1 - 1, d1) - Date.UTC(y2, m2 - 1, d2)) / 86_400_000);
  if (diff < 0) return { text: "Atrasada", tone: "danger" };
  if (diff === 0) return { text: "Hoje", tone: "accent" };
  if (diff === 1) return { text: "Amanhã", tone: "neutral" };
  if (diff <= 6) return { text: WEEKDAYS[new Date(y1, m1 - 1, d1).getDay()], tone: "neutral" };
  return { text: formatShortDate(due), tone: "neutral" };
}
