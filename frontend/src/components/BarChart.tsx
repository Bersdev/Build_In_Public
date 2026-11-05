import { useState } from "react";
import { formatMinutes } from "../lib/format";

export interface BarPoint {
  key: string;
  label: string;
  minutes: number;
}

/** Gráfico de barras de uma só série: a cor representa a quantidade, e o título diz o que é medido. */
export function BarChart({
  title,
  points,
  height = 150,
  tickEvery = 1,
}: {
  title: string;
  points: BarPoint[];
  height?: number;
  tickEvery?: number;
}) {
  const [active, setActive] = useState<number | null>(null);
  const max = Math.max(...points.map((point) => point.minutes), 1);
  const current = active === null ? null : points[active];
  const hasData = points.some((point) => point.minutes > 0);
  const caption = current
    ? `${current.label}: ${formatMinutes(current.minutes)}`
    : hasData
      ? `Maior valor: ${formatMinutes(max)}`
      : "Sem estudos neste período";

  return (
    <figure className="m-0">
      <figcaption className="sr-only">{title}</figcaption>
      <p className="mb-1 h-5 text-xs text-faint">{caption}</p>
      <div
        className="flex items-end gap-0.5 border-b border-line"
        style={{ height }}
        role="img"
        aria-label={title}
        onMouseLeave={() => setActive(null)}
      >
        {points.map((point, index) => {
          const barHeight = point.minutes ? Math.max(3, (point.minutes / max) * (height - 2)) : 0;
          return (
            <div
              key={point.key}
              className="flex h-full min-w-0 flex-1 items-end"
              onMouseEnter={() => setActive(index)}
              onClick={() => setActive(index)}
            >
              <div
                className={`w-full rounded-t-[4px] bg-chart transition-opacity ${active !== null && active !== index ? "opacity-50" : ""}`}
                style={{ height: barHeight }}
              />
            </div>
          );
        })}
      </div>
      <div className="relative mt-1 h-4 overflow-hidden text-[11px] text-faint" aria-hidden="true">
        {points.map((point, index) => {
          // Conta a partir do fim, para o período atual sempre ter rótulo.
          if ((points.length - 1 - index) % tickEvery !== 0) return null;
          const position = ((index + 0.5) / points.length) * 100;
          const style =
            position > 90
              ? { right: 0 }
              : position < 10
                ? { left: 0 }
                : { left: `${position}%`, transform: "translateX(-50%)" };
          return (
            <span key={point.key} className="absolute whitespace-nowrap" style={style}>
              {point.label}
            </span>
          );
        })}
      </div>
      <details className="mt-2 text-sm text-muted">
        <summary className="cursor-pointer text-xs text-faint">Ver dados em tabela</summary>
        <table className="mt-2 w-full text-left text-sm">
          <thead>
            <tr className="text-faint">
              <th className="font-normal">Período</th>
              <th className="font-normal">Tempo</th>
            </tr>
          </thead>
          <tbody>
            {points.map((point) => (
              <tr key={point.key} className="border-t border-line">
                <td className="py-1">{point.label}</td>
                <td className="py-1">{formatMinutes(point.minutes)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </figure>
  );
}
