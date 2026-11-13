import { ArrowRight, Check, Lock, Map as MapIcon, Minus } from "lucide-react";
import { Link } from "react-router";
import { Card, Empty } from "../../components/ui";
import { nextContent, stagePercent, stageStates, type StageState } from "../../lib/dashboard";
import type { LearningPathDetail } from "../../lib/types";

const STATE_TEXT: Record<StageState, (percent: number) => string> = {
  done: () => "Concluída · 100%",
  current: (percent) => `Em andamento · ${percent}%`,
  locked: () => "Bloqueada",
  empty: () => "Sem conteúdos",
};

function StageIcon({ state }: { state: StageState }) {
  if (state === "done")
    return (
      <span className="grid size-7 place-items-center rounded-full bg-accent text-on-accent">
        <Check size={15} strokeWidth={3} />
      </span>
    );
  if (state === "current")
    return (
      <span className="grid size-7 place-items-center rounded-full border-2 border-accent bg-accent/10 shadow-[0_0_0_4px_var(--glow)]">
        <span className="size-2.5 rounded-full bg-accent" />
      </span>
    );
  return (
    <span className="grid size-7 place-items-center rounded-full border border-line-strong bg-raised text-faint">
      {state === "locked" ? <Lock size={13} /> : <Minus size={13} />}
    </span>
  );
}

const MAX_STAGES = 5;

export function RoadmapCard({
  paths,
  selected,
  onSelect,
  loading,
}: {
  paths: LearningPathDetail[];
  selected: LearningPathDetail | null;
  onSelect: (id: number) => void;
  loading: boolean;
}) {
  const action = (
    <div className="flex flex-wrap items-center gap-3">
      {paths.length > 1 && selected && (
        <select
          aria-label="Roadmap exibido"
          value={selected.id}
          onChange={(event) => onSelect(Number(event.target.value))}
          className="h-8 max-w-[180px] rounded-md border border-line bg-surface px-2 text-[12.5px] text-ink"
        >
          {paths.map((path) => (
            <option key={path.id} value={path.id}>
              {path.title}
            </option>
          ))}
        </select>
      )}
      <Link to={selected ? `/roadmaps?trilha=${selected.id}` : "/roadmaps"} className="inline-flex items-center gap-1 text-[12.5px] text-accent-ink hover:underline">
        Ver roadmap completo <ArrowRight size={13} />
      </Link>
    </div>
  );

  if (loading) {
    return (
      <Card title="Seu Roadmap" icon={<MapIcon size={15} />} className="xl:col-span-7">
        <div className="h-48 animate-pulse rounded-xl bg-raised/60" />
      </Card>
    );
  }
  if (!selected) {
    return (
      <Card title="Seu Roadmap" icon={<MapIcon size={15} />} action={action} className="xl:col-span-7">
        <Empty action={<Link to="/roadmaps" className="text-accent-ink underline">Criar ou importar um roadmap</Link>}>
          Nenhum roadmap com conteúdos ainda.
        </Empty>
      </Card>
    );
  }

  const states = stageStates(selected);
  const next = nextContent(selected);
  const currentIndex = next?.stageIndex ?? Math.max(0, selected.stages.length - MAX_STAGES);
  // Mostra uma janela de etapas em volta da atual: a anterior, a atual e as próximas.
  const start = Math.max(0, Math.min(currentIndex - 1, selected.stages.length - MAX_STAGES));
  const visible = selected.stages.slice(start, start + MAX_STAGES);
  const hiddenAfter = selected.stages.length - (start + visible.length);

  return (
    <Card title="Seu Roadmap" icon={<MapIcon size={15} />} action={action} className="xl:col-span-7">
      <p className="-mt-2 mb-4 truncate text-[12.5px] text-faint">
        {selected.title} · {selected.completed_items} de {selected.total_items} conteúdos · {selected.progress_percent}%
      </p>
      {selected.stages.length === 0 ? (
        <Empty action={<Link to={`/roadmaps?trilha=${selected.id}`} className="text-accent-ink underline">Adicionar etapas</Link>}>
          Este roadmap ainda não tem etapas.
        </Empty>
      ) : (
        <div className="grid gap-5 md:grid-cols-[1fr_1.05fr]">
          <ol className="relative space-y-1" aria-label={`Etapas de ${selected.title}`}>
            {start > 0 && <li className="pb-1 pl-10 text-[12px] text-faint">{start} etapa{start > 1 ? "s" : ""} antes</li>}
            {visible.map((stage, offset) => {
              const index = start + offset;
              const state = states[index];
              const isLast = offset === visible.length - 1;
              return (
                <li key={stage.id} className="relative flex gap-3 pb-3">
                  {!isLast && <span className="absolute left-[13px] top-8 bottom-0 w-px bg-line-strong/70" aria-hidden="true" />}
                  <StageIcon state={state} />
                  <div className="min-w-0 pt-0.5">
                    <p className={`truncate text-[13.5px] ${state === "current" ? "font-[600] text-ink" : state === "done" ? "text-ink" : "text-muted"}`}>
                      {stage.title}
                    </p>
                    <p className={`text-[12px] ${state === "done" ? "text-accent-ink" : state === "current" ? "text-accent-ink/85" : "text-faint"}`}>
                      {STATE_TEXT[state](stagePercent(stage))}
                    </p>
                  </div>
                </li>
              );
            })}
            {hiddenAfter > 0 && <li className="pl-10 text-[12px] text-faint">+{hiddenAfter} etapa{hiddenAfter > 1 ? "s" : ""} depois</li>}
          </ol>

          <div className="flex flex-col justify-center rounded-xl border border-line bg-raised/50 p-5 text-center">
            {next ? (
              <>
                <p className="text-[11.5px] font-medium uppercase tracking-[0.08em] text-faint">Próximo conteúdo</p>
                <p className="mt-2 text-[17px] font-[650] leading-snug tracking-[-0.015em] [overflow-wrap:anywhere]">{next.item.title}</p>
                <p className="mt-1 text-[12.5px] text-muted">{next.stage.title}</p>
                <div className="mx-auto mt-4 flex w-full max-w-[260px] items-center gap-3">
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-line" role="progressbar" aria-label={`Progresso da etapa ${next.stage.title}`} aria-valuenow={next.stageProgress} aria-valuemin={0} aria-valuemax={100}>
                    <div className="h-full rounded-full bg-accent" style={{ width: `${next.stageProgress}%` }} />
                  </div>
                  <span className="text-[12px] text-muted">{next.stageProgress}%</span>
                </div>
                <Link
                  to={`/roadmaps?trilha=${selected.id}`}
                  className="mx-auto mt-4 inline-flex h-9 items-center gap-1.5 rounded-lg bg-accent px-4 text-[13px] font-[600] text-on-accent hover:brightness-105"
                >
                  Continuar estudando <ArrowRight size={15} />
                </Link>
              </>
            ) : (
              <>
                <p className="text-[17px] font-[650]">Roadmap concluído</p>
                <p className="mt-1 text-[13px] text-muted">Todos os conteúdos desta trilha foram concluídos.</p>
                <Link to="/roadmaps" className="mx-auto mt-4 text-[13px] text-accent-ink underline">
                  Criar o próximo roadmap
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </Card>
  );
}
