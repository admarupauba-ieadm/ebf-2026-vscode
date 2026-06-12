import type { AgeRangeFilter } from "./types";

interface Stats {
  faixa: Record<Exclude<AgeRangeFilter, "all">, number>;
  turma: Record<string, number>;
}

interface AdminChartsProps {
  stats: Stats;
}

export function AdminCharts({ stats }: AdminChartsProps) {
  const totalByTurma = Object.entries(stats.turma).sort((a, b) => b[1] - a[1]);

  return (
    <div className="grid lg:grid-cols-2 gap-4 mt-6">
      <div className="glass-card rounded-2xl p-4">
        <h4 className="font-display font-bold mb-2">Total por faixa etária</h4>
        <ul className="text-sm space-y-1">
          {Object.entries(stats.faixa).map(([range, count]) => (
            <li
              key={range}
              className="flex items-center justify-between border-b border-[color:var(--gold)]/10 py-1"
            >
              <span>{range} anos</span>
              <span className="font-semibold">{count}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="glass-card rounded-2xl p-4">
        <h4 className="font-display font-bold mb-2">Total por turma</h4>
        {totalByTurma.length === 0 ? (
          <p className="text-sm text-muted-foreground">Sem turmas definidas.</p>
        ) : (
          <ul className="text-sm space-y-1">
            {totalByTurma.map(([turma, count]) => (
              <li
                key={turma}
                className="flex items-center justify-between border-b border-[color:var(--gold)]/10 py-1"
              >
                <span>{turma}</span>
                <span className="font-semibold">{count}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
