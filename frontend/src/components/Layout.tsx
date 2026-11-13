import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  BookOpen,
  ChevronUp,
  FolderKanban,
  House,
  ListChecks,
  LogOut,
  Map as MapIcon,
  Menu,
  Moon,
  NotebookPen,
  Rocket,
  Settings as SettingsIcon,
  Sun,
  Target,
  UserRound,
  X,
} from "lucide-react";
import { useEffect, useRef, useState, type ComponentType } from "react";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router";
import { api } from "../lib/api";
import { useMe } from "../lib/auth";
import { EXPERIENCE } from "../lib/labels";
import type { Gamification, Settings } from "../lib/types";
import { GlobalSearch } from "./Search";

const MAIN: [string, string, ComponentType<{ size?: number }>][] = [
  ["/", "Início", House],
  ["/roadmaps", "Roadmaps", MapIcon],
  ["/projetos", "Projetos", FolderKanban],
  ["/tarefas", "Tarefas", ListChecks],
  ["/metas", "Metas e evolução", Target],
  ["/estudos", "Estudos", BookOpen],
  ["/diario", "Diário", NotebookPen],
  ["/configuracoes", "Configurações", SettingsIcon],
];

/** Símbolo da DevTrack: o "</>" do código sobre o verde-limão da marca. Legível de 16 px para cima. */
export function LogoMark({ size = 22 }: { size?: number }) {
  return (
    <span
      className="grid shrink-0 place-items-center rounded-[28%] bg-accent shadow-[0_0_0_1px_rgb(0_0_0/0.25),0_6px_18px_var(--glow)]"
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      <svg width={size * 0.7} height={size * 0.7} viewBox="0 0 32 32" fill="none">
        <path
          d="M11 9.5 4.5 16l6.5 6.5M21 9.5l6.5 6.5-6.5 6.5M18.6 7l-5.2 18"
          stroke="var(--on-accent)"
          strokeWidth="3.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );
}

export function Logo({ tagline = false }: { tagline?: boolean }) {
  return (
    <span className="flex items-center gap-2.5">
      <LogoMark size={tagline ? 34 : 24} />
      <span className="leading-tight">
        <span className="block text-[16px] font-[650] tracking-[-0.02em]">
          Dev<span className="text-accent-ink">Track</span>
        </span>
        {tagline && <span className="block text-[11px] text-faint">Estude. Evolua. Conquiste.</span>}
      </span>
    </span>
  );
}

function NavItem({ to, label, icon: Icon }: { to: string; label: string; icon: ComponentType<{ size?: number }> }) {
  return (
    <NavLink
      to={to}
      end={to === "/"}
      className={({ isActive }) =>
        `flex items-center gap-3 rounded-lg px-3 py-2.5 text-[13.5px] transition-colors ${
          isActive
            ? "bg-accent font-[560] text-on-accent shadow-[0_6px_20px_var(--glow)]"
            : "text-muted hover:bg-raised hover:text-ink"
        }`
      }
    >
      <Icon size={18} />
      {label}
    </NavLink>
  );
}

export function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

function resolveTheme(theme: Settings["theme"]): "dark" | "light" {
  if (theme !== "system") return theme;
  return window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
}

function useThemeFromSettings() {
  const { data } = useQuery({ queryKey: ["settings"], queryFn: () => api.get<Settings>("/users/me/settings") });
  const theme = data?.theme ?? "dark";
  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: light)");
    const apply = () => {
      document.documentElement.dataset.theme = resolveTheme(theme);
    };
    apply();
    media.addEventListener("change", apply);
    return () => media.removeEventListener("change", apply);
  }, [theme]);
  return theme;
}

/** Alterna entre claro e escuro e guarda a escolha nas configurações da conta. */
function ThemeToggle() {
  const client = useQueryClient();
  const theme = useThemeFromSettings();
  const dark = resolveTheme(theme) === "dark";
  const save = useMutation({
    mutationFn: (next: "dark" | "light") => api.patch<Settings>("/users/me/settings", { theme: next }),
    onSuccess: (settings) => client.setQueryData(["settings"], settings),
  });
  const label = dark ? "Usar tema claro" : "Usar tema escuro";
  return (
    <button
      type="button"
      onClick={() => save.mutate(dark ? "light" : "dark")}
      aria-label={label}
      title={label}
      className="grid size-10 shrink-0 place-items-center rounded-lg border border-line bg-surface text-muted transition-colors hover:border-line-strong hover:text-ink"
    >
      {dark ? <Sun size={17} /> : <Moon size={17} />}
    </button>
  );
}

/** Cartão de incentivo com o nível real da gamificação. */
function LevelCard() {
  const { data } = useQuery({ queryKey: ["gamification"], queryFn: () => api.get<Gamification>("/gamification") });
  if (!data) return null;
  const span = Math.max(1, data.next_level_xp - data.level_start_xp);
  const percent = Math.min(100, Math.round(((data.xp - data.level_start_xp) / span) * 100));
  const missing = Math.max(0, data.next_level_xp - data.xp);
  return (
    <div className="relative overflow-hidden rounded-xl border border-line bg-raised/60 p-4">
      <div className="pointer-events-none absolute -right-8 -top-10 size-28 rounded-full bg-[var(--glow)] blur-2xl" aria-hidden="true" />
      <span className="grid size-9 place-items-center rounded-lg bg-accent/15 text-accent-ink" aria-hidden="true">
        <Rocket size={18} />
      </span>
      <p className="mt-3 text-[13.5px] font-[600]">Continue evoluindo!</p>
      <p className="mt-0.5 text-xs text-muted">
        Nível {data.level} · {data.xp} XP. Faltam {missing} XP para o nível {data.level + 1}.
      </p>
      <div
        className="mt-3 h-1.5 overflow-hidden rounded-full bg-line"
        role="progressbar"
        aria-label="Progresso até o próximo nível"
        aria-valuenow={percent}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div className="h-full rounded-full bg-accent" style={{ width: `${percent}%` }} />
      </div>
      <Link to="/metas" className="mt-3 inline-flex h-8 items-center rounded-md bg-accent px-3 text-[12.5px] font-[560] text-on-accent hover:brightness-105">
        Ver detalhes
      </Link>
    </div>
  );
}

function useCloseOnOutsideClick(onClose: () => void) {
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const close = (event: MouseEvent) => {
      if (!box.current?.contains(event.target as Node)) onClose();
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [onClose]);
  return box;
}

function UserMenu({ onLogout }: { onLogout: () => void }) {
  const { data: user } = useMe();
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const box = useCloseOnOutsideClick(() => setOpen(false));
  useEffect(() => setOpen(false), [location.pathname]);
  if (!user) return null;
  const role = user.experience_level ? EXPERIENCE[user.experience_level] : "Estudante";
  return (
    <div ref={box} className="relative">
      {open && (
        <div className="absolute bottom-full left-0 right-0 mb-2 rounded-lg border border-line bg-surface p-1 shadow-[0_12px_32px_rgb(0_0_0/0.45)]">
          <Link to="/perfil" className="flex items-center gap-2.5 rounded-md px-2.5 py-2 text-[13px] text-muted hover:bg-raised hover:text-ink">
            <UserRound size={16} /> Perfil
          </Link>
          <button
            type="button"
            onClick={onLogout}
            className="flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-[13px] text-muted hover:bg-raised hover:text-ink"
          >
            <LogOut size={16} /> Sair
          </button>
        </div>
      )}
      <button
        type="button"
        aria-expanded={open}
        aria-label={`Menu da conta de ${user.name}`}
        onClick={() => setOpen(!open)}
        className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left transition-colors hover:bg-raised"
      >
        <span className="grid size-9 shrink-0 place-items-center rounded-full bg-accent text-[12px] font-[650] text-on-accent">
          {initials(user.name)}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[13px] font-[560] text-ink">{user.name}</span>
          <span className="block truncate text-[11.5px] text-faint">{role}</span>
        </span>
        <ChevronUp size={16} className={`shrink-0 text-faint transition-transform ${open ? "" : "rotate-180"}`} />
      </button>
    </div>
  );
}

export function Layout() {
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const client = useQueryClient();
  useEffect(() => setOpen(false), [location.pathname]);

  async function logout() {
    await api.post("/auth/logout");
    client.clear();
    document.documentElement.dataset.theme = "dark";
    navigate("/entrar");
  }

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[256px_1fr]">
      <div className="sticky top-0 z-20 flex items-center justify-between gap-3 border-b border-line bg-canvas/85 px-4 py-2.5 backdrop-blur lg:hidden">
        <Link to="/" aria-label="DevTrack, início">
          <Logo />
        </Link>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <button
            type="button"
            aria-label={open ? "Fechar menu" : "Abrir menu"}
            aria-expanded={open}
            onClick={() => setOpen(!open)}
            className="grid size-10 place-items-center rounded-lg border border-line bg-surface text-muted hover:text-ink"
          >
            {open ? <X size={19} /> : <Menu size={19} />}
          </button>
        </div>
      </div>

      <aside
        className={`${open ? "flex" : "hidden"} fixed inset-x-0 bottom-0 top-[61px] z-30 flex-col gap-5 overflow-y-auto bg-surface px-4 py-4 lg:sticky lg:inset-auto lg:top-0 lg:z-auto lg:flex lg:h-screen lg:border-r lg:border-line`}
      >
        <Link to="/" aria-label="DevTrack, início" className="hidden px-1 pt-2 lg:block">
          <Logo tagline />
        </Link>
        <div className="lg:hidden">
          <GlobalSearch />
        </div>
        <nav aria-label="Principal" className="space-y-1">
          {MAIN.map(([to, label, icon]) => (
            <NavItem key={to} to={to} label={label} icon={icon} />
          ))}
        </nav>
        <div className="mt-auto space-y-4">
          <div className="hidden lg:block">
            <LevelCard />
          </div>
          <div className="border-t border-line pt-3">
            <UserMenu onLogout={logout} />
          </div>
        </div>
      </aside>

      <div className="min-w-0">
        <header className="sticky top-0 z-10 hidden items-center justify-between gap-4 border-b border-line bg-canvas/80 px-8 py-3 backdrop-blur lg:flex xl:px-10">
          <GlobalSearch />
          <ThemeToggle />
        </header>
        <main className="px-4 py-6 sm:px-6 lg:px-8 lg:py-8 xl:px-10">
          <div className="rise mx-auto max-w-[1280px]" key={location.pathname}>
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
