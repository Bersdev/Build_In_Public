import { ArrowUpRight, BarChart3, Flame, FolderKanban, ListChecks, Target } from "lucide-react";
import type { ReactNode } from "react";
import { Link } from "react-router";

const TONES = {
  accent: "bg-accent/12 text-accent-ink",
  ok: "bg-ok/12 text-ok",
  danger: "bg-danger/12 text-danger",
  neutral: "bg-raised text-muted",
};

function Stat({
  icon,
  tone,
  label,
  value,
  children,
  to,
}: {
  icon: ReactNode;
  tone: keyof typeof TONES;
  label: string;
  value: ReactNode;
  children?: ReactNode;
  to?: string;
}) {
  return (
    <div className="relative flex min-w-0 gap-3.5 rounded-2xl border border-line bg-surface p-4 last:col-span-2 sm:last:col-span-1">
      <span className={`grid size-11 shrink-0 place-items-center rounded-xl ${TONES[tone]}`} aria-hidden="true">
        {icon}
      </span>
      {to && (
        <Link
          to={to}
          aria-label={`Ver ${label.toLowerCase()}`}
          title={`Ver ${label.toLowerCase()}`}
          className="absolute right-2.5 top-2.5 grid size-7 place-items-center rounded-md text-faint transition-colors hover:bg-raised hover:text-accent-ink"
        >
          <ArrowUpRight size={15} />
        </Link>
      )}
      <div className="min-w-0 flex-1">
        <p className={`text-[12.5px] leading-snug text-muted ${to ? "pr-6" : ""}`}>{label}</p>
        <p className="mt-0.5 text-[24px] font-[680] leading-tight tracking-[-0.03em]">{value}</p>
        {children && <div className="mt-1.5 text-[12px] text-faint">{children}</div>}
      </div>
    </div>
  );
}

function Bar({ value, label }: { value: number; label: string }) {
  return (
    <div role="progressbar" aria-label={label} aria-valuenow={value} aria-valuemin={0} aria-valuemax={100} className="h-1.5 overflow-hidden rounded-full bg-raised">
      <div className="h-full rounded-full bg-accent transition-[width] duration-500" style={{ width: `${Math.min(100, value)}%` }} />
    </div>
  );
}

export interface StatsData {
  progress: { completed: number; total: number; percent: number };
  goalsInProgress: number;
  featuredGoal: { title: string; percent: number } | null;
  tasksPending: number;
  tasksDueToday: number;
  tasksOverdue: number;
  projectsActive: number;
  projectsCompleted: number;
  streak: number;
  longestStreak: number | null;
}

export function Stats({ data }: { data: StatsData }) {
  const taskNote = [
    data.tasksOverdue ? `${data.tasksOverdue} atrasada${data.tasksOverdue > 1 ? "s" : ""}` : null,
    data.tasksDueToday ? `${data.tasksDueToday} para hoje` : null,
  ]
    .filter(Boolean)
    .join(" · ");
  return (
    <section aria-label="Indicadores gerais" className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
      <Stat icon={<BarChart3 size={21} />} tone="accent" label="Progresso geral" value={`${data.progress.percent}%`}>
        <Bar value={data.progress.percent} label="Progresso geral dos estudos" />
        <span className="mt-1 block">
          {data.progress.total ? `${data.progress.completed} de ${data.progress.total} conteúdos` : "Sem roadmap ainda"}
        </span>
      </Stat>
      <Stat icon={<Target size={21} />} tone="ok" label="Metas em andamento" value={data.goalsInProgress} to="/metas">
        {data.featuredGoal ? (
          <span className="block truncate" title={data.featuredGoal.title}>
            {data.featuredGoal.title}: {data.featuredGoal.percent}%
          </span>
        ) : (
          "Nenhuma em andamento"
        )}
      </Stat>
      <Stat icon={<ListChecks size={21} />} tone="accent" label="Tarefas pendentes" value={data.tasksPending} to="/tarefas">
        {taskNote || "Nada vencendo hoje"}
      </Stat>
      <Stat icon={<FolderKanban size={21} />} tone="neutral" label="Projetos ativos" value={data.projectsActive} to="/projetos">
        {data.projectsCompleted === 1 ? "1 concluído" : `${data.projectsCompleted} concluídos`}
      </Stat>
      <Stat icon={<Flame size={21} />} tone="danger" label="Sequência de estudos" value={data.streak === 1 ? "1 dia" : `${data.streak} dias`}>
        {data.longestStreak !== null ? `Recorde: ${data.longestStreak} ${data.longestStreak === 1 ? "dia" : "dias"}` : "Estude hoje para manter"}
      </Stat>
    </section>
  );
}
