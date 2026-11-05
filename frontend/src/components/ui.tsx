import { useMutation, useQueryClient, type UseQueryResult } from "@tanstack/react-query";
import { X } from "lucide-react";
import { useEffect, useRef, useState, type ButtonHTMLAttributes, type ReactNode } from "react";
import { ApiError } from "../lib/api";

type Variant = "primary" | "ghost" | "danger";

const VARIANTS: Record<Variant, string> = {
  primary: "bg-accent text-on-accent font-medium hover:brightness-110",
  ghost: "border border-line text-ink hover:bg-raised",
  danger: "border border-danger text-danger hover:bg-raised",
};

export function Button({
  variant = "ghost",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return (
    <button
      type="button"
      {...props}
      className={`inline-flex items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${VARIANTS[variant]} ${className}`}
    />
  );
}

export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm text-muted">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-faint">{hint}</span>}
    </label>
  );
}

export function TextField({
  label,
  hint,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { label: string; hint?: string }) {
  return (
    <Field label={label} hint={hint}>
      <input className="control" {...props} />
    </Field>
  );
}

export function TextArea({
  label,
  hint,
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement> & { label: string; hint?: string }) {
  return (
    <Field label={label} hint={hint}>
      <textarea className="control" rows={3} {...props} />
    </Field>
  );
}

export function SelectField({
  label,
  choices,
  allowEmpty,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement> & {
  label: string;
  choices: [string, string][];
  allowEmpty?: string;
}) {
  return (
    <Field label={label}>
      <select className="control" {...props}>
        {allowEmpty !== undefined && <option value="">{allowEmpty}</option>}
        {choices.map(([value, text]) => (
          <option key={value} value={value}>
            {text}
          </option>
        ))}
      </select>
    </Field>
  );
}

const TONES = {
  neutral: "bg-raised text-muted",
  accent: "bg-raised text-accent-ink",
  ok: "bg-raised text-ok",
  danger: "bg-raised text-danger",
};

export function Badge({ tone = "neutral", children }: { tone?: keyof typeof TONES; children: ReactNode }) {
  return <span className={`inline-block rounded px-1.5 py-0.5 text-xs ${TONES[tone]}`}>{children}</span>;
}

export function Progress({ value, label }: { value: number; label: string }) {
  return (
    <div role="progressbar" aria-label={label} aria-valuenow={value} aria-valuemin={0} aria-valuemax={100} className="h-1.5 rounded-full bg-raised">
      <div className="h-full rounded-full bg-chart" style={{ width: `${Math.min(100, value)}%` }} />
    </div>
  );
}

export function PageHeader({ title, description, action }: { title: string; description?: string; action?: ReactNode }) {
  return (
    <header className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="font-serif text-3xl leading-tight">{title}</h1>
        {description && <p className="mt-1 max-w-[65ch] text-muted">{description}</p>}
      </div>
      {action}
    </header>
  );
}

export function SectionTitle({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
      <h2 className="font-serif text-xl">{children}</h2>
      {action}
    </div>
  );
}

export function Panel({ className = "", children }: { className?: string; children: ReactNode }) {
  return <div className={`rounded-[10px] border border-line bg-surface p-4 ${className}`}>{children}</div>;
}

export function Empty({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="rounded-[10px] border border-dashed border-line px-4 py-8 text-center text-muted">
      <p>{children}</p>
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}

const FIELD_LABELS: Record<string, string> = {
  title: "Título",
  name: "Nome",
  email: "E-mail",
  password: "Senha",
  new_password: "Nova senha",
  current_password: "Senha atual",
  description: "Descrição",
  entry_date: "Data",
  study_date: "Data",
  start_date: "Início",
  due_date: "Prazo",
  target_date: "Previsão de conclusão",
  duration_minutes: "Duração",
  progress_percent: "Conclusão",
  target_value: "Valor a alcançar",
  manual_value: "Valor atual",
  github_url: "Link do GitHub",
  demo_url: "Link de demonstração",
  image_url: "Endereço da imagem",
  avatar_url: "Endereço da foto",
  url: "Link",
  timezone: "Fuso horário",
};

export function ErrorNote({ error }: { error: unknown }) {
  if (!error) return null;
  const fields = error instanceof ApiError ? error.errors : [];
  const message = error instanceof Error ? error.message : "Algo deu errado.";
  return (
    <div role="alert" className="rounded-md border border-danger px-3 py-2 text-sm text-danger">
      <p>{message}</p>
      {fields.length > 0 && (
        <ul className="mt-1 list-inside list-disc">
          {fields.map((item) => (
            <li key={`${item.field}${item.message}`}>
              {item.field ? `${FIELD_LABELS[item.field] ?? item.field}: ` : ""}
              {item.message}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** Mostra carregamento e erro de uma consulta. Só desenha o conteúdo quando os dados chegam. */
export function Loaded<T>({ query, children }: { query: UseQueryResult<T>; children: (data: T) => ReactNode }) {
  if (query.isPending) return <p className="py-6 text-muted">Carregando...</p>;
  if (query.isError) return <ErrorNote error={query.error} />;
  return <>{children(query.data)}</>;
}

export function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    if (dialog && !dialog.open) dialog.showModal();
  }, []);
  return (
    <dialog
      ref={ref}
      onClose={onClose}
      className="w-[calc(100%-2rem)] max-w-2xl rounded-[14px] border border-line bg-surface p-0 shadow-2xl"
    >
      <div className="flex items-center justify-between border-b border-line px-5 py-3">
        <h2 className="font-serif text-xl">{title}</h2>
        <button type="button" aria-label="Fechar" onClick={() => ref.current?.close()} className="rounded p-1 text-muted hover:text-ink">
          <X size={18} />
        </button>
      </div>
      <div className="max-h-[75vh] overflow-y-auto p-5">{children}</div>
    </dialog>
  );
}

export function DeleteButton({ onConfirm, label = "Excluir" }: { onConfirm: () => void; label?: string }) {
  const [asking, setAsking] = useState(false);
  if (!asking) return <Button onClick={() => setAsking(true)}>{label}</Button>;
  return (
    <span className="inline-flex gap-1.5">
      <Button variant="danger" onClick={onConfirm}>
        Confirmar exclusão
      </Button>
      <Button onClick={() => setAsking(false)}>Manter</Button>
    </span>
  );
}

/** Executa uma alteração e atualiza todas as telas, pois os indicadores dependem de vários módulos. */
export function useAction<T = void>(action: (values: T) => Promise<unknown>, onDone?: () => void) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: action,
    onSuccess: async () => {
      await client.invalidateQueries();
      onDone?.();
    },
  });
}
