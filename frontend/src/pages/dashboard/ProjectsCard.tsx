import { ArrowRight, Code2 } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router";
import { Card, Empty } from "../../components/ui";
import { PROJECT_STATUS } from "../../lib/labels";
import type { Project, ProjectStatus } from "../../lib/types";

const ORDER: Record<ProjectStatus, number> = { in_progress: 0, planning: 1, paused: 2, completed: 3, archived: 4 };
const STATUS_TONE: Record<ProjectStatus, string> = {
  in_progress: "bg-accent/14 text-accent-ink",
  planning: "bg-raised text-muted",
  paused: "bg-raised text-muted",
  completed: "bg-ok/14 text-ok",
  archived: "bg-raised text-faint",
};
const LIMIT = 3;

export function sortProjects(projects: Project[]): Project[] {
  return projects.filter((project) => project.status !== "archived").sort((a, b) => ORDER[a.status] - ORDER[b.status] || b.progress_percent - a.progress_percent);
}

function Thumb({ project }: { project: Project }) {
  const [failed, setFailed] = useState(false);
  if (project.image_url && !failed) {
    return <img src={project.image_url} alt="" onError={() => setFailed(true)} className="size-16 shrink-0 rounded-xl border border-line object-cover" loading="lazy" />;
  }
  return (
    <span className="relative grid size-16 shrink-0 place-items-center overflow-hidden rounded-xl border border-line bg-[linear-gradient(140deg,var(--raised),var(--canvas))] text-accent-ink" aria-hidden="true">
      <span className="absolute -right-3 -top-3 size-10 rounded-full bg-[var(--glow)] blur-md" />
      <Code2 size={24} />
    </span>
  );
}

export function ProjectsCard({ projects, loading }: { projects: Project[] | undefined; loading: boolean }) {
  const list = sortProjects(projects ?? []).slice(0, LIMIT);
  return (
    <Card
      title="Seus Projetos"
      icon={<Code2 size={15} />}
      className="min-[1360px]:col-span-4"
      action={
        <Link to="/projetos" className="inline-flex items-center gap-1 text-[12.5px] text-accent-ink hover:underline">
          Ver todos <ArrowRight size={13} />
        </Link>
      }
    >
      {loading ? (
        <div className="h-48 animate-pulse rounded-xl bg-raised/60" />
      ) : list.length === 0 ? (
        <Empty action={<Link to="/projetos" className="text-accent-ink underline">Criar projeto</Link>}>Nenhum projeto cadastrado.</Empty>
      ) : (
        <ul className="space-y-3">
          {list.map((project) => (
            <li key={project.id}>
              <Link to={`/projetos/${project.id}`} className="group flex gap-3.5 rounded-xl p-1.5 -m-1.5 transition-colors hover:bg-raised/60">
                <Thumb project={project} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <p className="truncate text-[14px] font-[600] group-hover:text-accent-ink">{project.name}</p>
                    <span className={`shrink-0 rounded-md px-1.5 py-0.5 text-[11px] font-medium ${STATUS_TONE[project.status]}`}>{PROJECT_STATUS[project.status]}</span>
                  </div>
                  <p className="truncate text-[12.5px] text-muted">{project.description || project.technologies.join(", ") || "Sem descrição"}</p>
                  <div className="mt-2 flex items-center gap-2.5">
                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-raised" role="progressbar" aria-label={`Progresso de ${project.name}`} aria-valuenow={project.progress_percent} aria-valuemin={0} aria-valuemax={100}>
                      <div className="h-full rounded-full bg-accent" style={{ width: `${project.progress_percent}%` }} />
                    </div>
                    <span className="w-9 text-right text-[12px] text-muted">{project.progress_percent}%</span>
                  </div>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
