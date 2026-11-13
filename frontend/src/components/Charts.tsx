import { useId, useLayoutEffect, useRef, useState } from "react";

export interface LinePoint {
  key: string;
  label: string;
  value: number;
}

/** Mede a largura real do contêiner, para o SVG desenhar sem distorcer textos e pontos. */
function useWidth() {
  const ref = useRef<HTMLDivElement>(null);
  // Começa em 0 e mede antes de pintar: um SVG largo demais estouraria a tela do celular.
  const [width, setWidth] = useState(0);
  useLayoutEffect(() => {
    if (!ref.current) return;
    setWidth(Math.max(240, ref.current.clientWidth));
    const observer = new ResizeObserver(([entry]) => setWidth(Math.max(240, entry.contentRect.width)));
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);
  return [ref, width] as const;
}

/** Linha com área de uma só série. O último ponto fica destacado; passar o mouse mostra cada valor. */
export function LineChart({
  title,
  points,
  format,
  axisFormat = format,
  max: fixedMax,
  height = 190,
}: {
  title: string;
  points: LinePoint[];
  /** Formato do valor no destaque e na tabela. */
  format: (value: number) => string;
  /** Formato curto dos rótulos do eixo vertical. */
  axisFormat?: (value: number) => string;
  max?: number;
  height?: number;
}) {
  const [ref, width] = useWidth();
  const [active, setActive] = useState<number | null>(null);
  const gradient = useId();
  const left = 46;
  const right = 14;
  const top = 28;
  const bottom = 24;
  const innerW = width - left - right;
  const innerH = height - top - bottom;
  const dataMax = Math.max(...points.map((point) => point.value), 0);
  const max = fixedMax ?? (dataMax > 0 ? niceMax(dataMax) : 1);
  const x = (index: number) => left + (points.length <= 1 ? innerW : (index / (points.length - 1)) * innerW);
  const y = (value: number) => top + innerH - (value / max) * innerH;
  const line = points.map((point, index) => `${index ? "L" : "M"}${x(index).toFixed(1)},${y(point.value).toFixed(1)}`).join(" ");
  const area = points.length ? `${line} L${x(points.length - 1)},${top + innerH} L${x(0)},${top + innerH} Z` : "";
  const shown = active ?? points.length - 1;
  const current = points[shown];
  const ticks = [0, 0.25, 0.5, 0.75, 1];
  const labelEvery = Math.max(1, Math.ceil(points.length / Math.max(2, Math.floor(innerW / 70))));

  function pick(clientX: number, rect: DOMRect) {
    const ratio = (clientX - rect.left - left) / innerW;
    setActive(Math.min(points.length - 1, Math.max(0, Math.round(ratio * (points.length - 1)))));
  }

  return (
    <figure className="m-0">
      <figcaption className="sr-only">{title}</figcaption>
      <div ref={ref} className="w-full" style={{ minHeight: height }}>
        {width > 0 && (
        <svg
          width={width}
          height={height}
          role="img"
          aria-label={title}
          className="block touch-pan-y"
          onMouseMove={(event) => pick(event.clientX, event.currentTarget.getBoundingClientRect())}
          onMouseLeave={() => setActive(null)}
          onClick={(event) => pick(event.clientX, event.currentTarget.getBoundingClientRect())}
        >
          <defs>
            <linearGradient id={gradient} x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.28" />
              <stop offset="100%" stopColor="var(--accent)" stopOpacity="0" />
            </linearGradient>
          </defs>
          {ticks.map((tick) => (
            <g key={tick}>
              <line x1={left} x2={width - right} y1={y(tick * max)} y2={y(tick * max)} stroke="var(--line)" strokeDasharray={tick ? "3 4" : undefined} />
              <text x={left - 8} y={y(tick * max) + 4} textAnchor="end" fontSize="10.5" fill="var(--faint)">
                {axisFormat(Math.round(tick * max))}
              </text>
            </g>
          ))}
          {points.map((point, index) =>
            (points.length - 1 - index) % labelEvery === 0 ? (
              <text key={point.key} x={x(index)} y={height - 6} textAnchor={index === 0 ? "start" : index === points.length - 1 ? "end" : "middle"} fontSize="10.5" fill="var(--faint)">
                {point.label}
              </text>
            ) : null,
          )}
          {points.length > 0 && (
            <>
              <path d={area} fill={`url(#${gradient})`} />
              <path d={line} fill="none" stroke="var(--accent)" strokeWidth="2.25" strokeLinejoin="round" strokeLinecap="round" />
            </>
          )}
          {current && (
            <g>
              <line x1={x(shown)} x2={x(shown)} y1={top} y2={top + innerH} stroke="var(--line-strong)" strokeDasharray="2 3" />
              <circle cx={x(shown)} cy={y(current.value)} r="9" fill="var(--accent)" opacity="0.18" />
              <circle cx={x(shown)} cy={y(current.value)} r="4.5" fill="var(--accent)" stroke="var(--surface)" strokeWidth="2" />
              <Bubble x={Math.min(Math.max(x(shown), left + 40), width - right - 40)} y={Math.max(14, y(current.value) - 16)} text={`${current.label}: ${format(current.value)}`} />
            </g>
          )}
        </svg>
        )}
      </div>
      <details className="mt-1 text-sm text-muted">
        <summary className="cursor-pointer text-xs text-faint">Ver dados em tabela</summary>
        <table className="mt-2 w-full text-left text-sm">
          <tbody>
            {points.map((point) => (
              <tr key={point.key} className="border-t border-line">
                <td className="py-1">{point.label}</td>
                <td className="py-1">{format(point.value)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </figure>
  );
}

function Bubble({ x, y, text }: { x: number; y: number; text: string }) {
  const width = text.length * 6.4 + 14;
  return (
    <g transform={`translate(${x - width / 2},${y - 14})`}>
      <rect width={width} height={20} rx={6} fill="var(--raised)" stroke="var(--line-strong)" />
      <text x={width / 2} y={13.5} textAnchor="middle" fontSize="11" fontWeight="600" fill="var(--ink)">
        {text}
      </text>
    </g>
  );
}

/** Arredonda o topo do eixo para um número legível (10, 20, 50, 100...). */
export function niceMax(value: number): number {
  const power = 10 ** Math.floor(Math.log10(value));
  for (const step of [1, 2, 2.5, 5, 10]) {
    if (value <= step * power) return step * power;
  }
  return 10 * power;
}

/** Topo do eixo em minutos: passos de 30 min a partir de 1 hora, para os rótulos virarem 30min, 1h, 1h30... */
export function niceMinutes(value: number): number {
  if (value <= 60) return niceMax(value);
  return Math.ceil(value / 4 / 30) * 30 * 4;
}

/** Rótulo curto de minutos para eixos: 45min, 1h, 1h30. */
export function shortMinutes(value: number): string {
  if (value < 60) return `${value}min`;
  const hours = Math.floor(value / 60);
  const minutes = value % 60;
  return minutes ? `${hours}h${String(minutes).padStart(2, "0")}` : `${hours}h`;
}

/** Anel de progresso, com o conteúdo central livre (ex.: "3/5"). */
export function Ring({ value, size = 128, stroke = 11, label, children }: { value: number; size?: number; stroke?: number; label: string; children?: React.ReactNode }) {
  const radius = (size - stroke) / 2;
  const length = 2 * Math.PI * radius;
  const clamped = Math.min(100, Math.max(0, value));
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }} role="progressbar" aria-label={label} aria-valuenow={clamped} aria-valuemin={0} aria-valuemax={100}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="var(--raised)" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--accent)"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={length}
          strokeDashoffset={length * (1 - clamped / 100)}
          style={{ transition: "stroke-dashoffset 0.6s ease", filter: "drop-shadow(0 0 6px var(--glow))" }}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">{children}</div>
    </div>
  );
}
