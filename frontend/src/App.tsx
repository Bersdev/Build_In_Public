import { Link, Navigate, Outlet, Route, Routes } from "react-router";
import { Layout } from "./components/Layout";
import { ErrorNote } from "./components/ui";
import { useMe } from "./lib/auth";
import { ForgotPasswordPage, LoginPage, RegisterPage, ResetPasswordPage } from "./pages/Auth";
import { DashboardPage } from "./pages/Dashboard";
import { GoalsPage } from "./pages/Goals";
import { JournalPage } from "./pages/Journal";
import { ProfilePage } from "./pages/Profile";
import { ProjectDetailPage } from "./pages/ProjectDetail";
import { ProjectsPage } from "./pages/Projects";
import { RoadmapsPage } from "./pages/Roadmaps";
import { SettingsPage } from "./pages/Settings";
import { StudiesPage } from "./pages/Studies";
import { TasksPage } from "./pages/Tasks";

function Protected() {
  const me = useMe();
  if (me.isPending) return <p className="p-8 text-muted">Carregando...</p>;
  if (me.isError) {
    return (
      <div className="mx-auto max-w-md p-8">
        <ErrorNote error={me.error} />
      </div>
    );
  }
  return me.data ? <Outlet /> : <Navigate to="/entrar" replace />;
}

function PublicOnly() {
  const me = useMe();
  if (me.isPending) return <p className="p-8 text-muted">Carregando...</p>;
  return me.data ? <Navigate to="/" replace /> : <Outlet />;
}

function NotFound() {
  return (
    <div className="py-16 text-center">
      <h1 className="font-serif text-3xl">Página não encontrada</h1>
      <Link to="/" className="mt-3 inline-block text-accent-ink underline">
        Voltar ao Dashboard
      </Link>
    </div>
  );
}

export function App() {
  return (
    <Routes>
      <Route element={<PublicOnly />}>
        <Route path="/entrar" element={<LoginPage />} />
        <Route path="/cadastro" element={<RegisterPage />} />
        <Route path="/recuperar-senha" element={<ForgotPasswordPage />} />
      </Route>
      <Route path="/redefinir-senha" element={<ResetPasswordPage />} />
      <Route element={<Protected />}>
        <Route element={<Layout />}>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/diario" element={<JournalPage />} />
          <Route path="/estudos" element={<StudiesPage />} />
          <Route path="/roadmaps" element={<RoadmapsPage />} />
          <Route path="/projetos" element={<ProjectsPage />} />
          <Route path="/projetos/:id" element={<ProjectDetailPage />} />
          <Route path="/tarefas" element={<TasksPage />} />
          <Route path="/metas" element={<GoalsPage />} />
          <Route path="/perfil" element={<ProfilePage />} />
          <Route path="/configuracoes" element={<SettingsPage />} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Route>
    </Routes>
  );
}
