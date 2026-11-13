import { useQuery } from "@tanstack/react-query";
import { Search } from "lucide-react";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { api } from "../lib/api";
import type { Course, Goal, LearningPath, Project, Task } from "../lib/types";

interface Result {
  key: string;
  kind: string;
  title: string;
  detail: string | null;
  to: string;
}

/** Sem acentos e em minúsculas: "Programação" encontra "programacao". */
export function normalize(text: string): string {
  return text.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();
}

export function searchResults(
  term: string,
  data: { projects?: Project[]; paths?: LearningPath[]; courses?: Course[]; tasks?: Task[]; goals?: Goal[] },
  limit = 8,
): Result[] {
  const needle = normalize(term.trim());
  if (!needle) return [];
  const matches = (...texts: (string | null | undefined)[]) => texts.some((text) => text && normalize(text).includes(needle));
  const all: Result[] = [
    ...(data.paths ?? [])
      .filter((path) => matches(path.title, path.technology, path.description))
      .map((path) => ({ key: `r${path.id}`, kind: "Roadmap", title: path.title, detail: path.technology, to: `/roadmaps?trilha=${path.id}` })),
    ...(data.projects ?? [])
      .filter((project) => matches(project.name, project.description, ...project.technologies))
      .map((project) => ({ key: `p${project.id}`, kind: "Projeto", title: project.name, detail: project.technologies.join(", ") || null, to: `/projetos/${project.id}` })),
    ...(data.courses ?? [])
      .filter((course) => matches(course.title, course.provider))
      .map((course) => ({ key: `c${course.id}`, kind: "Curso", title: course.title, detail: course.provider, to: "/estudos" })),
    ...(data.tasks ?? [])
      .filter((task) => matches(task.title, task.technology, task.project_name))
      .map((task) => ({ key: `t${task.id}`, kind: "Tarefa", title: task.title, detail: task.project_name, to: "/tarefas" })),
    ...(data.goals ?? [])
      .filter((goal) => matches(goal.title, goal.description))
      .map((goal) => ({ key: `g${goal.id}`, kind: "Meta", title: goal.title, detail: null, to: "/metas" })),
  ];
  return all.slice(0, limit);
}

/** Busca nos dados da própria pessoa: roadmaps, projetos, cursos, tarefas e metas. */
export function GlobalSearch() {
  const [term, setTerm] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const navigate = useNavigate();
  const listId = useId();
  const box = useRef<HTMLDivElement>(null);
  // Só busca os dados quando a pessoa usa o campo; depois disso, o cache do React Query responde.
  const enabled = open || term.length > 0;
  const projects = useQuery({ queryKey: ["projects"], queryFn: () => api.get<Project[]>("/projects"), enabled });
  const paths = useQuery({ queryKey: ["paths"], queryFn: () => api.get<LearningPath[]>("/learning-paths"), enabled });
  const courses = useQuery({ queryKey: ["courses"], queryFn: () => api.get<Course[]>("/courses"), enabled });
  const tasks = useQuery({ queryKey: ["tasks", "all"], queryFn: () => api.get<Task[]>("/tasks?view=all"), enabled });
  const goals = useQuery({ queryKey: ["goals"], queryFn: () => api.get<Goal[]>("/goals"), enabled });
  const results = useMemo(
    () => searchResults(term, { projects: projects.data, paths: paths.data, courses: courses.data, tasks: tasks.data, goals: goals.data }),
    [term, projects.data, paths.data, courses.data, tasks.data, goals.data],
  );

  useEffect(() => {
    const close = (event: MouseEvent) => {
      if (!box.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  function go(result: Result) {
    setOpen(false);
    setTerm("");
    navigate(result.to);
  }

  const showList = open && term.trim().length > 0;
  return (
    <div ref={box} className="relative w-full max-w-[460px]">
      <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-faint" aria-hidden="true" />
      <input
        type="search"
        role="combobox"
        aria-expanded={showList}
        aria-controls={listId}
        aria-label="Buscar roadmaps, projetos, cursos, tarefas e metas"
        placeholder="Buscar roadmaps, projetos, cursos..."
        value={term}
        onFocus={() => setOpen(true)}
        onChange={(event) => {
          setTerm(event.target.value);
          setActive(0);
          setOpen(true);
        }}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown") setActive((index) => Math.min(index + 1, results.length - 1));
          else if (event.key === "ArrowUp") setActive((index) => Math.max(index - 1, 0));
          else if (event.key === "Enter" && results[active]) go(results[active]);
          else if (event.key === "Escape") setOpen(false);
          else return;
          event.preventDefault();
        }}
        className="h-10 w-full rounded-lg border border-line bg-surface pl-9 pr-3 text-[13px] text-ink transition-colors placeholder:text-faint hover:border-line-strong focus-visible:border-transparent"
      />
      {showList && (
        <ul id={listId} role="listbox" className="absolute left-0 right-0 top-12 z-30 overflow-hidden rounded-lg border border-line bg-surface py-1 shadow-[0_12px_32px_rgb(0_0_0/0.45)]">
          {results.length === 0 ? (
            <li className="px-3 py-2.5 text-[13px] text-muted">Nada encontrado para “{term.trim()}”.</li>
          ) : (
            results.map((result, index) => (
              <li
                key={result.key}
                role="option"
                aria-selected={index === active}
                onMouseEnter={() => setActive(index)}
                onMouseDown={(event) => {
                  event.preventDefault();
                  go(result);
                }}
                className={`flex cursor-pointer items-center justify-between gap-3 px-3 py-2 text-[13px] ${index === active ? "bg-raised" : ""}`}
              >
                <span className="min-w-0">
                  <span className="block truncate text-ink">{result.title}</span>
                  {result.detail && <span className="block truncate text-xs text-faint">{result.detail}</span>}
                </span>
                <span className="shrink-0 rounded bg-raised px-1.5 py-0.5 text-[11px] text-muted">{result.kind}</span>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}
