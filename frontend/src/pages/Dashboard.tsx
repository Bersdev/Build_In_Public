import { useQueries, useQuery } from "@tanstack/react-query";
import { Activity as ActivityIcon, Cpu } from "lucide-react";
import { useState } from "react";
import { type BarPoint } from "../components/BarChart";
import { Card, Empty, Loaded, Modal } from "../components/ui";
import { api, queryString } from "../lib/api";
import { useMe } from "../lib/auth";
import { dueLabel, nextContent, overallProgress, pickCurrentPath } from "../lib/dashboard";
import { formatDateTime, formatMinutes, formatMonth, formatShortDate, toIsoDate, today } from "../lib/format";
import type {
  Dashboard as DashboardData,
  Gamification,
  Goal,
  LearningPath,
  LearningPathDetail,
  MonthlyPoint,
  Project,
  StudySession,
  Task,
  Technology,
  WeeklyPoint,
} from "../lib/types";
import { EvolutionCard } from "./dashboard/EvolutionCard";
import { GoalsCard } from "./dashboard/GoalsCard";
import { ProjectsCard } from "./dashboard/ProjectsCard";
import { RoadmapCard } from "./dashboard/RoadmapCard";
import { Stats, type StatsData } from "./dashboard/Stats";
import { TasksCard } from "./dashboard/TasksCard";
import { TodayBanner } from "./dashboard/TodayBanner";
import { SessionForm } from "./Studies";

// Usados também pela página Metas e evolução.
export function weeklyPoints(series: WeeklyPoint[]): BarPoint[] {
  return series.map((point) => ({ key: point.week_start, label: formatShortDate(point.week_start), minutes: point.minutes }));
}

export function monthlyPoints(series: MonthlyPoint[]): BarPoint[] {
  return series.map((point) => ({ key: point.month, label: formatMonth(point.month), minutes: point.minutes }));
}

export function Indicator({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="border-l border-line pl-3">
      <dd className="font-serif text-2xl leading-tight">{value}</dd>
      <dt className="text-sm text-muted">{label}</dt>
    </div>
  );
}

function TechnologyBars({ technologies }: { technologies: Technology[] }) {
  if (technologies.length === 0) return <Empty>As tecnologias aparecem aqui quando você registrar estudos.</Empty>;
  const top = technologies.slice(0, 6);
  const max = Math.max(...top.map((tech) => tech.study_minutes), 1);
  return (
    <ul className="space-y-3">
      {top.map((tech) => (
        <li key={tech.id}>
          <div className="flex justify-between gap-3 text-[13px]">
            <span className="truncate">{tech.name}</span>
            <span className="shrink-0 text-muted">{formatMinutes(tech.study_minutes)}</span>
          </div>
          <div className="mt-1 h-1.5 rounded-full bg-raised">
            <div className="h-full rounded-full bg-chart" style={{ width: `${(tech.study_minutes / max) * 100}%` }} />
          </div>
        </li>
      ))}
    </ul>
  );
}

/** Trilhas com o detalhe (etapas e conteúdos) de cada uma, de onde sai o próximo conteúdo. */
function useLearningPaths() {
  const list = useQuery({ queryKey: ["paths"], queryFn: () => api.get<LearningPath[]>("/learning-paths") });
  const details = useQueries({
    queries: (list.data ?? []).map((path) => ({
      queryKey: ["paths", path.id],
      queryFn: () => api.get<LearningPathDetail>(`/learning-paths/${path.id}`),
    })),
  });
  const loading = list.isPending || details.some((detail) => detail.isPending);
  const paths = details.flatMap((detail) => (detail.data ? [detail.data] : []));
  return { list: list.data ?? [], paths, loading };
}

function ninetyDaysAgo(): string {
  const date = new Date();
  date.setDate(date.getDate() - 89);
  return toIsoDate(date);
}

function featuredGoal(goals: Goal[]): StatsData["featuredGoal"] {
  const open = goals.filter((goal) => !goal.is_reached);
  if (open.length === 0) return null;
  const goal = [...open].sort((a, b) => {
    if (a.due_date && b.due_date) return a.due_date.localeCompare(b.due_date);
    if (a.due_date || b.due_date) return a.due_date ? -1 : 1;
    return b.progress_percent - a.progress_percent;
  })[0];
  return { title: goal.title, percent: goal.progress_percent };
}

function Content({ data }: { data: DashboardData }) {
  const [registering, setRegistering] = useState(false);
  const [chosenPath, setChosenPath] = useState<number | null>(null);
  const { data: user } = useMe();
  const learning = useLearningPaths();
  const tasks = useQuery({ queryKey: ["tasks", "all"], queryFn: () => api.get<Task[]>("/tasks?view=all") });
  const projects = useQuery({ queryKey: ["projects"], queryFn: () => api.get<Project[]>("/projects") });
  const goals = useQuery({ queryKey: ["goals"], queryFn: () => api.get<Goal[]>("/goals") });
  const gamification = useQuery({ queryKey: ["gamification"], queryFn: () => api.get<Gamification>("/gamification") });
  const from = ninetyDaysAgo();
  const sessions = useQuery({
    queryKey: ["study-sessions", "since", from],
    queryFn: () => api.get<StudySession[]>(`/study-sessions${queryString({ date_from: from, limit: 500 })}`),
  });

  const current = pickCurrentPath(learning.paths);
  const next = current ? nextContent(current) : null;
  const shownPath = learning.paths.find((path) => path.id === chosenPath) ?? current ?? learning.paths[0] ?? null;
  const now = today();
  const pendingTasks = (tasks.data ?? []).filter((task) => task.status !== "done");
  const dueTones = pendingTasks.map((task) => dueLabel(task.due_date, now));

  const stats: StatsData = {
    progress: overallProgress(learning.list),
    goalsInProgress: (goals.data ?? []).filter((goal) => !goal.is_reached).length,
    featuredGoal: featuredGoal(goals.data ?? []),
    tasksPending: data.tasks_pending,
    tasksDueToday: dueTones.filter((due) => due?.text === "Hoje").length,
    tasksOverdue: dueTones.filter((due) => due?.tone === "danger").length,
    projectsActive: data.projects_in_progress,
    projectsCompleted: data.projects_completed,
    streak: data.current_streak,
    longestStreak: gamification.data?.longest_streak ?? null,
  };

  return (
    <div className="space-y-5">
      <TodayBanner
        firstName={user?.name.split(/\s+/)[0] ?? ""}
        next={next}
        hasPaths={learning.list.length > 0}
        loading={learning.loading}
        onRegister={() => setRegistering(true)}
      />
      {registering && (
        <Modal title="Registrar estudo" onClose={() => setRegistering(false)}>
          <SessionForm onDone={() => setRegistering(false)} />
        </Modal>
      )}

      <Stats data={stats} />

      <div className="grid gap-5 xl:grid-cols-12">
        <RoadmapCard paths={learning.paths} selected={shownPath} onSelect={setChosenPath} loading={learning.loading} />
        <TasksCard tasks={tasks.data} loading={tasks.isPending} />
      </div>

      <div className="grid gap-5 md:grid-cols-2 min-[1360px]:grid-cols-12">
        <EvolutionCard paths={learning.paths} sessions={sessions.data} loading={learning.loading || sessions.isPending} />
        <ProjectsCard projects={projects.data} loading={projects.isPending} />
        <GoalsCard goals={goals.data} loading={goals.isPending} />
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <Card title="Tecnologias estudadas" icon={<Cpu size={15} />}>
          <TechnologyBars technologies={data.technologies} />
        </Card>
        <Card title="Atividade recente" icon={<ActivityIcon size={15} />}>
          {data.recent_activity.length === 0 ? (
            <Empty>Suas atividades aparecem aqui conforme você usa a plataforma.</Empty>
          ) : (
            <ol className="space-y-3 border-l border-line pl-4">
              {data.recent_activity.slice(0, 6).map((activity) => (
                <li key={activity.id} className="relative text-[13px]">
                  <span className="absolute -left-[21px] top-1.5 size-2 rounded-full bg-accent" aria-hidden="true" />
                  <p className="wrap-anywhere">{activity.title}</p>
                  <time className="text-xs text-faint" dateTime={activity.occurred_at}>
                    {formatDateTime(activity.occurred_at)}
                  </time>
                </li>
              ))}
            </ol>
          )}
        </Card>
      </div>
    </div>
  );
}

export function DashboardPage() {
  const query = useQuery({ queryKey: ["dashboard"], queryFn: () => api.get<DashboardData>("/dashboard") });
  return <Loaded query={query}>{(data) => <Content data={data} />}</Loaded>;
}
