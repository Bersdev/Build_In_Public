import { useMutation, useQuery } from "@tanstack/react-query";
import { Download, Sparkles, Upload } from "lucide-react";
import { useState, type FormEvent } from "react";
import { Badge, Button, DeleteButton, Empty, ErrorNote, Loaded, Modal, PageHeader, Progress, SelectField, TextArea, TextField, useAction } from "../components/ui";
import { analyzeInParts, type AnalyzeResponse, type Progress as AnalysisState } from "../lib/analyze";
import { api } from "../lib/api";
import { MAX_AI_CSV_BYTES, MAX_CSV_BYTES, decodeCsv, downloadTemplate, titleFromFileName } from "../lib/csv";
import { formValues, formatDate } from "../lib/format";
import type { Course, ImportPlan, ImportResult, LearningItem, LearningPath, LearningPathDetail, LearningStage } from "../lib/types";
import { ImportPlanReview, ImportSummary } from "./ImportPlanReview";

function PathForm({ path, onDone }: { path?: LearningPath; onDone: () => void }) {
  const save = useAction(
    (values: Record<string, unknown>) => (path ? api.patch(`/learning-paths/${path.id}`, values) : api.post("/learning-paths", values)),
    onDone,
  );
  return (
    <form
      className="space-y-3"
      onSubmit={(event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        save.mutate(formValues(new FormData(event.currentTarget)));
      }}
    >
      <TextField label="Nome da trilha" name="title" defaultValue={path?.title} placeholder="Back-end com Python" required />
      <TextArea label="Descrição" name="description" defaultValue={path?.description ?? ""} />
      <TextField label="Tecnologia" name="technology" defaultValue={path?.technology ?? ""} />
      <div className="grid gap-3 sm:grid-cols-2">
        <TextField label="Início" name="start_date" type="date" defaultValue={path?.start_date ?? ""} />
        <TextField label="Previsão de conclusão" name="target_date" type="date" defaultValue={path?.target_date ?? ""} />
      </div>
      <ErrorNote error={save.error} />
      <Button type="submit" variant="primary" disabled={save.isPending}>
        Salvar trilha
      </Button>
    </form>
  );
}

/** Espera em segundos, avisando quanto falta a cada segundo. */
function countdown(seconds: number, onTick: (left: number) => void): Promise<void> {
  return new Promise((resolve) => {
    let left = seconds;
    onTick(left);
    const timer = window.setInterval(() => {
      left -= 1;
      onTick(Math.max(left, 0));
      if (left <= 0) {
        window.clearInterval(timer);
        resolve();
      }
    }, 1000);
  });
}

function AnalysisProgress({ progress }: { progress: AnalysisState | null }) {
  const percent = progress && progress.total ? Math.round((progress.done / progress.total) * 100) : 0;
  return (
    <div className="space-y-1.5" aria-live="polite">
      <div className="h-1.5 overflow-hidden rounded-full bg-raised">
        <div className="h-full rounded-full bg-chart transition-[width] duration-500" style={{ width: `${Math.max(percent, 4)}%` }} />
      </div>
      <p className="text-[12px] text-faint">
        {!progress
          ? "Analisando a primeira parte do arquivo..."
          : progress.waiting > 0
            ? `O plano gratuito da Groq pediu uma pausa. Continuando em ${progress.waiting} s (${progress.done} de ${progress.total} linhas analisadas).`
            : `${progress.done} de ${progress.total} linhas analisadas...`}
      </p>
    </div>
  );
}

function ImportForm({ onDone }: { onDone: (pathId: number | null) => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [fileError, setFileError] = useState<string | null>(null);
  const aiStatus = useQuery({ queryKey: ["ai-status"], queryFn: () => api.get<{ enabled: boolean }>("/imports/ai-status") });
  const aiEnabled = aiStatus.data?.enabled === true;
  const [useAi, setUseAi] = useState(true);
  const withAi = aiEnabled && useAi;
  const [analysis, setAnalysis] = useState<{ plan: ImportPlan; warnings: string[] } | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);

  const importPath = useAction((body: { title: string; technology: string | null; content: string }) =>
    api.post<LearningPathDetail>("/learning-paths/import", body),
  );
  const [progress, setProgress] = useState<AnalysisState | null>(null);
  const analyze = useMutation({
    mutationFn: async (content: string) => {
      const result = await analyzeInParts(content, {
        post: (body) => api.post<AnalyzeResponse>("/imports/analyze", body),
        wait: (seconds) => countdown(seconds, (left) => setProgress((current) => current && { ...current, waiting: left })),
        onProgress: setProgress,
      });
      const { plan } = result;
      if (!plan.roadmap && !plan.goals.length && !plan.projects.length && !plan.tasks.length) {
        throw new Error("A IA não encontrou conteúdos, metas, projetos nem tarefas neste arquivo.");
      }
      // Sem nome sugerido pela IA, a trilha recebe o nome do arquivo.
      if (plan.roadmap && plan.roadmap.title === "Trilha importada" && file) {
        plan.roadmap = { ...plan.roadmap, title: titleFromFileName(file.name) || plan.roadmap.title };
      }
      return result;
    },
    onMutate: () => setProgress(null),
    onSuccess: setAnalysis,
  });

  function pick(selected: File | null) {
    setFile(selected);
    const limit = withAi ? MAX_AI_CSV_BYTES : MAX_CSV_BYTES;
    setFileError(selected && selected.size > limit ? `O arquivo pode ter até ${limit / 1000} KB${withAi ? " na análise com IA" : ""}.` : null);
    if (selected && !title) setTitle(titleFromFileName(selected.name));
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!file || fileError) return;
    const content = decodeCsv(await file.arrayBuffer());
    if (withAi) {
      analyze.mutate(content);
      return;
    }
    const technology = String(new FormData(event.currentTarget).get("technology") ?? "").trim();
    importPath.mutate(
      { title: title.trim(), technology: technology || null, content },
      { onSuccess: (path) => onDone((path as LearningPathDetail).id) },
    );
  }

  if (result) return <ImportSummary result={result} onOpenPath={onDone} onClose={() => onDone(null)} />;
  if (analysis) {
    return <ImportPlanReview plan={analysis.plan} warnings={analysis.warnings} onBack={() => setAnalysis(null)} onApplied={setResult} />;
  }

  const pending = importPath.isPending || analyze.isPending;
  return (
    <form className="space-y-4" onSubmit={submit}>
      <div className="rounded-lg border border-line bg-canvas p-4 text-sm text-muted">
        <p>
          Uma linha por conteúdo. Só a coluna <code className="num text-ink">item</code> é obrigatória;{" "}
          <code className="num text-ink">etapa</code>, <code className="num text-ink">link</code> e{" "}
          <code className="num text-ink">notas</code> são opcionais. Vírgula ou ponto e vírgula funcionam, como o Excel salva.
        </p>
        <pre className="num mt-3 overflow-x-auto rounded-md bg-surface p-3 text-[12px] leading-relaxed text-ink">
          {"etapa,item,link,notas\nFundamentos,Funções,,\nWeb,FastAPI,https://fastapi.tiangolo.com,"}
        </pre>
        <button type="button" onClick={downloadTemplate} className="mt-3 inline-flex items-center gap-1.5 text-accent-ink underline">
          <Download size={14} /> Baixar modelo
        </button>
      </div>

      <label className="block">
        <span className="mb-1.5 block text-[13px] font-medium text-muted">Arquivo CSV</span>
        <input
          type="file"
          accept=".csv,text/csv"
          required
          onChange={(event) => pick(event.target.files?.[0] ?? null)}
          className="control file:mr-3 file:rounded file:border-0 file:bg-raised file:px-2.5 file:py-1 file:text-[13px] file:text-ink"
        />
      </label>
      {fileError && (
        <p role="alert" className="text-sm text-danger">
          {fileError}
        </p>
      )}

      <div className={`rounded-lg border p-3 ${withAi ? "border-accent/40 bg-accent/5" : "border-line"}`}>
        <label className={`flex items-start gap-2.5 ${aiEnabled ? "cursor-pointer" : "opacity-60"}`}>
          <input
            type="checkbox"
            className="mt-1 size-4 accent-[var(--accent)]"
            checked={withAi}
            disabled={!aiEnabled}
            onChange={(event) => setUseAi(event.target.checked)}
          />
          <span>
            <span className="flex items-center gap-1.5 text-sm text-ink">
              <Sparkles size={14} className="text-accent-ink" /> Usar IA para encontrar metas, projetos e tarefas
            </span>
            <span className="mt-0.5 block text-[12px] text-faint">
              {aiStatus.isPending
                ? "Verificando se a IA está disponível..."
                : aiEnabled
                  ? "O conteúdo do arquivo é enviado à Groq para análise. Você revisa tudo antes de salvar."
                  : "A IA não está configurada no servidor (falta GROQ_API_KEY). A importação simples continua funcionando."}
            </span>
          </span>
        </label>
      </div>

      {!withAi && (
        <>
          <TextField label="Nome da trilha" name="title" value={title} onChange={(event) => setTitle(event.target.value)} required />
          <TextField label="Tecnologia" name="technology" placeholder="Opcional" />
        </>
      )}
      <ErrorNote error={importPath.error ?? analyze.error} />
      <Button type="submit" variant="primary" disabled={!file || Boolean(fileError) || pending}>
        {withAi ? <Sparkles size={15} /> : <Upload size={15} />}
        {analyze.isPending ? "Analisando com IA..." : importPath.isPending ? "Importando..." : withAi ? "Analisar arquivo" : "Importar roadmap"}
      </Button>
      {analyze.isPending && <AnalysisProgress progress={progress} />}
    </form>
  );
}

function ItemForm({ stageId, courses, onDone }: { stageId: number; courses: Course[]; onDone: () => void }) {
  const save = useAction((values: Record<string, unknown>) => api.post(`/learning-stages/${stageId}/items`, values), onDone);
  return (
    <form
      className="space-y-3"
      onSubmit={(event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        save.mutate(formValues(new FormData(event.currentTarget), { numbers: ["course_id"] }));
      }}
    >
      <TextField label="Conteúdo" name="title" required />
      <TextField label="Link de referência" name="url" type="url" placeholder="https://" />
      <SelectField
        label="Curso associado"
        name="course_id"
        allowEmpty="Nenhum"
        choices={courses.map((course) => [String(course.id), course.title])}
      />
      <TextArea label="Anotações" name="notes" />
      <ErrorNote error={save.error} />
      <Button type="submit" variant="primary" disabled={save.isPending}>
        Adicionar conteúdo
      </Button>
    </form>
  );
}

function Item({ item }: { item: LearningItem }) {
  const toggle = useAction((completed: boolean) => api.patch(`/learning-items/${item.id}`, { completed }));
  const remove = useAction(() => api.delete(`/learning-items/${item.id}`));
  const done = Boolean(item.completed_at);
  return (
    <li className="flex items-start justify-between gap-3 py-2">
      <label className="flex min-w-0 items-start gap-2.5">
        <input type="checkbox" className="mt-1 size-4 accent-[var(--accent)]" checked={done} onChange={(event) => toggle.mutate(event.target.checked)} />
        <span className="min-w-0">
          <span className={done ? "text-muted line-through" : ""}>{item.title}</span>
          <span className="block text-sm text-faint">
            {item.url && (
              <a href={item.url} target="_blank" rel="noreferrer noopener" className="mr-2 underline">
                Abrir referência
              </a>
            )}
            {item.course_title && `Curso: ${item.course_title}`}
          </span>
          {item.notes && <span className="block text-sm text-muted">{item.notes}</span>}
        </span>
      </label>
      <DeleteButton onConfirm={() => remove.mutate()} />
    </li>
  );
}

function Stage({ stage, courses }: { stage: LearningStage; courses: Course[] }) {
  const [adding, setAdding] = useState(false);
  const remove = useAction(() => api.delete(`/learning-stages/${stage.id}`));
  return (
    <section className="border-l-2 border-line pl-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-serif text-lg">{stage.title}</h3>
        <div className="flex gap-1.5">
          <Button onClick={() => setAdding(true)}>Adicionar conteúdo</Button>
          <DeleteButton label="Excluir etapa" onConfirm={() => remove.mutate()} />
        </div>
      </div>
      {stage.items.length === 0 ? (
        <p className="py-2 text-sm text-muted">Nenhum conteúdo nesta etapa.</p>
      ) : (
        <ul className="divide-y divide-line">
          {stage.items.map((item) => (
            <Item key={item.id} item={item} />
          ))}
        </ul>
      )}
      {adding && (
        <Modal title={`Novo conteúdo em ${stage.title}`} onClose={() => setAdding(false)}>
          <ItemForm stageId={stage.id} courses={courses} onDone={() => setAdding(false)} />
        </Modal>
      )}
    </section>
  );
}

function PathDetail({ pathId, onEdit }: { pathId: number; onEdit: (path: LearningPath) => void }) {
  const query = useQuery({ queryKey: ["paths", pathId], queryFn: () => api.get<LearningPathDetail>(`/learning-paths/${pathId}`) });
  const courses = useQuery({ queryKey: ["courses"], queryFn: () => api.get<Course[]>("/courses") });
  const remove = useAction(() => api.delete(`/learning-paths/${pathId}`));
  const addStage = useAction((title: string) => api.post(`/learning-paths/${pathId}/stages`, { title }));
  return (
    <Loaded query={query}>
      {(path) => (
        <div className="mt-3 space-y-5 border-t border-line pt-4">
          {path.description && <p className="prose-note max-w-[70ch]">{path.description}</p>}
          {path.stages.map((stage) => (
            <Stage key={stage.id} stage={stage} courses={courses.data ?? []} />
          ))}
          <form
            className="flex flex-wrap items-end gap-2"
            onSubmit={(event: FormEvent<HTMLFormElement>) => {
              event.preventDefault();
              const form = event.currentTarget;
              const title = String(new FormData(form).get("title")).trim();
              if (title) addStage.mutate(title, { onSuccess: () => form.reset() });
            }}
          >
            <div className="min-w-48 flex-1">
              <TextField label="Nova etapa" name="title" placeholder="Fundamentos" required />
            </div>
            <Button type="submit" disabled={addStage.isPending}>
              Adicionar etapa
            </Button>
          </form>
          <ErrorNote error={addStage.error ?? remove.error} />
          <div className="flex gap-1.5">
            <Button onClick={() => onEdit(path)}>Editar trilha</Button>
            <DeleteButton label="Excluir trilha" onConfirm={() => remove.mutate()} />
          </div>
        </div>
      )}
    </Loaded>
  );
}

export function RoadmapsPage() {
  const [editing, setEditing] = useState<LearningPath | "new" | null>(null);
  const [opened, setOpened] = useState<number | null>(null);
  const [importing, setImporting] = useState(false);
  const query = useQuery({ queryKey: ["paths"], queryFn: () => api.get<LearningPath[]>("/learning-paths") });
  return (
    <>
      <PageHeader
        title="Roadmaps"
        description="Trilhas com etapas e conteúdos para organizar o que você estuda em outras fontes."
        action={
          <div className="flex gap-2">
            <Button onClick={() => setImporting(true)}>
              <Upload size={15} /> Importar CSV
            </Button>
            <Button variant="primary" onClick={() => setEditing("new")}>
              Nova trilha
            </Button>
          </div>
        }
      />
      {importing && (
        <Modal title="Importar roadmap de um CSV" onClose={() => setImporting(false)}>
          <ImportForm
            onDone={(pathId) => {
              setImporting(false);
              setOpened(pathId);
            }}
          />
        </Modal>
      )}
      <Loaded query={query}>
        {(paths) =>
          paths.length === 0 ? (
            <Empty>Crie uma trilha, como Python ou SQL, e divida o caminho em etapas.</Empty>
          ) : (
            <ul className="divide-y divide-line border-y border-line">
              {paths.map((path) => (
                <li key={path.id} className="py-4">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <h2 className="font-serif text-xl">
                      <button type="button" aria-expanded={opened === path.id} onClick={() => setOpened(opened === path.id ? null : path.id)} className="text-left hover:text-accent-ink">
                        {path.title}
                      </button>
                    </h2>
                    <span className="text-sm text-muted">
                      Concluídos: {path.completed_items} de {path.total_items}
                    </span>
                  </div>
                  <div className="mt-2">
                    <Progress value={path.progress_percent} label={`Progresso de ${path.title}`} />
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-faint">
                    {path.technology && <Badge tone="accent">{path.technology}</Badge>}
                    {path.start_date && <span>Início: {formatDate(path.start_date)}</span>}
                    {path.target_date && <span>Previsão: {formatDate(path.target_date)}</span>}
                  </div>
                  {opened === path.id && <PathDetail pathId={path.id} onEdit={setEditing} />}
                </li>
              ))}
            </ul>
          )
        }
      </Loaded>
      {editing && (
        <Modal title={editing === "new" ? "Nova trilha" : "Editar trilha"} onClose={() => setEditing(null)}>
          <PathForm path={editing === "new" ? undefined : editing} onDone={() => setEditing(null)} />
        </Modal>
      )}
    </>
  );
}
