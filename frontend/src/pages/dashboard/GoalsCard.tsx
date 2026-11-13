import { ArrowRight, Check, Trophy } from "lucide-react";
import { Link } from "react-router";
import { Ring } from "../../components/Charts";
import { Card, Empty } from "../../components/ui";
import type { Goal } from "../../lib/types";

const LIMIT = 5;

/** Em andamento primeiro (as mais adiantadas no topo), depois as concluídas. */
export function sortGoals(goals: Goal[]): Goal[] {
  return [...goals].sort((a, b) => Number(a.is_reached) - Number(b.is_reached) || b.progress_percent - a.progress_percent);
}

export function GoalsCard({ goals, loading }: { goals: Goal[] | undefined; loading: boolean }) {
  const all = goals ?? [];
  const reached = all.filter((goal) => goal.is_reached).length;
  const list = sortGoals(all).slice(0, LIMIT);
  return (
    <Card
      title="Metas"
      icon={<Trophy size={15} />}
      className="min-[1360px]:col-span-3"
      action={
        <Link to="/metas" className="inline-flex items-center gap-1 text-[12.5px] text-accent-ink hover:underline">
          Ver todas <ArrowRight size={13} />
        </Link>
      }
    >
      {loading ? (
        <div className="h-48 animate-pulse rounded-xl bg-raised/60" />
      ) : all.length === 0 ? (
        <Empty action={<Link to="/metas" className="text-accent-ink underline">Criar meta</Link>}>Nenhuma meta cadastrada.</Empty>
      ) : (
        <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-start min-[1360px]:flex-col min-[1360px]:items-center min-[1600px]:flex-row min-[1600px]:items-start">
          <Ring value={(reached / all.length) * 100} size={112} stroke={10} label="Metas concluídas">
            <span>
              <span className="block text-[22px] font-[680] leading-none tracking-[-0.03em]">
                {reached}/{all.length}
              </span>
              <span className="mt-1 block text-[10.5px] leading-tight text-faint">
                metas
                <br />
                concluídas
              </span>
            </span>
          </Ring>
          <ul className="w-full min-w-0 space-y-2.5">
            {list.map((goal) => (
              <li key={goal.id}>
                <div className="flex items-center gap-2 text-[13px]">
                  <span
                    className={`grid size-[18px] shrink-0 place-items-center rounded-full ${goal.is_reached ? "bg-accent text-on-accent" : "border border-line-strong"}`}
                    aria-hidden="true"
                  >
                    {goal.is_reached && <Check size={11} strokeWidth={3.5} />}
                  </span>
                  <span className={`min-w-0 flex-1 truncate ${goal.is_reached ? "text-muted" : "text-ink"}`} title={goal.title}>
                    {goal.title}
                  </span>
                  <span className="shrink-0 text-[11.5px] text-faint">{goal.is_reached ? "Concluída" : `${goal.progress_percent}%`}</span>
                </div>
                {!goal.is_reached && (
                  <div className="ml-[26px] mt-1 h-1 overflow-hidden rounded-full bg-raised" role="progressbar" aria-label={`Progresso de ${goal.title}`} aria-valuenow={goal.progress_percent} aria-valuemin={0} aria-valuemax={100}>
                    <div className="h-full rounded-full bg-accent" style={{ width: `${Math.min(100, goal.progress_percent)}%` }} />
                  </div>
                )}
              </li>
            ))}
            {all.length > LIMIT && <li className="pl-[26px] text-[12px] text-faint">+{all.length - LIMIT} meta{all.length - LIMIT > 1 ? "s" : ""}</li>}
          </ul>
        </div>
      )}
    </Card>
  );
}
