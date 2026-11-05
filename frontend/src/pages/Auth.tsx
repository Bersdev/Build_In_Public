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
    <div className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">
        <Logo />
        <h1 className="mb-5 mt-8 font-serif text-3xl leading-tight">{title}</h1>
        {children}
        <div className="mt-5 text-sm text-muted">{footer}</div>
      </div>
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
          <p>Se o e-mail estiver cadastrado, enviaremos as instruções.</p>
          {import.meta.env.DEV && (
            <p className="text-sm text-faint">
              O envio de e-mail ainda não existe. Em desenvolvimento, o link aparece no terminal da API.
            </p>
          )}
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
