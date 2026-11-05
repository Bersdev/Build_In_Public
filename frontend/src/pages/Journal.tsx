import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useState, type FormEvent } from "react";
import { Badge, Button, DeleteButton, Empty, ErrorNote, Loaded, Modal, PageHeader, SelectField, TextArea, TextField, useAction } from "../components/ui";
import { api, queryString } from "../lib/api";
import { formValues, formatDate, formatMinutes, today, toIsoDate } from "../lib/format";
import type { CalendarDay, JournalEntry, Project, Technology } from "../lib/types";

function EntryForm({ entry, onDone }: { entry?: JournalEntry; onDone: () => void }) {
  const projects = useQuery({ queryKey: ["projects"], queryFn: () => api.get<Project[]>("/projects") });
  const save = useAction(
    (values: Record<string, unknown>) => (entry ? api.patch(`/journal/${entry.id}`, values) : api.post("/journal", values)),
    onDone,
  );
  return (
    <form
      className="space-y-3"
      onSubmit={(event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const values = formValues(new FormData(event.currentTarget), {
          numbers: ["duration_minutes", "project_id"],
          lists: ["technologies", "tags", "categories"],
        });
        save.mutate(values);
      }}
    >
      <TextField label="Título" name="title" defaultValue={entry?.title} required />
      <div className="grid gap-3 sm:grid-cols-3">
        <TextField label="Data" name="entry_date" type="date" max={today()} defaultValue={entry?.entry_date ?? today()} required />
        <TextField label="Tempo dedicado (minutos)" name="duration_minutes" type="number" min={1} max={1440} defaultValue={entry?.duration_minutes ?? ""} />
        <TextField label="Linguagem" name="language" defaultValue={entry?.language ?? ""} placeholder="Python" />
      </div>
      <TextArea label="Descrição" name="description" defaultValue={entry?.description ?? ""} />
      <TextArea label="Principais aprendizados" name="key_learnings" defaultValue={entry?.key_learnings ?? ""} />
      <div className="grid gap-3 sm:grid-cols-3">
        <TextArea label="Dificuldades" name="difficulties" defaultValue={entry?.difficulties ?? ""} />
        <TextArea label="Erros identificados" name="errors" defaultValue={entry?.errors ?? ""} />
        <TextArea label="Soluções encontradas" name="solutions" defaultValue={entry?.solutions ?? ""} />
      </div>
      <TextField label="Tecnologias ou assuntos" name="technologies" defaultValue={entry?.technologies.join(", ")} hint="Separe por vírgulas. A primeira recebe o tempo dedicado." />
      <div className="grid gap-3 sm:grid-cols-2">
        <TextField label="Tags" name="tags" defaultValue={entry?.tags.join(", ")} hint="Separe por vírgulas." />
        <TextField label="Categorias" name="categories" defaultValue={entry?.categories.join(", ")} hint="Separe por vírgulas." />
      </div>
      <SelectField
        label="Projeto relacionado"
        name="project_id"
        defaultValue={entry?.project_id ?? ""}
        allowEmpty="Nenhum"
        choices={(projects.data ?? []).map((project) => [String(project.id), project.name])}
      />
      <ErrorNote error={save.error} />
      <Button type="submit" variant="primary" disabled={save.isPending}>
        Salvar registro
      </Button>
    </form>
  );
}

function Passage({ label, text }: { label: string; text: string | null }) {
  if (!text) return null;
  return (
    <div>
      <h4 className="text-sm text-muted">{label}</h4>
      <p className="prose-note">{text}</p>
    </div>
  );
}

function EntryRow({ entry, onEdit, onDelete }: { entry: JournalEntry; onEdit: () => void; onDelete: () => void }) {
  const [open, setOpen] = useState(false);
  const labels = [...new Set([...entry.technologies, ...entry.tags, ...entry.categories])].filter(
    (label) => label !== entry.language,
  );
  return (
    <li className="py-3">
      <div className="grid gap-x-5 sm:grid-cols-[130px_1fr]">
        <time className="pt-0.5 text-sm text-faint" dateTime={entry.entry_date}>
          {formatDate(entry.entry_date)}
        </time>
        <div className="min-w-0">
          <button type="button" aria-expanded={open} onClick={() => setOpen(!open)} className="text-left font-serif text-xl leading-snug hover:text-accent-ink">
            {entry.title}
          </button>
          <div className="mt-1 flex flex-wrap items-center gap-1.5 text-sm text-muted">
            {entry.duration_minutes && <span>{formatMinutes(entry.duration_minutes)}</span>}
            {entry.language && <Badge tone="accent">{entry.language}</Badge>}
            {labels.map((label) => (
              <Badge key={label}>{label}</Badge>
            ))}
            {entry.project_name && <span>Projeto: {entry.project_name}</span>}
          </div>
          {!open && (entry.key_learnings ?? entry.description) && (
            <p className="mt-1 line-clamp-2 max-w-[70ch] text-muted">{entry.key_learnings ?? entry.description}</p>
          )}
          {open && (
            <div className="mt-3 max-w-[70ch] space-y-3">
              <Passage label="Descrição" text={entry.description} />
              <Passage label="Principais aprendizados" text={entry.key_learnings} />
              <Passage label="Dificuldades" text={entry.difficulties} />
              <Passage label="Erros identificados" text={entry.errors} />
              <Passage label="Soluções encontradas" text={entry.solutions} />
              <div className="flex gap-1.5">
                <Button onClick={onEdit}>Editar</Button>
                <DeleteButton onConfirm={onDelete} />
              </div>
            </div>
          )}
        </div>
      </div>
    </li>
  );
}

function Calendar({ selected, onSelect }: { selected: string; onSelect: (day: string) => void }) {
  const [cursor, setCursor] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() + 1 };
  });
  const query = useQuery({
    queryKey: ["journal", "calendar", cursor],
    queryFn: () => api.get<CalendarDay[]>(`/journal/calendar${queryString(cursor)}`),
  });
  const counts = new Map((query.data ?? []).map((day) => [day.date, day.count]));
  const first = new Date(cursor.year, cursor.month - 1, 1);
  const days = new Date(cursor.year, cursor.month, 0).getDate();
  const leading = (first.getDay() + 6) % 7;
  const move = (delta: number) => {
    const next = new Date(cursor.year, cursor.month - 1 + delta, 1);
    setCursor({ year: next.getFullYear(), month: next.getMonth() + 1 });
  };
  return (
    <div className="mb-5 max-w-md">
      <div className="mb-2 flex items-center justify-between">
        <Button aria-label="Mês anterior" onClick={() => move(-1)}>
          <ChevronLeft size={16} />
        </Button>
        <h2 className="font-serif text-lg">{first.toLocaleDateString("pt-BR", { month: "long", year: "numeric" })}</h2>
        <Button aria-label="Próximo mês" onClick={() => move(1)}>
          <ChevronRight size={16} />
        </Button>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center text-xs text-faint">
        {["seg", "ter", "qua", "qui", "sex", "sáb", "dom"].map((day) => (
          <span key={day}>{day}</span>
        ))}
      </div>
      <div className="mt-1 grid grid-cols-7 gap-1">
        {Array.from({ length: leading }, (_, index) => (
          <span key={`vazio-${index}`} />
        ))}
        {Array.from({ length: days }, (_, index) => {
          const iso = toIsoDate(new Date(cursor.year, cursor.month - 1, index + 1));
          const count = counts.get(iso) ?? 0;
          return (
            <button
              key={iso}
              type="button"
              aria-pressed={selected === iso}
              aria-label={`${formatDate(iso)}: ${count} ${count === 1 ? "registro" : "registros"}`}
              disabled={count === 0}
              onClick={() => onSelect(selected === iso ? "" : iso)}
              className={`h-10 rounded-md text-sm ${
                selected === iso
                  ? "bg-accent text-on-accent"
                  : count
                    ? "bg-raised font-medium text-accent-ink hover:brightness-125"
                    : "text-faint"
              }`}
            >
              {index + 1}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function JournalPage() {
  const [editing, setEditing] = useState<JournalEntry | "new" | null>(null);
  const [showCalendar, setShowCalendar] = useState(false);
  const [filters, setFilters] = useState({ q: "", technology: "", date_from: "", date_to: "" });
  const [day, setDay] = useState("");
  const params = day ? { ...filters, date_from: day, date_to: day } : filters;
  const query = useQuery({
    queryKey: ["journal", params],
    queryFn: () => api.get<JournalEntry[]>(`/journal${queryString(params)}`),
  });
  const technologies = useQuery({ queryKey: ["technologies"], queryFn: () => api.get<Technology[]>("/technologies") });
  const remove = useAction((id: number) => api.delete(`/journal/${id}`));
  const set = (field: keyof typeof filters) => (event: { target: { value: string } }) =>
    setFilters({ ...filters, [field]: event.target.value });
  const filtering = Object.values(params).some(Boolean);

  return (
    <>
      <PageHeader
        title="Diário de programação"
        description="Sua memória técnica: o que estudou, os erros que encontrou e como resolveu."
        action={
          <Button variant="primary" onClick={() => setEditing("new")}>
            Novo registro
          </Button>
        }
      />
      <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr_1fr]">
        <TextField label="Pesquisar" type="search" value={filters.q} onChange={set("q")} placeholder="Erro, assunto, solução..." />
        <SelectField
          label="Tecnologia"
          value={filters.technology}
          onChange={set("technology")}
          allowEmpty="Todas"
          choices={(technologies.data ?? []).map((tech) => [tech.name, tech.name])}
        />
        <TextField label="De" type="date" value={filters.date_from} onChange={set("date_from")} />
        <TextField label="Até" type="date" value={filters.date_to} onChange={set("date_to")} />
      </div>
      <div className="mb-4">
        <Button aria-pressed={showCalendar} onClick={() => setShowCalendar(!showCalendar)}>
          {showCalendar ? "Ocultar calendário" : "Ver calendário"}
        </Button>
      </div>
      {showCalendar && <Calendar selected={day} onSelect={setDay} />}
      <ErrorNote error={remove.error} />
      <Loaded query={query}>
        {(entries) =>
          entries.length === 0 ? (
            <Empty>{filtering ? "Nenhum registro encontrado com esses filtros." : "Escreva o primeiro registro sobre o que você estudou hoje."}</Empty>
          ) : (
            <ul className="divide-y divide-line border-y border-line">
              {entries.map((entry) => (
                <EntryRow key={entry.id} entry={entry} onEdit={() => setEditing(entry)} onDelete={() => remove.mutate(entry.id)} />
              ))}
            </ul>
          )
        }
      </Loaded>
      {editing && (
        <Modal title={editing === "new" ? "Novo registro" : "Editar registro"} onClose={() => setEditing(null)}>
          <EntryForm entry={editing === "new" ? undefined : editing} onDone={() => setEditing(null)} />
        </Modal>
      )}
    </>
  );
}
