import type { ChartTable } from "@/lib/chart-rows";

/** Closed-by-default text equivalent of a chart, usable by keyboard and screen readers. */
export function ChartDataTable({ table, summary = "Voir les données du graphique" }: { table: ChartTable; summary?: string }) {
  return (
    <details className="mt-3 text-sm" data-testid="chart-data">
      <summary className="cursor-pointer text-muted-foreground">{summary}</summary>
      <div className="mt-2 max-h-64 overflow-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr>{table.columns.map((c) => <th key={c} scope="col" className="px-2 py-1 font-medium">{c}</th>)}</tr>
          </thead>
          <tbody>
            {table.rows.map((r, i) => (
              <tr key={i} data-testid="chart-data-row">
                {r.map((cell, j) => j === 0
                  ? <th key={j} scope="row" className="px-2 py-1 font-normal">{cell}</th>
                  : <td key={j} className="px-2 py-1 tabular-nums">{cell}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  );
}
