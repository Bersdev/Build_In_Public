import { useQuery } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { Link } from "react-router";
import { Badge, Button, Empty, ErrorNote, Loaded, Modal, PageHeader, Panel, Progress, SelectField, TextArea, TextField, useAction } from "../components/ui";
import { api, queryString } from "../lib/api";
import { formValues, formatDate } from "../lib/format";
import { PRIORITY, PROJECT_STATUS, options } from "../lib/labels";
import type { Project } from "../lib/types";

export function ProjectForm({ project, onDone }: { project?: Project; onDone: () => void }) {
  const save = useAction(
    (values: Record<string, unknown>) => (project ? api.patch(`/projects/${project.id}`, values) : api.post("/projects", values)),
    onDone,
  );
  return (
    <form
      className="space-y-3"
      onSubmit={(event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        save.mutate(formValues(new FormData(event.currentTarget), { numbers: ["progress_percent"], lists: ["technologies"] }));
      }}
    >
      <TextField label="Nome" name="name" defaultValue={project?.name} required />
      <TextArea label="Descrição" name="description" defaultValue={project?.description ?? ""} />
      <TextArea label="Objetivo" name="objective" defaultValue={project?.objective ?? ""} />
      <div className="grid gap-3 sm:grid-cols-3">
        <SelectField label="Status" name="status" defaultValue={project?.status ?? "planning"} choices={options(PROJECT_STATUS)} />
        <SelectField label="Prioridade" name="priority" defaultValue={project?.priority ?? "medium"} choices={options(PRIORITY)} />
        <TextField label="Conclusão (%)" name="progress_percent" type="number" min={0} max={100} defaultValue={project?.progress_percent ?? 0} required />
        <TextField label="Início" name="start_date" type="date" defaultValue={project?.start_date ?? ""} />
        <TextField label="Prazo" name="due_date" type="date" defaultValue={project?.due_date ?? ""} />
      </div>
      <TextField label="Tecnologias" name="technologies" defaultValue={project?.technologies.join(", ")} hint="Separe por vírgulas." />
      <div className="grid gap-3 sm:grid-cols-2">
        <TextField label="Link do GitHub" name="github_url" type="url" defaultValue={project?.github_url ?? ""} placeholder="https://github.com/..." />
        <TextField label="Link de demonstração" name="demo_url" type="url" defaultValue={project?.demo_url ?? ""} placeholder="https://" />
      </div>
      <TextField label="Endereço da imagem" name="image_url" type="url" defaultValue={project?.image_url ?? ""} placeholder="https://" hint="Se ficar vazio, usamos a inicial do nome." />
      <TextArea label="Aprendizados adquiridos" name="learnings" defaultValue={project?.learnings ?? ""} />
      <ErrorNote error={save.error} />
      <Button type="submit" variant="primary" disabled={save.isPending}>
        Salvar projeto
      </Button>
    </form>
  );
}

export function ProjectImage({ project, size = 40 }: { project: Project; size?: number }) {
  if (project.image_url) {
    return <img src={project.image_url} alt="" width={size} height={size} className="shrink-0 rounded-md object-cover" style={{ width: size, height: size }} />;
  }
  return (
    <span aria-hidden="true" className="flex shrink-0 items-center justify-center rounded-md bg-raised font-serif text-accent-ink" style={{ width: size, height: size, fontSize: size / 2 }}>
      {project.name.charAt(0).toUpperCase()}
    </span>
  );
}

export function statusTone(status: Project["status"]) {
  if (status === "completed") return "ok" as const;
  if (status === "in_progress") return "accent" as const;
  return "neutral" as const;
}

export function ProjectsPage() {
  const [creating, setCreating] = useState(false);
  const [status, setStatus] = useState("");
  const query = useQuery({
    queryKey: ["projects", status],
    queryFn: () => api.get<Project[]>(`/projects${queryString({ status })}`),
  });
  return (
    <>
      <PageHeader
        title="Projetos"
        description="Aplicações, experimentos e projetos pessoais que você está construindo."
        action={
          <Button variant="primary" onClick={() => setCreating(true)}>
            Novo projeto
          </Button>
        }
      />
      <div className="mb-4 max-w-xs">
        <SelectField label="Status" value={status} onChange={(event) => setStatus(event.target.value)} allowEmpty="Todos" choices={options(PROJECT_STATUS)} />
      </div>
      <Loaded query={query}>
        {(projects) =>
          projects.length === 0 ? (
            <Empty>{status ? "Nenhum projeto com este status." : "Crie o primeiro projeto para reunir tarefas, histórico e aprendizados."}</Empty>
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {projects.map((project) => (
                <Link key={project.id} to={`/projetos/${project.id}`} className="block rounded-[10px] transition-colors hover:brightness-110">
                  <Panel className="h-full">
                    <div className="flex items-start gap-3">
                      <ProjectImage project={project} />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <h2 className="truncate font-medium">{project.name}</h2>
                          <Badge tone={statusTone(project.status)}>{PROJECT_STATUS[project.status]}</Badge>
                        </div>
                        {project.description && <p className="mt-0.5 line-clamp-2 text-sm text-muted">{project.description}</p>}
                      </div>
                    </div>
                    <div className="mt-3 flex items-center gap-2 text-sm text-muted">
                      <div className="flex-1">
                        <Progress value={project.progress_percent} label={`Conclusão de ${project.name}`} />
                      </div>
                      {project.progress_percent}%
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs text-faint">
                      {project.technologies.slice(0, 4).map((tech) => (
                        <Badge key={tech}>{tech}</Badge>
                      ))}
                      {project.due_date && <span>Prazo: {formatDate(project.due_date)}</span>}
                    </div>
                  </Panel>
                </Link>
              ))}
            </div>
          )
        }
      </Loaded>
      {creating && (
        <Modal title="Novo projeto" onClose={() => setCreating(false)}>
          <ProjectForm onDone={() => setCreating(false)} />
        </Modal>
      )}
    </>
  );
}
