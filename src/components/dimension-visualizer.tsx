import { CircleCheck, CircleX, TriangleAlert } from "lucide-react";
import { compareDimensionToLimit } from "@/lib/dimension-comparison";
import { cn } from "@/lib/utils";

interface DimensionVisualizerProps {
  label: string;
  value: number;
  limits: number[];
}

/** 駐車区画の名称で車を分類せず、制限値ごとの差分を比較する。 */
export function DimensionVisualizer({ label, value, limits }: DimensionVisualizerProps) {
  return (
    <section className="min-w-0 rounded-xl border bg-card p-4">
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-sm font-bold">{label}</h3>
        <p className="text-sm text-muted-foreground">
          車の寸法 <strong className="ml-1 text-lg text-foreground tabular-nums">{value.toLocaleString()}</strong> mm
        </p>
      </div>
      <dl className="divide-y">
        {limits.map((limit) => {
          const comparison = compareDimensionToLimit(value, limit);
          if (!comparison) return null;
          const { result, difference } = comparison;
          const Icon = result === "ng" ? CircleX : result === "caution" ? TriangleAlert : CircleCheck;
          const status = result === "ng" ? "制限超過" : difference === 0 ? "上限と同じ" : result === "caution" ? "上限に近い" : "制限内";
          return (
            <div key={limit} className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 py-3 first:pt-0 last:pb-0">
              <dt className="text-sm font-medium tabular-nums">
                {limit.toLocaleString()}<span className="ml-1 text-xs font-normal text-muted-foreground">mm 制限</span>
              </dt>
              <dd className={cn("text-right", result === "ng" ? "text-match-ng" : result === "caution" ? "text-match-caution" : "text-match-ok")}>
                <p className="flex items-center justify-end gap-1.5 text-sm font-bold tabular-nums">
                  <Icon aria-hidden="true" className="size-4 shrink-0" />
                  {difference < 0 ? `${Math.abs(difference).toLocaleString()} mm 超過` : difference === 0 ? "差 0 mm" : `上限まで ${difference.toLocaleString()} mm`}
                </p>
                <p className="mt-0.5 text-xs">{status}</p>
              </dd>
            </div>
          );
        })}
      </dl>
    </section>
  );
}
