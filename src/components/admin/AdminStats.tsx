import { Users, Baby, BadgeCheck, Heart } from "lucide-react";

interface Stats {
  total: number;
  masc: number;
  fem: number;
  comAlergia: number;
}

interface AdminStatsProps {
  stats: Stats;
  totalCount: number;
}

export function AdminStats({ stats, totalCount }: AdminStatsProps) {
  const cards = [
    { icon: Baby, label: "Nesta página", value: stats.total },
    { icon: Users, label: "Total (filtros)", value: totalCount },
    { icon: BadgeCheck, label: "Meninos / Meninas", value: `${stats.masc} / ${stats.fem}` },
    { icon: Heart, label: "Com alerta de saúde", value: stats.comAlergia },
  ] as const;

  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      {cards.map(({ icon: Icon, label, value }) => (
        <div key={label} className="glass-card rounded-2xl p-5">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-xl bg-[image:var(--gradient-gold)] flex items-center justify-center text-[color:var(--royal-deep)]">
              <Icon className="h-6 w-6" />
            </div>
            <div>
              <div className="text-xs text-muted-foreground uppercase tracking-widest">{label}</div>
              <div className="font-display font-bold text-2xl">{value}</div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
