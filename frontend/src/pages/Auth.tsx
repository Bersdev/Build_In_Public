import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, type FormEvent, type ReactNode } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import { Logo } from "../components/Layout";
import { Button, ErrorNote, TextField } from "../components/ui";
import { api } from "../lib/api";
import { ME_KEY } from "../lib/auth";
import type { User } from "../lib/types";

function AuthFrame({ title, children, footer }: { title: string; children: ReactNode; footer: ReactNode }) {
  return (
    <div className="grid min-h-screen lg:grid-cols-[1fr_minmax(0,560px)]">
      <div className="flex flex-col px-4 py-6 sm:px-10">
        <Link to="/" aria-label="Página inicial" className="self-start">
          <Logo />
        </Link>
        <div className="rise mx-auto my-auto w-full max-w-sm py-10">
          <h1 className="mb-6 font-serif text-[28px] leading-tight">{title}</h1>
          <div className="rounded-xl border border-line bg-surface p-5">{children}</div>
          <div className="mt-5 text-sm text-muted">{footer}</div>
        </div>
      </div>
      <aside className="relative hidden overflow-hidden border-l border-line bg-surface lg:block" aria-hidden="true">
        <div className="absolute inset-0 bg-[radial-gradient(60%_50%_at_70%_20%,var(--glow),transparent)]" />
        <div className="absolute inset-0 bg-[linear-gradient(var(--line)_1px,transparent_1px),linear-gradient(90deg,var(--line)_1px,transparent_1px)] bg-[size:48px_48px] opacity-40 [mask-image:radial-gradient(70%_60%_at_50%_40%,black,transparent)]" />
        <div className="relative flex h-full flex-col justify-end p-12">
          <div className="mb-10 space-y-2">
            <p className="text-[11px] uppercase tracking-[0.08em] text-faint">Exemplo de resumo semanal</p>
            {[
              ["Python", "2h 15min", 82],
              ["SQL", "1h 40min", 61],
              ["React", "55min", 34],
            ].map(([name, time, pct]) => (
              <div key={name as string} className="rounded-lg border border-line bg-canvas/60 p-3 backdrop-blur">
                <div className="mb-2 flex justify-between text-[13px]">
                  <span>{name}</span>
                  <span className="num text-muted">{time}</span>
                </div>
                <div className="h-1 rounded-full bg-raised">
                  <div className="h-full rounded-full bg-chart" style={{ width: `${pct}%` }} />
                </div>
              </div>
            ))}
          </div>
          <p className="font-serif text-[26px] leading-[1.2]">
            Cada hora estudada vira <span className="text-accent-ink">progresso visível</span>.
          </p>
          <p className="mt-3 max-w-sm text-muted">
            Registre estudos, projetos e aprendizados. Os números são calculados a partir do que você faz, nunca inventados.
          </p>
        </div>
      </aside>
    </div>
  );
}

const linkClass = "text-accent-ink underline";

function useSessionStart(path: string) {
  const client = useQueryClient();
  const navigate = useNavigate();
  return useMutation({
    mutationFn: (body: Record<string, FormDataEntryValue>) => api.post<User>(path, body),
    onSuccess: (user) => {
      client.setQueryData(ME_KEY, user);
      navigate("/", { replace: true });
    },
  });
}

function submitForm(event: FormEvent<HTMLFormElement>, send: (values: Record<string, FormDataEntryValue>) => void) {
  event.preventDefault();
  send(Object.fromEntries(new FormData(event.currentTarget)));
}

export function LoginPage() {
  const login = useSessionStart("/auth/login");
  return (
    <AuthFrame
      title="Continue de onde parou"
      footer={
        <>
          Ainda não tem conta?{" "}
          <Link className={linkClass} to="/cadastro">
            Criar conta
          </Link>
        </>
      }
    >
      <form className="space-y-3" onSubmit={(event) => submitForm(event, login.mutate)}>
        <TextField label="E-mail" name="email" type="email" autoComplete="email" required />
        <TextField label="Senha" name="password" type="password" autoComplete="current-password" required />
        <ErrorNote error={login.error} />
        <Button type="submit" variant="primary" className="w-full" disabled={login.isPending}>
          Entrar
        </Button>
      </form>
      <p className="mt-3 text-sm">
        <Link className="text-muted underline" to="/recuperar-senha">
          Esqueci minha senha
        </Link>
      </p>
    </AuthFrame>
  );
}

export function RegisterPage() {
  const register = useSessionStart("/auth/register");
  return (
    <AuthFrame
      title="Comece o registro da sua jornada"
      footer={
        <>
          Já tem conta?{" "}
          <Link className={linkClass} to="/entrar">
            Entrar
          </Link>
        </>
      }
    >
      <form
        className="space-y-3"
        onSubmit={(event) =>
          // O fuso do navegador define qual é o "hoje" da pessoa nas sequências e nos prazos.
          submitForm(event, (values) =>
            register.mutate({ ...values, timezone: Intl.DateTimeFormat().resolvedOptions().timeZone }),
          )
        }
      >
        <TextField label="Nome" name="name" autoComplete="name" required />
        <TextField label="E-mail" name="email" type="email" autoComplete="email" required />
        <TextField
          label="Senha"
          name="password"
          type="password"
          autoComplete="new-password"
          minLength={10}
          hint="Use pelo menos 10 caracteres."
          required
        />
        <ErrorNote error={register.error} />
        <Button type="submit" variant="primary" className="w-full" disabled={register.isPending}>
          Criar conta
        </Button>
      </form>
    </AuthFrame>
  );
}

export function ForgotPasswordPage() {
  const [sent, setSent] = useState(false);
  const forgot = useMutation({
    mutationFn: (body: Record<string, FormDataEntryValue>) => api.post("/auth/forgot-password", body),
    onSuccess: () => setSent(true),
  });
  return (
    <AuthFrame
      title="Recuperar senha"
      footer={
        <Link className={linkClass} to="/entrar">
          Voltar para o login
        </Link>
      }
    >
      {sent ? (
        <div className="space-y-2 text-muted">
          <p>Pedido registrado.</p>
          <p className="text-sm text-faint">
            {import.meta.env.DEV
              ? "O envio de e-mail ainda não existe. Em desenvolvimento, o link aparece no terminal da API."
              : "O envio de e-mail ainda não está ativo nesta versão. Se não conseguir entrar, fale com o administrador."}
          </p>
        </div>
      ) : (
        <form className="space-y-3" onSubmit={(event) => submitForm(event, forgot.mutate)}>
          <TextField label="E-mail" name="email" type="email" autoComplete="email" required />
          <ErrorNote error={forgot.error} />
          <Button type="submit" variant="primary" className="w-full" disabled={forgot.isPending}>
            Enviar instruções
          </Button>
        </form>
      )}
    </AuthFrame>
  );
}

export function ResetPasswordPage() {
  const [params] = useSearchParams();
  const [done, setDone] = useState(false);
  const client = useQueryClient();
  const reset = useMutation({
    mutationFn: (values: Record<string, FormDataEntryValue>) =>
      api.post("/auth/reset-password", { token: params.get("token") ?? "", new_password: values.new_password }),
    onSuccess: () => {
      client.setQueryData(ME_KEY, null);
      setDone(true);
    },
  });
  return (
    <AuthFrame
      title="Definir nova senha"
      footer={
        <Link className={linkClass} to="/entrar">
          Ir para o login
        </Link>
      }
    >
      {done ? (
        <p className="text-muted">Senha alterada. Entre com a nova senha.</p>
      ) : (
        <form className="space-y-3" onSubmit={(event) => submitForm(event, reset.mutate)}>
          <TextField
            label="Nova senha"
            name="new_password"
            type="password"
            autoComplete="new-password"
            minLength={10}
            hint="Use pelo menos 10 caracteres."
            required
          />
          <ErrorNote error={reset.error} />
          <Button type="submit" variant="primary" className="w-full" disabled={reset.isPending}>
            Salvar nova senha
          </Button>
        </form>
      )}
    </AuthFrame>
  );
}
