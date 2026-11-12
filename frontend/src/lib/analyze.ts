import { ApiError } from "./api";
import { mergePlans } from "./importPlan";
import type { ImportPlan } from "./types";

export interface Columns {
  title: number | null;
  stage: number | null;
  url: number | null;
  notes: number | null;
}

export interface AnalyzeRequest {
  content: string;
  start_row: number;
  columns: Columns | null;
  stage: string | null;
}

export interface AnalyzeResponse {
  plan: ImportPlan;
  warnings: string[];
  columns: Columns;
  stage: string | null;
  next_row: number | null;
  total_rows: number;
}

export interface Progress {
  done: number;
  total: number;
  /** Segundos de pausa pedida pela Groq; 0 quando está analisando. */
  waiting: number;
}

const MAX_WAITS_IN_A_ROW = 6;
/** Pausas da Groq são curtas. Acima disso o limite é do próprio app (por hora), e esperar não adianta. */
const MAX_AUTOMATIC_WAIT_SECONDS = 120;

/**
 * O plano gratuito da Groq aceita 8 mil tokens por minuto. A API analisa o arquivo em partes;
 * aqui as partes são pedidas em sequência e, quando a Groq pede pausa (429), espera e tenta de novo.
 */
export async function analyzeInParts(
  content: string,
  deps: {
    post: (body: AnalyzeRequest) => Promise<AnalyzeResponse>;
    wait: (seconds: number) => Promise<void>;
    onProgress: (progress: Progress) => void;
  },
): Promise<{ plan: ImportPlan; warnings: string[] }> {
  let request: AnalyzeRequest = { content, start_row: 0, columns: null, stage: null };
  let plan: ImportPlan | null = null;
  const warnings: string[] = [];
  let waits = 0;
  let total = 0;

  for (;;) {
    let response: AnalyzeResponse;
    try {
      response = await deps.post(request);
    } catch (error) {
      const seconds = error instanceof ApiError ? (error.retryAfter ?? 20) : 0;
      if (
        error instanceof ApiError &&
        error.status === 429 &&
        seconds <= MAX_AUTOMATIC_WAIT_SECONDS &&
        waits < MAX_WAITS_IN_A_ROW
      ) {
        waits += 1;
        deps.onProgress({ done: request.start_row, total, waiting: seconds });
        await deps.wait(seconds);
        continue;
      }
      throw error;
    }
    waits = 0;
    total = response.total_rows;
    plan = mergePlans(plan, response.plan);
    warnings.push(...response.warnings);
    if (response.next_row === null) return { plan, warnings };
    deps.onProgress({ done: response.next_row, total, waiting: 0 });
    request = { content, start_row: response.next_row, columns: response.columns, stage: response.stage };
  }
}
