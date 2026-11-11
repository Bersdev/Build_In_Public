import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Link } from "react-router";
import { BarChart, type BarPoint } from "../components/BarChart";
import { Button, Empty, Loaded, Modal, Progress, SectionTitle } from "../components/ui";
import { api } from "../lib/api";
import { formatDate, formatDateTime, formatHours, formatMinutes, formatMonth, formatShortDate } from "../lib/format";
import type { Dashboard as DashboardData, MonthlyPoint, Technology, WeeklyPoint } from "../lib/types";
import { SessionForm } from "./Studies";

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
  const top = technologies.slice(0, 8);
  const max = Math.max(...top.map((tech) => tech.study_minutes), 1);
  return (
    <ul className="space-y-2.5">
      {top.map((tech) => (
        <li key={tech.id}>
          <div className="flex justify-between gap-3 text-sm">
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

function Hero({ data, onRegister }: { data: DashboardData; onRegister: () => void }) {
  const dailyPoints = data.daily_minutes.map((point) => ({
    key: point.date,
    label: formatShortDate(point.date),
    minutes: point.minutes,
  }));
  const details = [
    data.current_streak === 1 ? "1 dia seguido de estudo" : `${data.current_streak} dias seguidos de estudo`,
    `nível ${data.level}`,
    `${data.xp} XP`,
  ].join(", ");
  return (
    <section className="mb-10">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="max-w-[24ch] font-serif text-[32px] leading-[1.1] sm:text-[40px]">
            {data.week_minutes > 0
              ? `Nesta semana você estudou ${formatMinutes(data.week_minutes)}.`
              : "Nenhum estudo registrado nesta semana."}
          </h1>
          <p className="mt-2 text-muted">{details}.</p>
        </div>
        <Button variant="primary" onClick={onRegister}>
          Registrar estudo
        </Button>
      </div>
      <div className="mt-6">
        <h2 className="mb-1 text-sm text-muted">Tempo de estudo nos últimos 30 dias</h2>
        <BarChart title="Tempo de estudo por dia, últimos 30 dias" points={dailyPoints} height={120} tickEvery={7} />
      </div>
    </section>
  );
}

function Content({ data }: { data: DashboardData }) {
  const [registering, setRegistering] = useState(false);
  const [range, setRange] = useState<"weekly" | "monthly">("weekly");
  return (
    <>
      <Hero data={data} onRegister={() => setRegistering(true)} />
      {registering && (
        <Modal title="Registrar estudo" onClose={() => setRegistering(false)}>
          <SessionForm onDone={() => setRegistering(false)} />
        </Modal>
      )}

      <dl className="mb-10 grid grid-cols-2 gap-x-4 gap-y-5 sm:grid-cols-3 lg:grid-cols-5">
        <Indicator label="Horas estudadas" value={formatHours(Math.round((data.total_minutes / 60) * 10) / 10)} />
        <Indicator label="Dias com estudos" value={data.study_days} />
        <Indicator label="Projetos em andamento" value={data.projects_in_progress} />
        <Indicator label="Projetos concluídos" value={data.projects_completed} />
        <Indicator label="Tarefas pendentes" value={data.tasks_pending} />
      </dl>

      <div className="mb-10 grid gap-8 lg:grid-cols-[3fr_2fr]">
        <section>
          <SectionTitle
            action={
              <div role="group" aria-label="Período do gráfico" className="flex gap-1">
                <Button aria-pressed={range === "weekly"} className={range === "weekly" ? "bg-raised" : ""} onClick={() => setRange("weekly")}>
                  Semanal
                </Button>
                <Button aria-pressed={range === "monthly"} className={range === "monthly" ? "bg-raised" : ""} onClick={() => setRange("monthly")}>
                  Mensal
                </Button>
              </div>
            }
          >
            Evolução
          </SectionTitle>
          {range === "weekly" ? (
            <BarChart title="Tempo de estudo por semana, últimas 12 semanas" points={weeklyPoints(data.weekly_minutes)} tickEvery={3} />
          ) : (
            <BarChart title="Tempo de estudo por mês, últimos 12 meses" points={monthlyPoints(data.monthly_minutes)} tickEvery={2} />
          )}
        </section>
        <section>
          <SectionTitle>Tecnologias estudadas</SectionTitle>
          <TechnologyBars technologies={data.technologies} />
        </section>
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        <section>
          <SectionTitle
            action={
              <Link to="/metas" className="text-sm text-muted underline">
                Ver todas
              </Link>
            }
          >
            Metas atuais
          </SectionTitle>
          {data.current_goals.length === 0 ? (
            <Empty action={<Link to="/metas" className="text-accent-ink underline">Criar meta</Link>}>Nenhuma meta em andamento.</Empty>
          ) : (
            <ul className="space-y-4">
              {data.current_goals.map((goal) => (
                <li key={goal.id}>
                  <div className="mb-1 flex justify-between gap-3 text-sm">
                    <span>{goal.title}</span>
                    <span className="shrink-0 text-muted">{goal.progress_percent}%</span>
                  </div>
                  <Progress value={goal.progress_percent} label={`Progresso de ${goal.title}`} />
                </li>
              ))}
            </ul>
          )}
        </section>

        <section>
          <SectionTitle>Últimos aprendizados</SectionTitle>
          {data.recent_learnings.length === 0 ? (
            <Empty action={<Link to="/diario" className="text-accent-ink underline">Abrir o Diário</Link>}>
              Registre no Diário o que você aprendeu.
            </Empty>
          ) : (
            <ul className="space-y-4">
              {data.recent_learnings.map((entry) => (
                <li key={entry.id}>
                  <p className="line-clamp-3 font-serif text-[1.0625rem] leading-snug">{entry.key_learnings}</p>
                  <p className="mt-0.5 text-xs text-faint">
                    {entry.title}, {formatDate(entry.entry_date)}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section>
          <SectionTitle>Linha do tempo</SectionTitle>
          {data.recent_activity.length === 0 ? (
            <Empty>Suas atividades aparecem aqui conforme você usa a plataforma.</Empty>
          ) : (
            <ol className="space-y-3 border-l border-line pl-3">
              {data.recent_activity.map((activity) => (
                <li key={activity.id} className="text-sm">
                  <p className="wrap-anywhere">{activity.title}</p>
                  <time className="text-xs text-faint" dateTime={activity.occurred_at}>
                    {formatDateTime(activity.occurred_at)}
                  </time>
                </li>
              ))}
            </ol>
          )}
        </section>
      </div>
    </>
  );
}

export function DashboardPage() {
  const query = useQuery({ queryKey: ["dashboard"], queryFn: () => api.get<DashboardData>("/dashboard") });
  return <Loaded query={query}>{(data) => <Content data={data} />}</Loaded>;
}
