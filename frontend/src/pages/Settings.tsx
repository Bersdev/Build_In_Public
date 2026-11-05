import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, type FormEvent, type ReactNode } from "react";
import { Link, useNavigate } from "react-router";
import { Badge, Button, ErrorNote, Field, Loaded, PageHeader, SelectField, TextField, useAction } from "../components/ui";
import { api } from "../lib/api";
import type { Settings } from "../lib/types";

function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="grid gap-x-8 gap-y-3 border-t border-line py-6 md:grid-cols-[200px_1fr]">
      <h2 className="font-serif text-xl">{title}</h2>
      <div className="max-w-lg space-y-3">{children}</div>
    </section>
  );
}

function ChangePassword() {
  const [saved, setSaved] = useState(false);
  const change = useAction((values: Record<string, FormDataEntryValue>) => api.post("/auth/change-password", values), () => setSaved(true));
  return (
    <form
      className="space-y-3"
      onSubmit={(event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const form = event.currentTarget;
        setSaved(false);
        change.mutate(Object.fromEntries(new FormData(form)), { onSuccess: () => form.reset() });
      }}
    >
      <TextField label="Senha atual" name="current_password" type="password" autoComplete="current-password" required />
      <TextField label="Nova senha" name="new_password" type="password" autoComplete="new-password" minLength={10} hint="Use pelo menos 10 caracteres." required />
      <ErrorNote error={change.error} />
      <div className="flex items-center gap-3">
        <Button type="submit" disabled={change.isPending}>
          Alterar senha
        </Button>
        {saved && <span role="status" className="text-sm text-ok">Senha alterada.</span>}
      </div>
    </form>
  );
}

function DeleteAccount() {
  const navigate = useNavigate();
  const client = useQueryClient();
  const [asking, setAsking] = useState(false);
  const remove = useAction(
    (password: string) => api.delete("/users/me", { password }),
    () => {
      client.clear();
      document.documentElement.dataset.theme = "dark";
      navigate("/entrar");
    },
  );
  if (!asking) {
    return (
      <Button variant="danger" onClick={() => setAsking(true)}>
        Excluir minha conta
      </Button>
    );
  }
  return (
    <form
      className="space-y-3"
      onSubmit={(event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        remove.mutate(String(new FormData(event.currentTarget).get("password")));
      }}
    >
      <p className="text-sm text-muted">Todos os seus registros serão apagados de forma permanente. Digite sua senha para confirmar.</p>
      <TextField label="Senha" name="password" type="password" autoComplete="current-password" required />
      <ErrorNote error={remove.error} />
      <div className="flex gap-1.5">
        <Button type="submit" variant="danger" disabled={remove.isPending}>
          Excluir conta e dados
        </Button>
        <Button onClick={() => setAsking(false)}>Manter conta</Button>
      </div>
    </form>
  );
}

export function SettingsPage() {
  const query = useQuery({ queryKey: ["settings"], queryFn: () => api.get<Settings>("/users/me/settings") });
  const update = useAction((values: Partial<Settings>) => api.patch("/users/me/settings", values));
  return (
    <>
      <PageHeader title="Configurações" />
      <ErrorNote error={update.error} />
      <Loaded query={query}>
        {(settings) => (
          <>
            <Group title="Dados pessoais">
              <p className="text-muted">
                Nome, foto e fuso horário ficam no{" "}
                <Link to="/perfil" className="text-accent-ink underline">
                  seu perfil
                </Link>
                .
              </p>
            </Group>
            <Group title="Aparência">
              <SelectField
                label="Tema"
                value={settings.theme}
                onChange={(event) => update.mutate({ theme: event.target.value as Settings["theme"] })}
                choices={[
                  ["dark", "Escuro"],
                  ["light", "Claro"],
                  ["system", "Igual ao sistema"],
                ]}
              />
            </Group>
            <Group title="Preferências">
              <SelectField
                label="Visualização inicial de tarefas"
                value={settings.default_task_view}
                onChange={(event) => update.mutate({ default_task_view: event.target.value as Settings["default_task_view"] })}
                choices={[
                  ["kanban", "Kanban"],
                  ["list", "Lista"],
                ]}
              />
            </Group>
            <Group title="Notificações">
              <Field label="Notificações por e-mail" hint="Sua preferência fica salva, mas o envio de notificações ainda não existe.">
                <span className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    className="size-4 accent-[var(--accent)]"
                    checked={settings.email_notifications}
                    onChange={(event) => update.mutate({ email_notifications: event.target.checked })}
                  />
                  Receber por e-mail
                </span>
              </Field>
            </Group>
            <Group title="Segurança">
              <ChangePassword />
            </Group>
            <Group title="Integrações">
              <div className="flex items-center justify-between gap-3">
                <span>GitHub</span>
                <Badge>Planejado</Badge>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span>Assistente de IA</span>
                <Badge>Planejado</Badge>
              </div>
            </Group>
            <Group title="Privacidade">
              <p className="text-muted">Seus registros são visíveis apenas para você.</p>
              <DeleteAccount />
            </Group>
          </>
        )}
      </Loaded>
    </>
  );
}
