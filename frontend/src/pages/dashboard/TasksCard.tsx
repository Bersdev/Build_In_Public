import { ArrowRight, Check, ListChecks } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router";
import { Card, Empty, useAction } from "../../components/ui";
import { api } from "../../lib/api";
import { dueLabel } from "../../lib/dashboard";
import { today } from "../../lib/format";
import { PRIORITY } from "../../lib/labels";
import type { Task, TaskStatus } from "../../lib/types";

const PRIORITY_DOT = { high: "bg-danger", medium: "bg-accent", low: "bg-faint" };
const PRIORITY_ORDER = { high: 0, medium: 1, low: 2 };
const BADGE = { accent: "bg-accent/14 text-accent-ink", neutral: "bg-raised text-muted", danger: "bg-danger/14 text-danger" };
const LIMIT = 6;

/** Pendentes: atrasadas e com prazo mais próximo primeiro; sem prazo por último; depois a prioridade. */
export function sortPending(tasks: Task[]): Task[] {
  return [...tasks].sort((a, b) => {
    if (a.due_date !== b.due_date) {
      if (!a.due_date) return 1;
      if (!b.due_date) return -1;
      return a.due_date.localeCompare(b.due_date);
    }
    return PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority];
  });
}

export function TasksCard({ tasks, loading }: { tasks: Task[] | undefined; loading: boolean }) {
  const [tab, setTab] = useState<"pending" | "done">("pending");
  const setStatus = useAction(({ id, status }: { id: number; status: TaskStatus }) => api.patch(`/tasks/${id}`, { status }));
  const now = today();
  const pending = sortPending((tasks ?? []).filter((task) => task.status !== "done"));
  const done = (tasks ?? [])
    .filter((task) => task.status === "done")
    .sort((a, b) => (b.completed_at ?? "").localeCompare(a.completed_at ?? ""));
  const list = (tab === "pending" ? pending : done).slice(0, LIMIT);

  const tabButton = (value: "pending" | "done", label: string, count: number) => (
    <button
      type="button"
      role="tab"
      aria-selected={tab === value}
      onClick={() => setTab(value)}
      className={`rounded-md px-2.5 py-1 text-[12.5px] transition-colors ${tab === value ? "bg-raised text-ink" : "text-muted hover:text-ink"}`}
    >
      {label} <span className="text-faint">{count}</span>
    </button>
  );

  return (
    <Card
      title="Minhas Tarefas"
      icon={<ListChecks size={15} />}
      className="xl:col-span-5"
      action={
        <Link to="/tarefas" className="inline-flex items-center gap-1 text-[12.5px] text-accent-ink hover:underline">
          Ver todas <ArrowRight size={13} />
        </Link>
      }
    >
      <div role="tablist" aria-label="Filtro de tarefas" className="-mt-1 mb-3 flex gap-1">
        {tabButton("pending", "Pendentes", pending.length)}
        {tabButton("done", "Concluídas", done.length)}
      </div>
      {loading ? (
        <div className="h-48 animate-pulse rounded-xl bg-raised/60" />
      ) : list.length === 0 ? (
        <Empty action={tab === "pending" ? <Link to="/tarefas" className="text-accent-ink underline">Criar tarefa</Link> : undefined}>
          {tab === "pending" ? "Nenhuma tarefa pendente." : "Nenhuma tarefa concluída ainda."}
        </Empty>
      ) : (
        <ul className="divide-y divide-line">
          {list.map((task) => {
            const isDone = task.status === "done";
            const due = isDone ? null : dueLabel(task.due_date, now);
            return (
              <li key={task.id} className="flex items-center gap-3 py-2.5">
                <button
                  type="button"
                  role="checkbox"
                  aria-checked={isDone}
                  aria-label={isDone ? `Reabrir ${task.title}` : `Concluir ${task.title}`}
                  disabled={setStatus.isPending}
                  onClick={() => setStatus.mutate({ id: task.id, status: isDone ? "todo" : "done" })}
                  className={`grid size-[22px] shrink-0 place-items-center rounded-full border transition-colors ${
                    isDone ? "border-accent bg-accent text-on-accent" : "border-line-strong text-transparent hover:border-accent hover:text-accent-ink"
                  }`}
                >
                  <Check size={13} strokeWidth={3} />
                </button>
                <div className="min-w-0 flex-1">
                  <p className={`truncate text-[13.5px] ${isDone ? "text-faint line-through" : "text-ink"}`}>{task.title}</p>
                  <p className="flex items-center gap-1.5 text-[11.5px] text-faint">
                    <span className={`size-1.5 rounded-full ${PRIORITY_DOT[task.priority]}`} aria-hidden="true" />
                    Prioridade {PRIORITY[task.priority].toLowerCase()}
                    {task.project_name && <span className="truncate">· {task.project_name}</span>}
                  </p>
                </div>
                {due && <span className={`shrink-0 rounded-md px-2 py-0.5 text-[11.5px] font-medium ${BADGE[due.tone]}`}>{due.text}</span>}
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}
