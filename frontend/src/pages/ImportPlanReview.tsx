import { CheckCircle2, FolderKanban, ListChecks, Map as MapIcon, Target, TriangleAlert } from "lucide-react";
import { useState, type ReactNode } from "react";
import { Link } from "react-router";
import { Badge, Button, ErrorNote, useAction } from "../components/ui";
import { api } from "../lib/api";
import { formatDate } from "../lib/format";
import { countSelected, finalizePlan, selectAll, type Selection } from "../lib/importPlan";
import { GOAL_KIND, PRIORITY } from "../lib/labels";
import type { ImportPlan, ImportResult } from "../lib/types";

function Group({ icon, title, page, children }: { icon: ReactNode; title: string; page: string; children: ReactNode }) {
  return (
    <section className="rounded-lg border border-line">
      <header className="flex items-center justify-between gap-2 border-b border-line px-3 py-2">
        <h3 className="flex items-center gap-2 text-[13px] font-medium">
          <span className="text-accent-ink">{icon}</span>
          {title}
        </h3>
        <span className="text-[12px] text-faint">vai para {page}</span>
      </header>
      <ul className="divide-y divide-line">{children}</ul>
    </section>
  );
}

function Row({ checked, onChange, title, meta }: { checked: boolean; onChange: (value: boolean) => void; title: string; meta?: ReactNode }) {
  return (
    <li>
      <label className="flex cursor-pointer items-start gap-2.5 px-3 py-2 hover:bg-raised/50">
        <input type="checkbox" className="mt-1 size-4 accent-[var(--accent)]" checked={checked} onChange={(event) => onChange(event.target.checked)} />
        <span className={`min-w-0 ${checked ? "" : "text-faint line-through"}`}>
          <span className="block text-sm">{title}</span>
          {meta && <span className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[12px] text-faint">{meta}</span>}
        </span>
      </label>
    </li>
  );
}

function toggle(list: boolean[], index: number, value: boolean) {
  return list.map((item, position) => (position === index ? value : item));
}

export function ImportPlanReview({
  plan,
  warnings,
  onBack,
  onApplied,
}: {
  plan: ImportPlan;
  warnings: string[];
  onBack: () => void;
  onApplied: (result: ImportResult) => void;
}) {
  const [selection, setSelection] = useState<Selection>(() => selectAll(plan));
  const [roadmapTitle, setRoadmapTitle] = useState(plan.roadmap?.title ?? "");
  const apply = useAction((final: ImportPlan) => api.post<ImportResult>("/imports/apply", { plan: final }));
  const total = countSelected(selection);
  const itemCount = plan.roadmap?.stages.reduce((sum, stage) => sum + stage.items.length, 0) ?? 0;

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted">
        Revise o que a IA encontrou. Desmarque o que não quiser. Nada é salvo até você confirmar, e tudo entra como não
        concluído: o progresso vem do que você registrar depois.
      </p>

      {warnings.length > 0 && (
        <div className="rounded-lg border border-line bg-canvas p-3 text-[13px] text-muted">
          <p className="mb-1 flex items-center gap-1.5 text-ink">
            <TriangleAlert size={14} className="text-accent-ink" /> Ajustes feitos na resposta da IA
          </p>
          <ul className="list-inside list-disc space-y-0.5">
            {warnings.map((warning) => (
              <li key={warning}>{warning}</li>
            ))}
          </ul>
        </div>
      )}

      {plan.roadmap && (
        <Group icon={<MapIcon size={15} />} title="Trilha" page="Roadmaps">
          <li className="space-y-2 px-3 py-2">
            <label className="flex items-center gap-2.5 text-sm">
              <input
                type="checkbox"
                className="size-4 accent-[var(--accent)]"
                checked={selection.roadmap}
                onChange={(event) => setSelection({ ...selection, roadmap: event.target.checked })}
              />
              Criar a trilha com {plan.roadmap.stages.length} etapas e {itemCount} conteúdos
            </label>
            {selection.roadmap && (
              <>
                <input className="control" aria-label="Nome da trilha" value={roadmapTitle} onChange={(event) => setRoadmapTitle(event.target.value)} />
                <details className="text-[13px] text-muted">
                  <summary className="cursor-pointer">Ver etapas</summary>
                  <ol className="mt-2 space-y-1.5 pl-1">
                    {plan.roadmap.stages.map((stage) => (
                      <li key={stage.title}>
                        <span className="text-ink">{stage.title}</span>
                        <span className="text-faint"> · {stage.items.map((item) => item.title).join(", ")}</span>
                      </li>
                    ))}
                  </ol>
                </details>
              </>
            )}
          </li>
        </Group>
      )}

      {plan.goals.length > 0 && (
        <Group icon={<Target size={15} />} title={`Metas (${plan.goals.length})`} page="Metas e evolução">
          {plan.goals.map((goal, index) => (
            <Row
              key={`${goal.title}${index}`}
              checked={selection.goals[index]}
              onChange={(value) => setSelection({ ...selection, goals: toggle(selection.goals, index, value) })}
              title={goal.title}
              meta={
                <>
                  <Badge>{GOAL_KIND[goal.kind]}</Badge>
                  <span className="num">alvo: {goal.target_value}</span>
                  {goal.due_date && <span>até {formatDate(goal.due_date)}</span>}
                </>
              }
            />
          ))}
        </Group>
      )}

      {plan.projects.length > 0 && (
        <Group icon={<FolderKanban size={15} />} title={`Projetos (${plan.projects.length})`} page="Projetos">
          {plan.projects.map((project, index) => (
            <Row
              key={`${project.name}${index}`}
              checked={selection.projects[index]}
              onChange={(value) => setSelection({ ...selection, projects: toggle(selection.projects, index, value) })}
              title={project.name}
              meta={
                <>
                  {project.technologies.map((name) => (
                    <Badge key={name} tone="accent">
                      {name}
                    </Badge>
                  ))}
                  {project.due_date && <span>prazo: {formatDate(project.due_date)}</span>}
                </>
              }
            />
          ))}
        </Group>
      )}

      {plan.tasks.length > 0 && (
        <Group icon={<ListChecks size={15} />} title={`Tarefas (${plan.tasks.length})`} page="Tarefas">
          {plan.tasks.map((task, index) => (
            <Row
              key={`${task.title}${index}`}
              checked={selection.tasks[index]}
              onChange={(value) => setSelection({ ...selection, tasks: toggle(selection.tasks, index, value) })}
              title={task.title}
              meta={
                <>
                  <Badge tone={task.priority === "high" ? "danger" : "neutral"}>{PRIORITY[task.priority]}</Badge>
                  {task.due_date && <span>prazo: {formatDate(task.due_date)}</span>}
                  {task.project && <span>projeto: {task.project}</span>}
                </>
              }
            />
          ))}
        </Group>
      )}

      <ErrorNote error={apply.error} />
      <div className="flex flex-wrap gap-2">
        <Button
          variant="primary"
          disabled={total === 0 || apply.isPending}
          onClick={() => apply.mutate(finalizePlan(plan, selection, roadmapTitle), { onSuccess: (result) => onApplied(result as ImportResult) })}
        >
          {apply.isPending ? "Salvando..." : `Importar ${total} ${total === 1 ? "item" : "itens"}`}
        </Button>
        <Button onClick={onBack} disabled={apply.isPending}>
          Escolher outro arquivo
        </Button>
      </div>
    </div>
  );
}

export function ImportSummary({ result, onOpenPath, onClose }: { result: ImportResult; onOpenPath: (id: number) => void; onClose: () => void }) {
  const plural = (count: number, one: string, many: string) => (count === 1 ? one : many);
  const links: [string, string, number][] = [
    ["/metas", `${plural(result.goals, "meta", "metas")} em Metas e evolução`, result.goals],
    ["/projetos", `${plural(result.projects, "projeto", "projetos")} em Projetos`, result.projects],
    ["/tarefas", `${plural(result.tasks, "tarefa", "tarefas")} em Tarefas`, result.tasks],
  ];
  return (
    <div className="space-y-4">
      <p className="flex items-center gap-2 text-ink">
        <CheckCircle2 size={18} className="text-ok" /> Plano importado.
      </p>
      <ul className="space-y-1.5 text-sm text-muted">
        {result.learning_path_id && <li>1 trilha em Roadmaps</li>}
        {links
          .filter(([, , count]) => count > 0)
          .map(([to, label, count]) => (
            <li key={to}>
              <Link to={to} className="underline hover:text-ink">
                {count} {label}
              </Link>
            </li>
          ))}
      </ul>
      <div className="flex gap-2">
        {result.learning_path_id ? (
          <Button variant="primary" onClick={() => onOpenPath(result.learning_path_id as number)}>
            Ver a trilha
          </Button>
        ) : (
          <Button variant="primary" onClick={onClose}>
            Fechar
          </Button>
        )}
      </div>
    </div>
  );
}
