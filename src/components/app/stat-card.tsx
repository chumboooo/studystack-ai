import { Card, CardDescription, CardTitle } from "@/components/ui/card";

type StatCardProps = {
  label: string;
  value: string;
  change: string;
  description?: string;
  tone?: "success" | "warning" | "default";
};

const toneStyles = {
  success: "border-emerald-400/20 bg-emerald-400/10 text-emerald-200",
  warning: "border-amber-400/20 bg-amber-400/10 text-amber-200",
  default: "border-white/10 bg-slate-950/60 text-slate-300",
};

export function StatCard({
  label,
  value,
  change,
  description = "Compared to your last active study session.",
  tone = "default",
}: StatCardProps) {
  return (
    <Card className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-400">{label}</p>
        <span className={`rounded-full border px-3 py-1 text-xs ${toneStyles[tone]}`}>
          {change}
        </span>
      </div>
      <CardTitle className="text-3xl">{value}</CardTitle>
      <CardDescription>{description}</CardDescription>
    </Card>
  );
}
