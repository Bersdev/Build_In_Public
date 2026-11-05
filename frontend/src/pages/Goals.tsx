import { useQuery } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { BarChart } from "../components/BarChart";
import { Badge, Button, DeleteButton, Empty, ErrorNote, Loaded, Modal, PageHeader, Panel, Progress, SectionTitle, SelectField, TextArea, TextField, useAction } from "../components/ui";
import { api } from "../lib/api";
import { formValues, formatDate, formatDateTime, formatHours } from "../lib/format";
import { GOAL_KIND, options } from "../lib/labels";
import type { Activity, Evolution, Gamification, Goal, GoalKind } from "../lib/types";
import { Indicator, monthlyPoints, weeklyPoints } from "./Dashboard";

function GoalForm({ goal, onDone }: { goal?: Goal; onDone: () => void }) {
  const [kind, setKind] = useState<GoalKind>(goal?.kind ?? "weekly_study_hours");
  const save = useAction(
    (values: Record<string, unknown>) => (goal ? api.patch(`/goals/${goal.id}`, values) : api.post("/goals", values)),
    onDone,
  );
  return (
    <form
      className="space-y-3"
      onSubmit={(event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        save.mutate(formValues(new FormData(event.currentTarget), { numbers: ["target_value", "manual_value"] }));
      }}
    >
      <TextField label="Meta" name="title" defaultValue={goal?.title} placeholder="Estudar 5 horas por semana" required />
      <TextArea label="Descrição" name="description" defaultValue={goal?.description ?? ""} />
      <SelectField
        label="Como acompanhar"
        name="kind"
        value={kind}
        onChange={(event) => setKind(event.target.value as GoalKind)}
        choices={options(GOAL_KIND)}
      />
      <div className="grid gap-3 sm:grid-cols-2">
        <TextField label="Valor a alcançar" name="target_value" type="number" min={0.1} step="any" defaultValue={goal?.target_value} required />
        {kind === "manual" && <TextField label="Valor atual" name="manual_value" type="number" min={0} step="any" defaultValue={goal?.manual_value ?? 0} required />}
        <TextField label="Início" name="start_date" type="date" defaultValue={goal?.start_date ?? ""} />
        <TextField label="Prazo" name="due_date" type="date" defaultValue={goal?.due_date ?? ""} />
      </div>
      <ErrorNote error={save.error} />
      <Button type="submit" variant="primary" disabled={save.isPending}>
        Salvar meta
      </Button>
    </form>
  );
}

function GoalRow({ goal, onEdit }: { goal: Goal; onEdit: () => void }) {
  const complete = useAction((completed: boolean) => api.patch(`/goals/${goal.id}`, { completed }));
  const remove = useAction(() => api.delete(`/goals/${goal.id}`));
  return (
    <li className="py-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="font-medium">{goal.title}</h3>
          <p className="text-sm text-muted">
            {GOAL_KIND[goal.kind]}: {formatHours(goal.current_value)} de {formatHours(goal.target_value)}
            {goal.due_date && `, prazo em ${formatDate(goal.due_date)}`}
          </p>
          {goal.description && <p className="mt-0.5 text-sm text-muted">{goal.description}</p>}
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          {goal.completed_at ? <Badge tone="ok">Concluída</Badge> : goal.is_reached && <Badge tone="accent">Valor alcançado</Badge>}
          <Button onClick={() => complete.mutate(!goal.completed_at)}>{goal.completed_at ? "Reabrir" : "Concluir"}</Button>
          <Button onClick={onEdit}>Editar</Button>
          <DeleteButton onConfirm={() => remove.mutate()} />
        </div>
      </div>
      <div className="mt-2">
        <Progress value={goal.progress_percent} label={`Progresso de ${goal.title}`} />
      </div>
      <ErrorNote error={complete.error ?? remove.error} />
    </li>
  );
}

function Goals() {
  const [editing, setEditing] = useState<Goal | "new" | null>(null);
  const query = useQuery({ queryKey: ["goals"], queryFn: () => api.get<Goal[]>("/goals") });
  return (
    <section className="mb-10">
      <SectionTitle action={<Button variant="primary" onClick={() => setEditing("new")}>Nova meta</Button>}>Metas</SectionTitle>
      <Loaded query={query}>
        {(goals) =>
          goals.length === 0 ? (
            <Empty>Defina uma meta, como horas de estudo por semana, e acompanhe o progresso calculado pelos seus registros.</Empty>
          ) : (
            <ul className="divide-y divide-line border-y border-line">
              {goals.map((goal) => (
                <GoalRow key={goal.id} goal={goal} onEdit={() => setEditing(goal)} />
              ))}
            </ul>
          )
        }
      </Loaded>
      {editing && (
        <Modal title={editing === "new" ? "Nova meta" : "Editar meta"} onClose={() => setEditing(null)}>
          <GoalForm goal={editing === "new" ? undefined : editing} onDone={() => setEditing(null)} />
        </Modal>
      )}
    </section>
  );
}

function EvolutionSection() {
  const query = useQuery({ queryKey: ["evolution"], queryFn: () => api.get<Evolution>("/evolution") });
  return (
    <section className="mb-10">
      <SectionTitle>Evolução</SectionTitle>
      <Loaded query={query}>
        {(data) => (
          <>
            <dl className="mb-6 grid grid-cols-2 gap-x-4 gap-y-5 sm:grid-cols-3 lg:grid-cols-5">
              <Indicator label="Horas estudadas" value={formatHours(Math.round((data.total_minutes / 60) * 10) / 10)} />
              <Indicator label="Dias de estudo nos últimos 30" value={data.study_days_last_30} />
              <Indicator label="Metas concluídas" value={data.goals_completed} />
              <Indicator label="Projetos finalizados" value={data.projects_completed} />
              <Indicator label="Tecnologias exploradas" value={data.technologies_explored} />
            </dl>
            <div className="grid gap-8 lg:grid-cols-2">
              <div>
                <h3 className="mb-1 text-sm text-muted">Tempo de estudo por mês</h3>
                <BarChart title="Tempo de estudo por mês, últimos 12 meses" points={monthlyPoints(data.monthly_minutes)} tickEvery={2} />
              </div>
              <div>
                <h3 className="mb-1 text-sm text-muted">Tempo de estudo por semana</h3>
                <BarChart title="Tempo de estudo por semana, últimas 12 semanas" points={weeklyPoints(data.weekly_minutes)} tickEvery={3} />
              </div>
            </div>
          </>
        )}
      </Loaded>
    </section>
  );
}

function GamificationSection() {
  const query = useQuery({ queryKey: ["gamification"], queryFn: () => api.get<Gamification>("/gamification") });
  return (
    <section className="mb-10">
      <SectionTitle>Nível e conquistas</SectionTitle>
      <Loaded query={query}>
        {(data) => {
          const span = data.next_level_xp - data.level_start_xp;
          const inLevel = data.xp - data.level_start_xp;
          const unlocked = data.achievements.filter((item) => item.unlocked_at);
          const locked = data.achievements.filter((item) => !item.unlocked_at);
          return (
            <>
              <div className="mb-5 grid gap-5 lg:grid-cols-[2fr_3fr]">
                <div>
                  <p className="font-serif text-2xl">Nível {data.level}</p>
                  <p className="mb-2 text-sm text-muted">
                    {data.xp} XP. Faltam {data.next_level_xp - data.xp} XP para o nível {data.level + 1}.
                  </p>
                  <Progress value={(inLevel / span) * 100} label="Progresso até o próximo nível" />
                  <p className="mt-3 text-sm text-muted">
                    Sequência atual: {data.current_streak} {data.current_streak === 1 ? "dia" : "dias"}. Maior sequência: {data.longest_streak}{" "}
                    {data.longest_streak === 1 ? "dia" : "dias"}.
                  </p>
                </div>
                <details className="text-sm">
                  <summary className="cursor-pointer text-muted">Como os pontos são calculados</summary>
                  <table className="mt-2 w-full text-left">
                    <tbody>
                      {data.rules.map((rule) => (
                        <tr key={rule.action} className="border-t border-line">
                          <td className="py-1 pr-3">{rule.action}</td>
                          <td className="py-1 text-muted">{rule.xp}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <p className="mt-2 text-faint">Excluir um registro retira os pontos dele. Conquistas obtidas permanecem.</p>
                </details>
              </div>
              {unlocked.length > 0 && (
                <>
                  <h3 className="mb-2 text-sm text-muted">Marcos alcançados</h3>
                  <ul className="mb-5 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                    {unlocked.map((item) => (
                      <li key={item.code}>
                        <Panel className="h-full !p-3">
                          <p className="font-medium text-accent-ink">{item.title}</p>
                          <p className="text-sm text-muted">{item.description}</p>
                          <p className="text-xs text-faint">{formatDateTime(item.unlocked_at!)}</p>
                        </Panel>
                      </li>
                    ))}
                  </ul>
                </>
              )}
              <h3 className="mb-2 text-sm text-muted">Próximas conquistas</h3>
              <ul className="grid gap-x-6 gap-y-3 sm:grid-cols-2 lg:grid-cols-3">
                {locked.map((item) => (
                  <li key={item.code}>
                    <div className="flex justify-between gap-2 text-sm">
                      <span>{item.title}</span>
                      <span className="shrink-0 text-faint">
                        {item.current} de {item.threshold}
                      </span>
                    </div>
                    <p className="mb-1 text-xs text-faint">{item.description}</p>
                    <Progress value={(item.current / item.threshold) * 100} label={`Progresso de ${item.title}`} />
                  </li>
                ))}
              </ul>
            </>
          );
        }}
      </Loaded>
    </section>
  );
}

function History() {
  const [limit, setLimit] = useState(20);
  const query = useQuery({ queryKey: ["activity", limit], queryFn: () => api.get<Activity[]>(`/activity?limit=${limit}`) });
  return (
    <section>
      <SectionTitle>Histórico de atividades</SectionTitle>
      <Loaded query={query}>
        {(items) =>
          items.length === 0 ? (
            <Empty>Suas atividades aparecem aqui conforme você usa a plataforma.</Empty>
          ) : (
            <>
              <ol className="max-w-[70ch] space-y-2.5 border-l border-line pl-3">
                {items.map((item) => (
                  <li key={item.id} className="text-sm">
                    <p className="wrap-anywhere">{item.title}</p>
                    <time className="text-xs text-faint" dateTime={item.occurred_at}>
                      {formatDateTime(item.occurred_at)}
                    </time>
                  </li>
                ))}
              </ol>
              {items.length === limit && limit < 100 && (
                <Button className="mt-3" onClick={() => setLimit(100)}>
                  Ver mais
                </Button>
              )}
            </>
          )
        }
      </Loaded>
    </section>
  );
}

export function GoalsPage() {
  return (
    <>
      <PageHeader title="Metas e evolução" description="Seus objetivos e o que você já alcançou, calculados a partir dos seus registros." />
      <Goals />
      <EvolutionSection />
      <GamificationSection />
      <History />
    </>
  );
}
