import { useQuery } from "@tanstack/react-query";
import { useState, type DragEvent, type FormEvent } from "react";
import { Badge, Button, DeleteButton, Empty, ErrorNote, Loaded, Modal, PageHeader, SelectField, TextArea, TextField, useAction } from "../components/ui";
import { api, queryString } from "../lib/api";
import { formValues, formatDate } from "../lib/format";
import { PRIORITY, TASK_STATUS, options } from "../lib/labels";
import type { Project, Settings, Task, TaskStatus } from "../lib/types";

export function TaskForm({ task, projectId, onDone }: { task?: Task; projectId?: number; onDone: () => void }) {
  const projects = useQuery({ queryKey: ["projects"], queryFn: () => api.get<Project[]>("/projects") });
  const save = useAction(
    (values: Record<string, unknown>) => (task ? api.patch(`/tasks/${task.id}`, values) : api.post("/tasks", values)),
    onDone,
  );
  return (
    <form
      className="space-y-3"
      onSubmit={(event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        save.mutate(formValues(new FormData(event.currentTarget), { numbers: ["project_id"] }));
      }}
    >
      <TextField label="Título" name="title" defaultValue={task?.title} required />
      <TextArea label="Descrição" name="description" defaultValue={task?.description ?? ""} />
      <div className="grid gap-3 sm:grid-cols-3">
        <SelectField label="Status" name="status" defaultValue={task?.status ?? "todo"} choices={options(TASK_STATUS)} />
        <SelectField label="Prioridade" name="priority" defaultValue={task?.priority ?? "medium"} choices={options(PRIORITY)} />
        <TextField label="Prazo" name="due_date" type="date" defaultValue={task?.due_date ?? ""} />
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <TextField label="Categoria" name="category" defaultValue={task?.category ?? ""} />
        <TextField label="Tecnologia" name="technology" defaultValue={task?.technology ?? ""} />
        <SelectField
          label="Projeto"
          name="project_id"
          defaultValue={task?.project_id ?? projectId ?? ""}
          allowEmpty="Nenhum"
          choices={(projects.data ?? []).map((project) => [String(project.id), project.name])}
        />
      </div>
      <ErrorNote error={save.error} />
      <Button type="submit" variant="primary" disabled={save.isPending}>
        Salvar tarefa
      </Button>
    </form>
  );
}

function TaskMeta({ task }: { task: Task }) {
  return (
    <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-muted">
      <Badge tone={task.priority === "high" ? "accent" : "neutral"}>Prioridade {PRIORITY[task.priority].toLowerCase()}</Badge>
      {task.due_date && <Badge tone={task.is_overdue ? "danger" : "neutral"}>{task.is_overdue ? "Atrasada: " : "Prazo: "}{formatDate(task.due_date)}</Badge>}
      {task.technology && <Badge>{task.technology}</Badge>}
      {task.category && <Badge>{task.category}</Badge>}
      {task.project_name && <span>{task.project_name}</span>}
    </div>
  );
}

export function StatusSelect({ task, onChange }: { task: Task; onChange: (status: TaskStatus) => void }) {
  return (
    <select
      aria-label={`Status de ${task.title}`}
      className="control !w-auto !py-1 text-sm"
      value={task.status}
      onChange={(event) => onChange(event.target.value as TaskStatus)}
    >
      {options(TASK_STATUS).map(([value, label]) => (
        <option key={value} value={value}>
          {label}
        </option>
      ))}
    </select>
  );
}

function Kanban({ tasks, onEdit, onStatus }: { tasks: Task[]; onEdit: (task: Task) => void; onStatus: (id: number, status: TaskStatus) => void }) {
  const [over, setOver] = useState<TaskStatus | null>(null);
  function drop(event: DragEvent, status: TaskStatus) {
    event.preventDefault();
    setOver(null);
    const id = Number(event.dataTransfer.getData("text/plain"));
    if (id) onStatus(id, status);
  }
  return (
    <div className="grid gap-4 md:grid-cols-3">
      {(Object.keys(TASK_STATUS) as TaskStatus[]).map((status) => {
        const column = tasks.filter((task) => task.status === status);
        return (
          <section
            key={status}
            aria-label={TASK_STATUS[status]}
            onDragOver={(event) => {
              event.preventDefault();
              setOver(status);
            }}
            onDragLeave={() => setOver(null)}
            onDrop={(event) => drop(event, status)}
            className={`min-h-40 rounded-[10px] border p-2.5 ${over === status ? "border-accent" : "border-line"}`}
          >
            <h2 className="mb-2 flex justify-between px-1 text-sm text-muted">
              {TASK_STATUS[status]}
              <span>{column.length}</span>
            </h2>
            <ul className="space-y-2">
              {column.map((task) => (
                <li
                  key={task.id}
                  draggable
                  onDragStart={(event) => event.dataTransfer.setData("text/plain", String(task.id))}
                  className="cursor-grab rounded-md border border-line bg-surface p-2.5"
                >
                  <button type="button" onClick={() => onEdit(task)} className="text-left hover:text-accent-ink">
                    {task.title}
                  </button>
                  <TaskMeta task={task} />
                  <div className="mt-2">
                    <StatusSelect task={task} onChange={(next) => onStatus(task.id, next)} />
                  </div>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}

export function TaskList({
  tasks,
  onEdit,
  onStatus,
  onDelete,
}: {
  tasks: Task[];
  onEdit: (task: Task) => void;
  onStatus: (id: number, status: TaskStatus) => void;
  onDelete: (id: number) => void;
}) {
  return (
    <ul className="divide-y divide-line border-y border-line">
      {tasks.map((task) => (
        <li key={task.id} className="flex flex-wrap items-center justify-between gap-3 py-2.5">
          <div className="flex min-w-0 items-start gap-2.5">
            <input
              type="checkbox"
              aria-label={`Concluir ${task.title}`}
              className="mt-1 size-4 accent-[var(--accent)]"
              checked={task.status === "done"}
              onChange={(event) => onStatus(task.id, event.target.checked ? "done" : "todo")}
            />
            <div className="min-w-0">
              <button type="button" onClick={() => onEdit(task)} className={`text-left hover:text-accent-ink ${task.status === "done" ? "text-muted line-through" : ""}`}>
                {task.title}
              </button>
              <TaskMeta task={task} />
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <StatusSelect task={task} onChange={(next) => onStatus(task.id, next)} />
            <DeleteButton onConfirm={() => onDelete(task.id)} />
          </div>
        </li>
      ))}
    </ul>
  );
}

const VIEWS: [string, string][] = [
  ["kanban", "Kanban"],
  ["list", "Lista"],
  ["today", "Hoje"],
  ["upcoming", "Próximas"],
  ["overdue", "Atrasadas"],
  ["completed", "Concluídas"],
];

const EMPTY_MESSAGES: Record<string, string> = {
  today: "Nenhuma tarefa com prazo para hoje.",
  upcoming: "Nenhuma tarefa com prazo futuro.",
  overdue: "Nenhuma tarefa atrasada.",
  completed: "Nenhuma tarefa concluída ainda.",
};

export function TasksPage() {
  const settings = useQuery({ queryKey: ["settings"], queryFn: () => api.get<Settings>("/users/me/settings") });
  const [chosen, setChosen] = useState<string | null>(null);
  const view = chosen ?? settings.data?.default_task_view ?? "kanban";
  const [editing, setEditing] = useState<Task | "new" | null>(null);
  const apiView = view === "kanban" || view === "list" ? "all" : view;
  const query = useQuery({
    queryKey: ["tasks", apiView],
    queryFn: () => api.get<Task[]>(`/tasks${queryString({ view: apiView })}`),
  });
  const setStatus = useAction(({ id, status }: { id: number; status: TaskStatus }) => api.patch(`/tasks/${id}`, { status }));
  const remove = useAction((id: number) => api.delete(`/tasks/${id}`));
  const changeStatus = (id: number, status: TaskStatus) => setStatus.mutate({ id, status });

  return (
    <>
      <PageHeader
        title="Tarefas"
        description="O que você precisa fazer nos estudos e nos projetos."
        action={
          <Button variant="primary" onClick={() => setEditing("new")}>
            Nova tarefa
          </Button>
        }
      />
      <div role="group" aria-label="Visualização" className="mb-4 flex flex-wrap gap-1">
        {VIEWS.map(([key, label]) => (
          <Button key={key} aria-pressed={view === key} className={view === key ? "bg-raised" : ""} onClick={() => setChosen(key)}>
            {label}
          </Button>
        ))}
      </div>
      <ErrorNote error={setStatus.error ?? remove.error} />
      <Loaded query={query}>
        {(tasks) => {
          if (view === "kanban") return <Kanban tasks={tasks} onEdit={setEditing} onStatus={changeStatus} />;
          if (tasks.length === 0) return <Empty>{EMPTY_MESSAGES[view] ?? "Crie a primeira tarefa para começar a organizar seu trabalho."}</Empty>;
          return <TaskList tasks={tasks} onEdit={setEditing} onStatus={changeStatus} onDelete={remove.mutate} />;
        }}
      </Loaded>
      {editing && (
        <Modal title={editing === "new" ? "Nova tarefa" : "Editar tarefa"} onClose={() => setEditing(null)}>
          <TaskForm task={editing === "new" ? undefined : editing} onDone={() => setEditing(null)} />
          {editing !== "new" && (
            <div className="mt-3 border-t border-line pt-3">
              <DeleteButton
                label="Excluir tarefa"
                onConfirm={() => {
                  remove.mutate(editing.id);
                  setEditing(null);
                }}
              />
            </div>
          )}
        </Modal>
      )}
    </>
  );
}
