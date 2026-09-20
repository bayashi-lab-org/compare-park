import { CircleCheck, CircleX, TriangleAlert } from "lucide-react";
import { cn } from "@/lib/utils";

type MatchResult = "ok" | "ng" | "caution";

interface MatchBadgeProps {
  result: MatchResult;
  className?: string;
  compact?: boolean;
}

const config: Record<
  MatchResult,
  {
    icon: React.ElementType;
    label: string;
    shortLabel: string;
    bg: string;
    text: string;
    border: string;
  }
> = {
  ok: {
    icon: CircleCheck,
    label: "サイズ条件内",
    shortLabel: "OK",
    bg: "bg-match-ok/10",
    text: "text-match-ok",
    border: "border-match-ok border-solid",
  },
  ng: {
    icon: CircleX,
    label: "制限を超過",
    shortLabel: "NG",
    bg: "bg-match-ng/10",
    text: "text-match-ng",
    border: "border-match-ng border-dashed",
  },
  caution: {
    icon: TriangleAlert,
    label: "要確認",
    shortLabel: "注意",
    bg: "bg-match-caution/10",
    text: "text-match-caution",
    border: "border-match-caution border-dotted",
  },
};

export function MatchBadge({ result, className, compact }: MatchBadgeProps) {
  const { icon: Icon, label, shortLabel, bg, text, border } = config[result];

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border font-medium",
        compact ? "px-2 py-0.5 text-xs" : "px-3 py-1 text-sm",
        bg,
        text,
        border,
        className
      )}
    >
      <Icon className={compact ? "size-3.5" : "size-4"} aria-hidden="true" />
      {compact ? shortLabel : label}
    </span>
  );
}
