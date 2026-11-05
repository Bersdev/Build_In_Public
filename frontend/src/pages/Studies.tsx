import { useQuery } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { Badge, Button, DeleteButton, Empty, ErrorNote, Loaded, Modal, PageHeader, Panel, SectionTitle, SelectField, TextArea, TextField, useAction } from "../components/ui";
import { api } from "../lib/api";
import { formValues, formatDate, formatMinutes, today } from "../lib/format";
import { COURSE_STATUS, options } from "../lib/labels";
import type { Course, CourseStatus, StudySession, Technology } from "../lib/types";

export function SessionForm({ session, onDone }: { session?: StudySession; onDone: () => void }) {
  const save = useAction(
    (values: Record<string, unknown>) =>
      session ? api.patch(`/study-sessions/${session.id}`, values) : api.post("/study-sessions", values),
    onDone,
  );
  return (
    <form
      className="space-y-3"
      onSubmit={(event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        save.mutate(formValues(new FormData(event.currentTarget), { numbers: ["duration_minutes"] }));
      }}
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <TextField label="Data" name="study_date" type="date" max={today()} defaultValue={session?.study_date ?? today()} required />
        <TextField label="Duração em minutos" name="duration_minutes" type="number" min={1} max={1440} defaultValue={session?.duration_minutes} required />
      </div>
      <TextField label="Tecnologia ou assunto" name="technology" defaultValue={session?.technology ?? ""} placeholder="Python" />
      <TextArea label="Anotações" name="notes" defaultValue={session?.notes ?? ""} />
      <ErrorNote error={save.error} />
      <Button type="submit" variant="primary" disabled={save.isPending}>
        Salvar estudo
      </Button>
    </form>
  );
}

function Sessions() {
  const [editing, setEditing] = useState<StudySession | "new" | null>(null);
  const [technology, setTechnology] = useState("");
  const query = useQuery({
    queryKey: ["sessions", technology],
    queryFn: () => api.get<StudySession[]>(`/study-sessions${technology ? `?technology=${encodeURIComponent(technology)}` : ""}`),
  });
  const technologies = useQuery({ queryKey: ["technologies"], queryFn: () => api.get<Technology[]>("/technologies") });
  const remove = useAction((id: number) => api.delete(`/study-sessions/${id}`));

  return (
    <section className="mb-10">
      <SectionTitle action={<Button variant="primary" onClick={() => setEditing("new")}>Registrar estudo</Button>}>Sessões de estudo</SectionTitle>
      {(technologies.data?.length ?? 0) > 0 && (
        <div className="mb-3 max-w-xs">
          <SelectField
            label="Filtrar por tecnologia"
            value={technology}
            onChange={(event) => setTechnology(event.target.value)}
            allowEmpty="Todas"
            choices={(technologies.data ?? []).map((tech) => [tech.name, `${tech.name} (${formatMinutes(tech.study_minutes)})`])}
          />
        </div>
      )}
      <ErrorNote error={remove.error} />
      <Loaded query={query}>
        {(sessions) =>
          sessions.length === 0 ? (
            <Empty>Nenhuma sessão encontrada. Registre quanto tempo você estudou para acompanhar sua evolução.</Empty>
          ) : (
            <ul className="divide-y divide-line border-y border-line">
              {sessions.map((session) => (
                <li key={session.id} className="flex flex-wrap items-center justify-between gap-3 py-2.5">
                  <div className="min-w-0">
                    <p>
                      <span className="font-medium">{formatMinutes(session.duration_minutes)}</span>
                      {session.technology && <span className="text-muted"> de {session.technology}</span>}
                    </p>
                    <p className="text-sm text-faint">
                      {formatDate(session.study_date)}
                      {session.journal_entry_id ? ", registrado pelo Diário" : ""}
                    </p>
                    {session.notes && <p className="mt-1 text-sm text-muted">{session.notes}</p>}
                  </div>
                  <div className="flex gap-1.5">
                    {!session.journal_entry_id && <Button onClick={() => setEditing(session)}>Editar</Button>}
                    <DeleteButton onConfirm={() => remove.mutate(session.id)} />
                  </div>
                </li>
              ))}
            </ul>
          )
        }
      </Loaded>
      {editing && (
        <Modal title={editing === "new" ? "Registrar estudo" : "Editar estudo"} onClose={() => setEditing(null)}>
          <SessionForm session={editing === "new" ? undefined : editing} onDone={() => setEditing(null)} />
        </Modal>
      )}
    </section>
  );
}

function CourseForm({ course, onDone }: { course?: Course; onDone: () => void }) {
  const save = useAction(
    (values: Record<string, unknown>) => (course ? api.patch(`/courses/${course.id}`, values) : api.post("/courses", values)),
    onDone,
  );
  return (
    <form
      className="space-y-3"
      onSubmit={(event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        save.mutate(formValues(new FormData(event.currentTarget)));
      }}
    >
      <TextField label="Nome do curso" name="title" defaultValue={course?.title} required />
      <div className="grid gap-3 sm:grid-cols-2">
        <TextField label="Plataforma ou instituição" name="provider" defaultValue={course?.provider ?? ""} />
        <SelectField label="Status" name="status" defaultValue={course?.status ?? "planned"} choices={options(COURSE_STATUS)} />
        <TextField label="Início" name="start_date" type="date" defaultValue={course?.start_date ?? ""} />
        <TextField label="Previsão de conclusão" name="target_date" type="date" defaultValue={course?.target_date ?? ""} />
      </div>
      <TextField label="Link" name="url" type="url" defaultValue={course?.url ?? ""} placeholder="https://" />
      <ErrorNote error={save.error} />
      <Button type="submit" variant="primary" disabled={save.isPending}>
        Salvar curso
      </Button>
    </form>
  );
}

function Courses() {
  const [editing, setEditing] = useState<Course | "new" | null>(null);
  const query = useQuery({ queryKey: ["courses"], queryFn: () => api.get<Course[]>("/courses") });
  const remove = useAction((id: number) => api.delete(`/courses/${id}`));
  const setStatus = useAction(({ id, status }: { id: number; status: CourseStatus }) => api.patch(`/courses/${id}`, { status }));

  return (
    <section>
      <SectionTitle action={<Button onClick={() => setEditing("new")}>Adicionar curso</Button>}>Cursos</SectionTitle>
      <ErrorNote error={remove.error ?? setStatus.error} />
      <Loaded query={query}>
        {(courses) =>
          courses.length === 0 ? (
            <Empty>Adicione os cursos que você faz em outras plataformas para acompanhá-los aqui.</Empty>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {courses.map((course) => (
                <Panel key={course.id}>
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-medium">
                      {course.url ? (
                        <a href={course.url} target="_blank" rel="noreferrer noopener" className="underline">
                          {course.title}
                        </a>
                      ) : (
                        course.title
                      )}
                    </h3>
                    <Badge tone={course.status === "completed" ? "ok" : "neutral"}>{COURSE_STATUS[course.status]}</Badge>
                  </div>
                  {course.provider && <p className="text-sm text-muted">{course.provider}</p>}
                  {course.target_date && <p className="text-sm text-faint">Previsão: {formatDate(course.target_date)}</p>}
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {course.status !== "completed" && (
                      <Button onClick={() => setStatus.mutate({ id: course.id, status: "completed" })}>Concluir</Button>
                    )}
                    <Button onClick={() => setEditing(course)}>Editar</Button>
                    <DeleteButton onConfirm={() => remove.mutate(course.id)} />
                  </div>
                </Panel>
              ))}
            </div>
          )
        }
      </Loaded>
      {editing && (
        <Modal title={editing === "new" ? "Adicionar curso" : "Editar curso"} onClose={() => setEditing(null)}>
          <CourseForm course={editing === "new" ? undefined : editing} onDone={() => setEditing(null)} />
        </Modal>
      )}
    </section>
  );
}

export function StudiesPage() {
  return (
    <>
      <PageHeader title="Estudos" description="O tempo que você dedicou e os cursos que acompanha em outras plataformas." />
      <Sessions />
      <Courses />
    </>
  );
}
