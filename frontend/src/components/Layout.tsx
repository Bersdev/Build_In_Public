import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  BookOpen,
  FolderKanban,
  LayoutDashboard,
  ListChecks,
  LogOut,
  Map as MapIcon,
  Menu,
  NotebookPen,
  Settings as SettingsIcon,
  Target,
  UserRound,
  X,
} from "lucide-react";
import { useEffect, useState, type ComponentType } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router";
import { api } from "../lib/api";
import { useMe } from "../lib/auth";
import type { Settings } from "../lib/types";

const MAIN: [string, string, ComponentType<{ size?: number }>][] = [
  ["/", "Dashboard", LayoutDashboard],
  ["/diario", "Diário", NotebookPen],
  ["/estudos", "Estudos", BookOpen],
  ["/roadmaps", "Roadmaps", MapIcon],
  ["/projetos", "Projetos", FolderKanban],
  ["/tarefas", "Tarefas", ListChecks],
  ["/metas", "Metas e evolução", Target],
];

const ACCOUNT: [string, string, ComponentType<{ size?: number }>][] = [
  ["/perfil", "Perfil", UserRound],
  ["/configuracoes", "Configurações", SettingsIcon],
];

export function LogoMark({ size = 22 }: { size?: number }) {
  return (
    <span
      className="grid place-items-center rounded-md bg-accent"
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      <svg width={size * 0.64} height={size * 0.64} viewBox="0 0 32 32">
        <path d="M6 26V17M16 26V7M26 26V12" stroke="var(--on-accent)" strokeWidth="5.5" strokeLinecap="round" />
      </svg>
    </span>
  );
}

export function Logo() {
  return (
    <span className="flex items-center gap-2 text-[15px] font-[600] tracking-[-0.015em]">
      <LogoMark />
      Build in Public
    </span>
  );
}

function NavItem({ to, label, icon: Icon }: { to: string; label: string; icon: ComponentType<{ size?: number }> }) {
  return (
    <NavLink
      to={to}
      end={to === "/"}
      className={({ isActive }) =>
        `group relative flex items-center gap-2.5 rounded-md px-2.5 py-[7px] text-[13px] transition-colors ${
          isActive ? "bg-raised text-ink" : "text-muted hover:bg-raised/70 hover:text-ink"
        }`
      }
    >
      {({ isActive }) => (
        <>
          {isActive && <span className="absolute -left-3 top-1.5 bottom-1.5 w-[3px] rounded-r bg-accent" aria-hidden="true" />}
          <span className={isActive ? "text-accent-ink" : "text-faint group-hover:text-muted"}>
            <Icon size={16} />
          </span>
          {label}
        </>
      )}
    </NavLink>
  );
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

function useThemeFromSettings() {
  const { data } = useQuery({ queryKey: ["settings"], queryFn: () => api.get<Settings>("/users/me/settings") });
  const theme = data?.theme ?? "dark";
  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: light)");
    const apply = () => {
      const resolved = theme === "system" ? (media.matches ? "light" : "dark") : theme;
      document.documentElement.dataset.theme = resolved;
    };
    apply();
    media.addEventListener("change", apply);
    return () => media.removeEventListener("change", apply);
  }, [theme]);
}

export function Layout() {
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const client = useQueryClient();
  const { data: user } = useMe();
  useThemeFromSettings();
  useEffect(() => setOpen(false), [location.pathname]);

  async function logout() {
    await api.post("/auth/logout");
    client.clear();
    document.documentElement.dataset.theme = "dark";
    navigate("/entrar");
  }

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[240px_1fr]">
      <div className="sticky top-0 z-20 flex items-center justify-between border-b border-line bg-canvas/85 px-4 py-3 backdrop-blur lg:hidden">
        <Logo />
        <button type="button" aria-label={open ? "Fechar menu" : "Abrir menu"} aria-expanded={open} onClick={() => setOpen(!open)} className="rounded-md p-1.5 text-muted hover:bg-raised">
          {open ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      <aside
        className={`${open ? "block" : "hidden"} border-b border-line bg-surface px-3 py-3 lg:sticky lg:top-0 lg:flex lg:h-screen lg:flex-col lg:border-b-0 lg:border-r`}
      >
        <div className="hidden px-2.5 pb-6 pt-2 lg:block">
          <Logo />
        </div>
        <p className="px-2.5 pb-1.5 text-[11px] font-medium uppercase tracking-[0.08em] text-faint">Espaço de estudo</p>
        <nav aria-label="Principal" className="space-y-px">
          {MAIN.map(([to, label, icon]) => (
            <NavItem key={to} to={to} label={label} icon={icon} />
          ))}
        </nav>
        <nav aria-label="Conta" className="mt-6 space-y-px lg:mt-auto">
          {ACCOUNT.map(([to, label, icon]) => (
            <NavItem key={to} to={to} label={label} icon={icon} />
          ))}
          <button
            type="button"
            onClick={logout}
            className="flex w-full items-center gap-2.5 rounded-md px-2.5 py-[7px] text-[13px] text-muted transition-colors hover:bg-raised/70 hover:text-ink"
          >
            <span className="text-faint">
              <LogOut size={16} />
            </span>
            Sair
          </button>
          {user && (
            <div className="mt-3 flex items-center gap-2.5 border-t border-line px-2.5 pt-3">
              <span className="grid size-7 shrink-0 place-items-center rounded-full bg-raised text-[11px] font-semibold text-muted ring-1 ring-line-strong">
                {initials(user.name)}
              </span>
              <span className="min-w-0">
                <span className="block truncate text-[13px] text-ink">{user.name}</span>
                <span className="block truncate text-[11px] text-faint">{user.email}</span>
              </span>
            </div>
          )}
        </nav>
      </aside>

      <main className="min-w-0 px-4 py-6 sm:px-8 lg:px-12 lg:py-12">
        <div className="rise mx-auto max-w-[1100px]" key={location.pathname}>
          <Outlet />
        </div>
      </main>
    </div>
  );
}
