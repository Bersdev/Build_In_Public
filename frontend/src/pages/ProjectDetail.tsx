import { useQuery } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { Badge, Button, DeleteButton, Empty, ErrorNote, Loaded, Modal, Progress, SectionTitle, TextArea, useAction } from "../components/ui";
import { api } from "../lib/api";
import { formatDate, formatDateTime } from "../lib/format";
import { PRIORITY, PROJECT_STATUS } from "../lib/labels";
import type { ProjectDetail, Task, TaskStatus } from "../lib/types";
import { ProjectForm, ProjectImage, statusTone } from "./Projects";
import { TaskForm, TaskList } from "./Tasks";

function Content({ project }: { project: ProjectDetail }) {
  const navigate = useNavigate();
  const [editing, setEditing] = useState(false);
  const [task, setTask] = useState<Task | "new" | null>(null);
  const remove = useAction(() => api.delete(`/projects/${project.id}`), () => navigate("/projetos"));
  const setStatus = useAction(({ id, status }: { id: number; status: TaskStatus }) => api.patch(`/tasks/${id}`, { status }));
  const removeTask = useAction((id: number) => api.delete(`/tasks/${id}`));
  const addNote = useAction((content: string) => api.post(`/projects/${project.id}/updates`, { content }));

  return (
    <>
      <Link to="/projetos" className="text-sm text-muted underline">
        Voltar para projetos
      </Link>
      <header className="mb-6 mt-3 flex flex-wrap items-start justify-between gap-4">
        <div className="flex min-w-0 items-start gap-3">
          <ProjectImage project={project} size={56} />
          <div className="min-w-0">
            <h1 className="font-serif text-3xl leading-tight">{project.name}</h1>
            <div className="mt-1 flex flex-wrap items-center gap-1.5">
              <Badge tone={statusTone(project.status)}>{PROJECT_STATUS[project.status]}</Badge>
              <Badge>Prioridade {PRIORITY[project.priority].toLowerCase()}</Badge>
              {project.technologies.map((tech) => (
                <Badge key={tech}>{tech}</Badge>
              ))}
            </div>
          </div>
        </div>
        <div className="flex gap-1.5">
          <Button onClick={() => setEditing(true)}>Editar</Button>
          <DeleteButton onConfirm={() => remove.mutate()} />
        </div>
      </header>
      <ErrorNote error={remove.error ?? setStatus.error ?? removeTask.error} />

      <div className="grid gap-8 lg:grid-cols-[3fr_2fr]">
        <div className="min-w-0 space-y-8">
          <section className="max-w-[70ch] space-y-3">
            {project.description && <p className="prose-note">{project.description}</p>}
            {project.objective && (
              <div>
                <h2 className="text-sm text-muted">Objetivo</h2>
                <p className="prose-note">{project.objective}</p>
              </div>
            )}
            {project.learnings && (
              <div>
                <h2 className="text-sm text-muted">Aprendizados adquiridos</h2>
                <p className="prose-note">{project.learnings}</p>
              </div>
            )}
          </section>

          <section>
            <SectionTitle action={<Button onClick={() => setTask("new")}>Nova tarefa</Button>}>
              Tarefas ({project.tasks_done} de {project.tasks_total})
            </SectionTitle>
            {project.tasks.length === 0 ? (
              <Empty>Nenhuma tarefa neste projeto.</Empty>
            ) : (
              <TaskList
                tasks={project.tasks}
                onEdit={setTask}
                onStatus={(id, status) => setStatus.mutate({ id, status })}
                onDelete={removeTask.mutate}
              />
            )}
          </section>

          <section>
            <SectionTitle>Registros do Diário</SectionTitle>
            {project.journal_entries.length === 0 ? (
              <Empty>Vincule registros do Diário a este projeto para vê-los aqui.</Empty>
            ) : (
              <ul className="space-y-3">
                {project.journal_entries.map((entry) => (
                  <li key={entry.id}>
                    <p className="font-serif text-lg leading-snug">{entry.title}</p>
                    <p className="text-xs text-faint">{formatDate(entry.entry_date)}</p>
                    {entry.key_learnings && <p className="mt-0.5 text-sm text-muted">{entry.key_learnings}</p>}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        <aside className="min-w-0 space-y-8">
          <section>
            <div className="mb-1 flex justify-between text-sm">
              <span className="text-muted">Conclusão</span>
              <span>{project.progress_percent}%</span>
            </div>
            <Progress value={project.progress_percent} label="Conclusão do projeto" />
            <dl className="mt-4 space-y-1.5 text-sm">
              {project.start_date && (
                <div className="flex justify-between gap-3">
                  <dt className="text-muted">Início</dt>
                  <dd>{formatDate(project.start_date)}</dd>
                </div>
              )}
              {project.due_date && (
                <div className="flex justify-between gap-3">
                  <dt className="text-muted">Prazo</dt>
                  <dd>{formatDate(project.due_date)}</dd>
                </div>
              )}
              {project.github_url && (
                <div className="flex justify-between gap-3">
                  <dt className="text-muted">GitHub</dt>
                  <dd>
                    <a className="text-accent-ink underline" href={project.github_url} target="_blank" rel="noreferrer noopener">
                      Abrir repositório
                    </a>
                  </dd>
                </div>
              )}
              {project.demo_url && (
                <div className="flex justify-between gap-3">
                  <dt className="text-muted">Demonstração</dt>
                  <dd>
                    <a className="text-accent-ink underline" href={project.demo_url} target="_blank" rel="noreferrer noopener">
                      Abrir demonstração
                    </a>
                  </dd>
                </div>
              )}
            </dl>
          </section>

          <section>
            <SectionTitle>Histórico</SectionTitle>
            <form
              className="mb-4 space-y-2"
              onSubmit={(event: FormEvent<HTMLFormElement>) => {
                event.preventDefault();
                const form = event.currentTarget;
                const content = String(new FormData(form).get("content")).trim();
                if (content) addNote.mutate(content, { onSuccess: () => form.reset() });
              }}
            >
              <TextArea label="Nova atualização" name="content" rows={2} required />
              <ErrorNote error={addNote.error} />
              <Button type="submit" disabled={addNote.isPending}>
                Adicionar atualização
              </Button>
            </form>
            {project.updates.length === 0 ? (
              <p className="text-sm text-muted">As mudanças de status e as atualizações aparecem aqui.</p>
            ) : (
              <ol className="space-y-3 border-l border-line pl-3">
                {project.updates.map((update) => (
                  <li key={update.id} className="text-sm">
                    <p className="wrap-anywhere whitespace-pre-wrap">{update.content}</p>
                    <time className="text-xs text-faint" dateTime={update.created_at}>
                      {formatDateTime(update.created_at)}
                    </time>
                  </li>
                ))}
              </ol>
            )}
          </section>
        </aside>
      </div>

      {editing && (
        <Modal title="Editar projeto" onClose={() => setEditing(false)}>
          <ProjectForm project={project} onDone={() => setEditing(false)} />
        </Modal>
      )}
      {task && (
        <Modal title={task === "new" ? "Nova tarefa" : "Editar tarefa"} onClose={() => setTask(null)}>
          <TaskForm task={task === "new" ? undefined : task} projectId={project.id} onDone={() => setTask(null)} />
        </Modal>
      )}
    </>
  );
}

export function ProjectDetailPage() {
  const { id } = useParams();
  const query = useQuery({ queryKey: ["projects", "detail", id], queryFn: () => api.get<ProjectDetail>(`/projects/${id}`) });
  return <Loaded query={query}>{(project) => <Content project={project} />}</Loaded>;
}
