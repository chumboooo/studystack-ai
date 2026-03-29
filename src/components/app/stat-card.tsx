import { Card, CardDescription, CardTitle } from "@/components/ui/card";

type StatCardProps = {
  label: string;
  value: string;
  change: string;
};

export function StatCard({ label, value, change }: StatCardProps) {
  return (
    <Card className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-400">{label}</p>
        <span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-xs text-emerald-200">
          {change}
        </span>
      </div>
      <CardTitle className="text-3xl">{value}</CardTitle>
      <CardDescription>Compared to your last active study session.</CardDescription>
    </Card>
  );
}
