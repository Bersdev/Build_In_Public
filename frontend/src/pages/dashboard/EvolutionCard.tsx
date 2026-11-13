import { TrendingUp } from "lucide-react";
import { useState } from "react";
import { LineChart, niceMinutes, shortMinutes } from "../../components/Charts";
import { Card, Empty } from "../../components/ui";
import { dailyMinutes, progressSeries } from "../../lib/dashboard";
import { formatMinutes, formatShortDate, today } from "../../lib/format";
import type { LearningPathDetail, StudySession } from "../../lib/types";

const PERIODS = [7, 30, 90] as const;
type Period = (typeof PERIODS)[number];
type Metric = "progress" | "study";

function Toggle<T extends string | number>({ value, options, onChange, label }: { value: T; options: [T, string][]; onChange: (v: T) => void; label: string }) {
  return (
    <div role="group" aria-label={label} className="flex rounded-lg border border-line bg-canvas/40 p-0.5">
      {options.map(([option, text]) => (
        <button
          key={String(option)}
          type="button"
          aria-pressed={value === option}
          onClick={() => onChange(option)}
          className={`rounded-md px-2.5 py-1 text-[12px] transition-colors ${value === option ? "bg-accent font-[600] text-on-accent" : "text-muted hover:text-ink"}`}
        >
          {text}
        </button>
      ))}
    </div>
  );
}

export function EvolutionCard({
  paths,
  sessions,
  loading,
}: {
  paths: LearningPathDetail[];
  sessions: StudySession[] | undefined;
  loading: boolean;
}) {
  const [metric, setMetric] = useState<Metric>("progress");
  const [period, setPeriod] = useState<Period>(30);
  const now = today();
  const series = metric === "progress" ? progressSeries(paths, period, now) : dailyMinutes(sessions ?? [], period, now);
  const points = series.map((point) => ({ key: point.date, label: formatShortDate(point.date), value: point.value }));
  const hasData = points.some((point) => point.value > 0);
  const first = points[0]?.value ?? 0;
  const last = points.at(-1)?.value ?? 0;
  const summary =
    metric === "progress"
      ? `${last}% dos conteúdos concluídos${last > first ? ` · +${last - first} pontos no período` : ""}`
      : `${formatMinutes(points.reduce((sum, point) => sum + point.value, 0))} de estudo no período`;

  return (
    <Card
      title="Sua Evolução"
      icon={<TrendingUp size={15} />}
      className="md:col-span-2 min-[1360px]:col-span-5"
      action={<Toggle label="Período" value={period} onChange={setPeriod} options={PERIODS.map((p) => [p, `${p}D`])} />}
    >
      <div className="-mt-1 mb-3 flex flex-wrap items-center justify-between gap-2">
        <Toggle
          label="O que mostrar"
          value={metric}
          onChange={setMetric}
          options={[
            ["progress", "Progresso"],
            ["study", "Tempo de estudo"],
          ]}
        />
        <p className="text-[12px] text-faint">{hasData ? summary : ""}</p>
      </div>
      {loading ? (
        <div className="h-[190px] animate-pulse rounded-xl bg-raised/60" />
      ) : hasData ? (
        <LineChart
          title={metric === "progress" ? `Progresso acumulado nos roadmaps, últimos ${period} dias` : `Tempo de estudo por dia, últimos ${period} dias`}
          points={points}
          max={metric === "progress" ? 100 : niceMinutes(Math.max(...points.map((point) => point.value)))}
          format={metric === "progress" ? (value) => `${value}%` : formatMinutes}
          axisFormat={metric === "progress" ? (value) => `${value}%` : shortMinutes}
        />
      ) : (
        <Empty>
          {metric === "progress"
            ? "Conclua conteúdos do roadmap para ver seu progresso ao longo do tempo."
            : `Nenhuma sessão de estudo nos últimos ${period} dias.`}
        </Empty>
      )}
    </Card>
  );
}
