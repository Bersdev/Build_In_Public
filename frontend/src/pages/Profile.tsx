import { useState, type FormEvent } from "react";
import { Button, ErrorNote, Loaded, PageHeader, SelectField, TextArea, TextField, useAction } from "../components/ui";
import { api } from "../lib/api";
import { useMe } from "../lib/auth";
import { formValues } from "../lib/format";
import { EXPERIENCE, options } from "../lib/labels";
import type { User } from "../lib/types";

function timezones(current: string): [string, string][] {
  const list: string[] = typeof Intl.supportedValuesOf === "function" ? Intl.supportedValuesOf("timeZone") : [current];
  const unique = list.includes(current) ? list : [current, ...list];
  return unique.map((zone) => [zone, zone]);
}

function Form({ user }: { user: User }) {
  const [saved, setSaved] = useState(false);
  const save = useAction((values: Record<string, unknown>) => api.patch("/users/me", values), () => setSaved(true));
  return (
    <div className="max-w-2xl">
      <div className="mb-6 flex items-center gap-4">
        {user.avatar_url ? (
          <img src={user.avatar_url} alt="" className="size-16 rounded-full object-cover" />
        ) : (
          <span aria-hidden="true" className="flex size-16 items-center justify-center rounded-full bg-raised font-serif text-2xl text-accent-ink">
            {user.name.charAt(0).toUpperCase()}
          </span>
        )}
        <div>
          <p className="font-serif text-xl">{user.name}</p>
          <p className="text-sm text-muted">{user.email}</p>
          <p className="text-sm text-faint">
            Na plataforma desde {new Date(user.created_at).toLocaleDateString("pt-BR", { day: "numeric", month: "long", year: "numeric" })}
          </p>
        </div>
      </div>
      <form
        className="space-y-3"
        onChange={() => setSaved(false)}
        onSubmit={(event: FormEvent<HTMLFormElement>) => {
          event.preventDefault();
          save.mutate(formValues(new FormData(event.currentTarget), { lists: ["interests"] }));
        }}
      >
        <TextField label="Nome" name="name" defaultValue={user.name} required />
        <TextField label="Endereço da foto" name="avatar_url" type="url" defaultValue={user.avatar_url ?? ""} placeholder="https://" />
        <TextArea label="Biografia" name="bio" defaultValue={user.bio ?? ""} />
        <TextField label="Objetivo profissional" name="career_goal" defaultValue={user.career_goal ?? ""} />
        <TextField label="Tecnologias de interesse" name="interests" defaultValue={user.interests.join(", ")} hint="Separe por vírgulas." />
        <div className="grid gap-3 sm:grid-cols-2">
          <SelectField label="Nível de experiência" name="experience_level" defaultValue={user.experience_level ?? ""} allowEmpty="Não informado" choices={options(EXPERIENCE)} />
          <SelectField label="Fuso horário" name="timezone" defaultValue={user.timezone} choices={timezones(user.timezone)} />
        </div>
        <ErrorNote error={save.error} />
        <div className="flex items-center gap-3">
          <Button type="submit" variant="primary" disabled={save.isPending}>
            Salvar perfil
          </Button>
          {saved && <span role="status" className="text-sm text-ok">Perfil salvo.</span>}
        </div>
      </form>
    </div>
  );
}

export function ProfilePage() {
  const me = useMe();
  return (
    <>
      <PageHeader title="Perfil" />
      <Loaded query={me}>{(user) => user && <Form user={user} />}</Loaded>
    </>
  );
}
