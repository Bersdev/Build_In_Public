import {
  ArrowRight,
  BookOpen,
  Flame,
  FolderKanban,
  ListChecks,
  Map as MapIcon,
  Menu,
  NotebookPen,
  Target,
  Trophy,
  X,
  type LucideIcon,
} from "lucide-react";
import { useState, type ReactNode } from "react";
import { Link } from "react-router";
import { Logo, LogoMark } from "../components/Layout";

const NAV = [
  ["#recursos", "Recursos"],
  ["#como-funciona", "Como funciona"],
  ["#evolucao", "Evolução"],
] as const;

const FEATURES: [LucideIcon, string, string][] = [
  [NotebookPen, "Diário de aprendizagem", "Escreva o que aprendeu, as dificuldades e as próximas etapas. Tudo pesquisável por data, tecnologia e projeto."],
  [BookOpen, "Sessões e cursos", "Registre cada sessão de estudo e acompanhe o progresso dos cursos em andamento."],
  [MapIcon, "Roadmaps", "Monte trilhas com etapas e veja quanto falta para cada objetivo."],
  [FolderKanban, "Projetos", "Documente o que está construindo, com links do GitHub, status e histórico de mudanças."],
  [ListChecks, "Tarefas em Kanban", "Organize o trabalho em lista ou quadro, com prazos e prioridades."],
  [Target, "Metas", "Defina metas de horas, projetos ou cursos. O progresso é calculado sozinho."],
];

function useMenu() {
  const [open, setOpen] = useState(false);
  return { open, toggle: () => setOpen((value) => !value), close: () => setOpen(false) };
}

function Navbar() {
  const menu = useMenu();
  return (
    <header className="sticky top-0 z-30 border-b border-line/70 bg-canvas/80 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-[1200px] items-center justify-between px-4 sm:px-6">
        <Link to="/" aria-label="DevTrack, início">
          <Logo />
        </Link>
        <nav aria-label="Seções" className="hidden items-center gap-1 md:flex">
          {NAV.map(([href, label]) => (
            <a key={href} href={href} className="rounded-md px-3 py-1.5 text-[13px] text-muted transition-colors hover:text-ink">
              {label}
            </a>
          ))}
        </nav>
        <div className="hidden items-center gap-2 md:flex">
          <Link to="/entrar" className="rounded-md px-3 py-1.5 text-[13px] text-muted transition-colors hover:text-ink">
            Entrar
          </Link>
          <Link to="/cadastro" className="rounded-full bg-ink px-4 py-1.5 text-[13px] font-[560] text-canvas transition-opacity hover:opacity-90">
            Criar conta
          </Link>
        </div>
        <button
          type="button"
          className="rounded-md p-1.5 text-muted hover:bg-raised md:hidden"
          aria-label={menu.open ? "Fechar menu" : "Abrir menu"}
          aria-expanded={menu.open}
          onClick={menu.toggle}
        >
          {menu.open ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>
      {menu.open && (
        <nav aria-label="Menu" className="space-y-1 border-t border-line px-4 py-3 md:hidden">
          {NAV.map(([href, label]) => (
            <a key={href} href={href} onClick={menu.close} className="block rounded-md px-2 py-2 text-muted hover:bg-raised hover:text-ink">
              {label}
            </a>
          ))}
          <div className="flex gap-2 pt-2">
            <Link to="/entrar" className="flex-1 rounded-md border border-line py-2 text-center text-sm">
              Entrar
            </Link>
            <Link to="/cadastro" className="flex-1 rounded-md bg-accent py-2 text-center text-sm font-[560] text-on-accent">
              Criar conta
            </Link>
          </div>
        </nav>
      )}
    </header>
  );
}

function PrimaryCta({ children = "Começar grátis" }: { children?: ReactNode }) {
  return (
    <Link
      to="/cadastro"
      className="group inline-flex h-10 items-center gap-2 rounded-md bg-accent px-4 text-sm font-[560] text-on-accent shadow-[inset_0_-1px_0_rgb(0_0_0/0.2),0_0_24px_var(--glow)] transition hover:brightness-105"
    >
      {children}
      <ArrowRight size={16} className="transition-transform group-hover:translate-x-0.5" />
    </Link>
  );
}

/** Ilustração do produto feita em HTML, com dados de exemplo identificados como tal. */
function ProductPreview() {
  const week = [35, 60, 20, 90, 75, 45, 110];
  const days = ["S", "T", "Q", "Q", "S", "S", "D"];
  const max = Math.max(...week);
  return (
    <div className="relative" aria-label="Exemplo do painel do DevTrack" role="img">
      <div className="absolute -inset-x-10 -top-10 bottom-0 bg-[radial-gradient(50%_60%_at_50%_0%,var(--glow),transparent)]" />
      <div className="relative overflow-hidden rounded-xl border border-line-strong bg-surface shadow-[0_40px_120px_-20px_rgb(0_0_0/0.7)]">
        <div className="flex items-center gap-1.5 border-b border-line px-4 py-2.5">
          <span className="size-2.5 rounded-full bg-raised" />
          <span className="size-2.5 rounded-full bg-raised" />
          <span className="size-2.5 rounded-full bg-raised" />
          <span className="ml-3 text-[11px] text-faint">Dashboard · dados de exemplo</span>
        </div>
        <div className="grid gap-px bg-line sm:grid-cols-[180px_1fr]">
          <div className="hidden space-y-1 bg-surface p-3 sm:block">
            {["Dashboard", "Diário", "Estudos", "Projetos", "Tarefas", "Metas"].map((item, index) => (
              <div key={item} className={`rounded-md px-2.5 py-1.5 text-[12px] ${index === 0 ? "bg-raised text-ink" : "text-faint"}`}>
                {item}
              </div>
            ))}
          </div>
          <div className="space-y-3 bg-canvas p-4 sm:p-5">
            <div className="grid grid-cols-3 gap-3">
              {[
                ["Esta semana", "7h 15min"],
                ["Sequência", "12 dias"],
                ["Nível", "4 · 680 XP"],
              ].map(([label, value]) => (
                <div key={label} className="rounded-lg border border-line bg-surface p-3">
                  <p className="text-[10px] uppercase tracking-[0.08em] text-faint">{label}</p>
                  <p className="num mt-1 text-[12px] sm:text-lg">{value}</p>
                </div>
              ))}
            </div>
            <div className="rounded-lg border border-line bg-surface p-3">
              <p className="mb-3 text-[12px] text-muted">Minutos por dia</p>
              <div className="flex h-28 items-end gap-2">
                {week.map((value, index) => (
                  <div key={index} className="flex flex-1 flex-col items-center gap-1.5">
                    <div
                      className={`w-full rounded-sm ${index === week.length - 1 ? "bg-accent" : "bg-chart/45"}`}
                      style={{ height: `${(value / max) * 100}%` }}
                    />
                    <span className="text-[10px] text-faint">{days[index]}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg border border-line bg-surface p-3">
                <p className="text-[12px] text-muted">Meta: 40h de Python</p>
                <div className="mt-2 h-1 rounded-full bg-raised">
                  <div className="h-full w-[68%] rounded-full bg-chart" />
                </div>
                <p className="num mt-1.5 text-[11px] text-faint">27h / 40h</p>
              </div>
              <div className="rounded-lg border border-line bg-surface p-3">
                <p className="text-[12px] text-muted">Última conquista</p>
                <p className="mt-1.5 flex items-center gap-1.5 text-[13px]">
                  <Trophy size={14} className="text-accent-ink" /> 7 dias seguidos
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function SectionHeading({ eyebrow, title, text }: { eyebrow: string; title: ReactNode; text: string }) {
  return (
    <div className="max-w-2xl">
      <p className="num text-[12px] text-accent-ink">{eyebrow}</p>
      <h2 className="mt-3 font-serif text-[32px] leading-[1.1] sm:text-[44px]">{title}</h2>
      <p className="mt-4 text-[17px] text-muted">{text}</p>
    </div>
  );
}

const FOOTER_LINKS: [string, [string, string][]][] = [
  ["Produto", [["#recursos", "Recursos"], ["#como-funciona", "Como funciona"], ["#evolucao", "Evolução"]]],
  ["Conta", [["/cadastro", "Criar conta"], ["/entrar", "Entrar"], ["/recuperar-senha", "Recuperar senha"]]],
];

function Footer() {
  return (
    <footer className="border-t border-line">
      <div className="mx-auto grid max-w-[1200px] gap-10 px-4 py-14 sm:px-6 md:grid-cols-[1.5fr_1fr_1fr]">
        <div>
          <Logo />
          <p className="mt-4 max-w-xs text-sm text-muted">
            Documente sua jornada. Acompanhe sua evolução. Construa seu futuro.
          </p>
        </div>
        {FOOTER_LINKS.map(([title, links]) => (
          <div key={title}>
            <p className="text-[12px] font-medium uppercase tracking-[0.08em] text-faint">{title}</p>
            <ul className="mt-4 space-y-2.5">
              {links.map(([href, label]) => (
                <li key={href}>
                  {href.startsWith("#") ? (
                    <a href={href} className="text-sm text-muted hover:text-ink">
                      {label}
                    </a>
                  ) : (
                    <Link to={href} className="text-sm text-muted hover:text-ink">
                      {label}
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="overflow-hidden border-t border-line">
        <div className="mx-auto flex max-w-[1200px] flex-wrap items-end justify-between gap-4 px-4 pt-8 sm:px-6">
          <p className="pb-6 text-[12px] text-faint">© {new Date().getFullYear()} DevTrack</p>
          <p
            aria-hidden="true"
            className="select-none bg-gradient-to-b from-line-strong to-transparent bg-clip-text font-serif text-[18vw] leading-[0.8] text-transparent md:text-[160px]"
          >
            build.
          </p>
        </div>
      </div>
    </footer>
  );
}

export function LandingPage() {
  return (
    <div className="min-h-screen overflow-x-hidden">
      <Navbar />
      <main>
        <section className="relative">
          <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(var(--line)_1px,transparent_1px),linear-gradient(90deg,var(--line)_1px,transparent_1px)] bg-[size:64px_64px] opacity-30 [mask-image:radial-gradient(60%_50%_at_50%_0%,black,transparent)]" />
          <div className="relative mx-auto max-w-[1200px] px-4 pb-20 pt-16 sm:px-6 sm:pt-24">
            <div className="rise max-w-3xl">
              <p className="inline-flex items-center gap-2 rounded-full border border-line bg-surface px-3 py-1 text-[12px] text-muted">
                <Flame size={13} className="text-accent-ink" /> Para quem aprende programação em público
              </p>
              <h1 className="mt-6 font-serif text-[44px] leading-[1.02] sm:text-[64px] lg:text-[72px]">
                Sua jornada de estudos, <span className="text-faint">medida de verdade.</span>
              </h1>
              <p className="mt-6 max-w-xl text-[17px] text-muted sm:text-lg">
                Registre sessões, escreva o diário, acompanhe projetos e veja sua evolução em gráficos calculados a partir do que você realmente fez.
              </p>
              <div className="mt-8 flex flex-wrap items-center gap-3">
                <PrimaryCta />
                <Link to="/entrar" className="inline-flex h-10 items-center rounded-md border border-line px-4 text-sm text-ink transition-colors hover:border-line-strong hover:bg-raised">
                  Já tenho conta
                </Link>
              </div>
            </div>
            <div className="rise mt-16 [animation-delay:120ms]">
              <ProductPreview />
            </div>
          </div>
        </section>

        <section id="recursos" className="scroll-mt-16 border-t border-line">
          <div className="mx-auto max-w-[1200px] px-4 py-24 sm:px-6">
            <SectionHeading
              eyebrow="01 · Recursos"
              title="Tudo o que você estuda, em um só lugar."
              text="Cada área conversa com as outras: o tempo do diário vira sessão de estudo, as horas alimentam as metas e cada entrega soma no seu nível."
            />
            <div className="mt-14 grid gap-px overflow-hidden rounded-xl border border-line bg-line sm:grid-cols-2 lg:grid-cols-3">
              {FEATURES.map(([Icon, title, text]) => (
                <article key={title} className="bg-surface p-6 transition-colors hover:bg-raised/60">
                  <span className="grid size-9 place-items-center rounded-md border border-line bg-canvas text-accent-ink">
                    <Icon size={17} />
                  </span>
                  <h3 className="mt-5 text-[15px] font-[560]">{title}</h3>
                  <p className="mt-2 text-sm text-muted">{text}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="como-funciona" className="scroll-mt-16 border-t border-line">
          <div className="mx-auto grid max-w-[1200px] gap-14 px-4 py-24 sm:px-6 lg:grid-cols-2">
            <SectionHeading
              eyebrow="02 · Como funciona"
              title="Três hábitos. Nenhum número inventado."
              text="O DevTrack não pede que você preencha indicadores. Eles nascem dos registros que você já faria."
            />
            <ol className="space-y-3">
              {[
                ["Registre", "Anote a sessão de estudo ou escreva no diário o que aprendeu hoje, com o tempo dedicado."],
                ["Construa", "Ligue seus estudos a projetos, tarefas e roadmaps. Cada entrega fica documentada."],
                ["Acompanhe", "Veja horas por tecnologia, sequência de dias, metas e conquistas atualizadas na hora."],
              ].map(([title, text], index) => (
                <li key={title} className="flex gap-4 rounded-xl border border-line bg-surface p-5">
                  <span className="num grid size-8 shrink-0 place-items-center rounded-md bg-raised text-[13px] text-accent-ink">
                    {index + 1}
                  </span>
                  <div>
                    <h3 className="text-[15px] font-[560]">{title}</h3>
                    <p className="mt-1 text-sm text-muted">{text}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section id="evolucao" className="scroll-mt-16 border-t border-line">
          <div className="mx-auto max-w-[1200px] px-4 py-24 sm:px-6">
            <SectionHeading
              eyebrow="03 · Evolução"
              title={
                <>
                  Ganhe XP estudando. <span className="text-faint">Suba de nível construindo.</span>
                </>
              }
              text="Pontos por sessões, entradas de diário, tarefas e projetos concluídos. Conquistas aparecem quando você atinge marcos reais, como sete dias seguidos de estudo."
            />
            <div className="mt-12 grid gap-3 sm:grid-cols-3">
              {[
                ["Sequência de dias", "Conta dias seguidos com estudo, terminando hoje ou ontem."],
                ["Níveis progressivos", "Cada nível pede um pouco mais de XP que o anterior."],
                ["Histórico completo", "O XP é um histórico de eventos: nada some nem é contado duas vezes."],
              ].map(([title, text]) => (
                <div key={title} className="rounded-xl border border-line bg-surface p-5">
                  <h3 className="text-[15px] font-[560]">{title}</h3>
                  <p className="mt-2 text-sm text-muted">{text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="border-t border-line">
          <div className="mx-auto max-w-[1200px] px-4 py-24 sm:px-6">
            <div className="relative overflow-hidden rounded-2xl border border-line-strong bg-surface px-6 py-16 text-center sm:px-16">
              <div className="absolute inset-0 bg-[radial-gradient(50%_80%_at_50%_100%,var(--glow),transparent)]" />
              <div className="relative">
                <LogoMark size={40} />
                <h2 className="mx-auto mt-6 max-w-2xl font-serif text-[32px] leading-[1.1] sm:text-[48px]">
                  Comece hoje a documentar sua jornada.
                </h2>
                <p className="mx-auto mt-4 max-w-md text-muted">Gratuito. Leva menos de um minuto para criar a conta.</p>
                <div className="mt-8 flex justify-center">
                  <PrimaryCta>Criar minha conta</PrimaryCta>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
