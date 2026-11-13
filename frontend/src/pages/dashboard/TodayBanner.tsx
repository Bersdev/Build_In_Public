import { ArrowRight, Check, ExternalLink, Map as MapIcon, Plus, Timer } from "lucide-react";
import { Link } from "react-router";
import { Ring } from "../../components/Charts";
import { Button, useAction } from "../../components/ui";
import { api } from "../../lib/api";
import type { NextContent } from "../../lib/dashboard";

const linkButton =
  "inline-flex h-10 w-full sm:w-auto items-center justify-center gap-2 rounded-lg px-4 text-[13.5px] transition-[background-color,border-color,filter] active:translate-y-px";
const primary = `${linkButton} bg-accent font-[600] text-on-accent shadow-[0_8px_24px_var(--glow)] hover:brightness-105`;
const ghost = `${linkButton} border border-line-strong/70 bg-surface/60 text-ink hover:bg-raised`;

/** Marca d'água "</>" e brilho: a mesma assinatura visual da logo, em tamanho grande. */
function Backdrop() {
  return (
    <div className="pointer-events-none absolute inset-0" aria-hidden="true">
      <div className="absolute -right-24 -top-32 size-[460px] rounded-full bg-[var(--glow)] blur-3xl" />
      <div className="absolute -bottom-40 left-1/3 size-[360px] rounded-full bg-[var(--glow)] opacity-60 blur-3xl" />
      <svg className="absolute -right-6 top-1/2 hidden h-[118%] -translate-y-1/2 opacity-[0.07] md:block" viewBox="0 0 32 32" fill="none">
        <path d="M11 9.5 4.5 16l6.5 6.5M21 9.5l6.5 6.5-6.5 6.5M18.6 7l-5.2 18" stroke="var(--accent)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <div
        className="absolute inset-0 opacity-[0.35]"
        style={{
          backgroundImage: "radial-gradient(var(--line) 1px, transparent 1px)",
          backgroundSize: "22px 22px",
          maskImage: "linear-gradient(90deg, transparent 35%, black 100%)",
        }}
      />
    </div>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <section
      aria-labelledby="hoje-titulo"
      className="relative overflow-hidden rounded-3xl border border-line bg-[linear-gradient(135deg,var(--raised),var(--surface)_55%)] px-6 py-7 sm:px-9 sm:py-9"
    >
      <Backdrop />
      <div className="relative">{children}</div>
    </section>
  );
}

export function TodayBanner({
  firstName,
  next,
  hasPaths,
  loading,
  onRegister,
}: {
  firstName: string;
  next: NextContent | null;
  hasPaths: boolean;
  loading: boolean;
  onRegister: () => void;
}) {
  const complete = useAction((itemId: number) => api.patch(`/learning-items/${itemId}`, { completed: true }));
  const heading = (
    <>
      <p className="text-[13.5px] text-muted">Olá, {firstName}!</p>
      <h1 id="hoje-titulo" className="mt-1 text-[26px] font-[650] leading-[1.1] tracking-[-0.03em] text-ink sm:text-[34px] xl:text-[40px]">
        Hoje é dia de aprender:
      </h1>
    </>
  );

  if (loading) {
    return (
      <Shell>
        {heading}
        <div className="mt-4 h-11 w-2/3 max-w-md animate-pulse rounded-lg bg-raised" />
        <div className="mt-3 h-4 w-1/2 max-w-sm animate-pulse rounded bg-raised" />
      </Shell>
    );
  }

  if (!next) {
    return (
      <Shell>
        {heading}
        <p className="mt-3 max-w-[22ch] text-[28px] font-[650] leading-[1.1] tracking-[-0.03em] text-accent-ink sm:text-[40px]">
          {hasPaths ? "Tudo em dia por aqui." : "Seu primeiro objetivo."}
        </p>
        <p className="mt-3 max-w-[60ch] text-[15px] text-muted">
          {hasPaths
            ? "Você concluiu todos os conteúdos dos seus roadmaps. Que tal definir o próximo objetivo de aprendizagem?"
            : "Monte um roadmap com etapas e conteúdos, ou importe um CSV. O próximo conteúdo a estudar aparece aqui todos os dias."}
        </p>
        <div className="mt-6 flex flex-wrap gap-2.5">
          <Link to="/roadmaps" className={primary}>
            <Plus size={17} /> {hasPaths ? "Criar novo roadmap" : "Criar meu roadmap"}
          </Link>
          <Link to="/metas" className={ghost}>
            Definir uma meta
          </Link>
        </div>
      </Shell>
    );
  }

  const { path, stage, stageIndex, item } = next;
  const position = stage.items.indexOf(item) + 1;
  const description = item.notes?.trim() || `Conteúdo ${position} de ${stage.items.length} da etapa “${stage.title}”.`;
  return (
    <Shell>
      <div className="flex flex-col gap-8 md:flex-row md:items-center md:justify-between">
        <div className="min-w-0 flex-1">
          {heading}
          <p className="mt-2 max-w-[24ch] text-[30px] font-[680] leading-[1.06] tracking-[-0.035em] text-accent-ink [overflow-wrap:anywhere] sm:text-[44px] xl:text-[52px]">
            {item.title}
          </p>
          <p className="mt-3 max-w-[62ch] whitespace-pre-line text-[15px] text-muted [overflow-wrap:anywhere] line-clamp-3">{description}</p>
          <p className="mt-4 flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] text-faint">
            <MapIcon size={15} className="text-accent-ink" aria-hidden="true" />
            <span className="text-ink">{path.title}</span>
            <span aria-hidden="true">·</span>
            <span>
              Etapa {stageIndex + 1} de {path.stages.length}: {stage.title}
            </span>
          </p>
          <div className="mt-6 flex flex-wrap gap-2.5">
            <Link to={`/roadmaps?trilha=${path.id}`} className={primary}>
              Continuar aprendizado <ArrowRight size={17} />
            </Link>
            {item.url && (
              <a href={item.url} target="_blank" rel="noreferrer noopener" className={ghost}>
                Abrir material <ExternalLink size={15} />
              </a>
            )}
            <Button className="h-10! w-full rounded-lg! px-4! text-[13.5px]! sm:w-auto" onClick={() => complete.mutate(item.id)} disabled={complete.isPending}>
              <Check size={16} /> {complete.isPending ? "Salvando..." : "Marcar como concluído"}
            </Button>
            <Button className="h-10! w-full rounded-lg! px-4! text-[13.5px]! sm:w-auto" onClick={onRegister}>
              <Timer size={16} /> Registrar estudo
            </Button>
          </div>
        </div>
        <div className="flex items-center gap-4 self-start md:flex-col md:self-center">
          <Ring value={path.progress_percent} size={132} stroke={10} label={`Progresso do roadmap ${path.title}`}>
            <span>
              <span className="block text-[26px] font-[680] leading-none tracking-[-0.03em]">{path.progress_percent}%</span>
              <span className="mt-1 block text-[11px] text-faint">do roadmap</span>
            </span>
          </Ring>
          <p className="max-w-[16ch] text-[12px] text-muted md:text-center">
            {path.completed_items} de {path.total_items} conteúdos concluídos
          </p>
        </div>
      </div>
    </Shell>
  );
}
