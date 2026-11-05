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

export function Logo() {
  return (
    <span className="flex items-center gap-2 font-serif text-lg">
      <svg width="20" height="20" viewBox="0 0 32 32" aria-hidden="true">
        <path d="M6 26V15M16 26V7M26 26V19" stroke="var(--accent)" strokeWidth="5" strokeLinecap="round" />
      </svg>
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
        `flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-sm transition-colors ${
          isActive ? "bg-raised text-ink" : "text-muted hover:bg-raised hover:text-ink"
        }`
      }
    >
      <Icon size={16} />
      {label}
    </NavLink>
  );
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
    <div className="min-h-screen lg:grid lg:grid-cols-[232px_1fr]">
      <div className="flex items-center justify-between border-b border-line px-4 py-3 lg:hidden">
        <Logo />
        <button type="button" aria-label={open ? "Fechar menu" : "Abrir menu"} aria-expanded={open} onClick={() => setOpen(!open)} className="rounded p-1 text-muted">
          {open ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      <aside
        className={`${open ? "block" : "hidden"} border-b border-line px-3 py-3 lg:sticky lg:top-0 lg:flex lg:h-screen lg:flex-col lg:border-b-0 lg:border-r`}
      >
        <div className="hidden px-2.5 pb-5 pt-1 lg:block">
          <Logo />
        </div>
        <nav aria-label="Principal" className="space-y-0.5">
          {MAIN.map(([to, label, icon]) => (
            <NavItem key={to} to={to} label={label} icon={icon} />
          ))}
        </nav>
        <nav aria-label="Conta" className="mt-4 space-y-0.5 lg:mt-auto">
          {ACCOUNT.map(([to, label, icon]) => (
            <NavItem key={to} to={to} label={label} icon={icon} />
          ))}
          <button
            type="button"
            onClick={logout}
            className="flex w-full items-center gap-2.5 rounded-md px-2.5 py-1.5 text-sm text-muted transition-colors hover:bg-raised hover:text-ink"
          >
            <LogOut size={16} />
            Sair
          </button>
          {user && <p className="truncate px-2.5 pt-2 text-xs text-faint">{user.name}</p>}
        </nav>
      </aside>

      <main className="min-w-0 px-4 py-6 sm:px-8 lg:py-10">
        <div className="mx-auto max-w-[1080px]">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
