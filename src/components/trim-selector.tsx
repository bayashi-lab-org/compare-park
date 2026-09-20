"use client";

import { useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { trackEvent } from "@/lib/analytics";

interface TrimData {
  generationId: number;
  generationName: string;
  startYear: number | null;
  endYear: number | null;
  trimId: number;
  trimName: string;
  driveType: string | null;
  transmission: string | null;
  dimensionId: number;
  lengthMm: number | null;
  widthMm: number | null;
  heightMm: number | null;
  weightKg: number | null;
}

interface TrimSelectorProps {
  trims: TrimData[];
  selectedGenerationId: number;
  selectedTrimId: number;
  carSlug: string;
}

function formatGenerationLabel(
  name: string,
  startYear: number | null,
  endYear: number | null
): string {
  if (startYear == null) return name;
  if (endYear != null) return `${name} (${startYear}-${endYear})`;
  return `${name} (${startYear}-)`;
}

function formatTrimLabel(
  name: string,
  driveType: string | null,
  transmission: string | null
): string {
  const parts = [name];
  if (driveType) parts.push(driveType);
  if (transmission) parts.push(transmission);
  return parts.join(" ");
}

export function TrimSelector({
  trims,
  selectedGenerationId,
  selectedTrimId,
  carSlug,
}: TrimSelectorProps) {
  const router = useRouter();

  // 世代の一覧（重複排除、startYear降順）
  const generationList = useMemo(() => {
    const map = new Map<
      number,
      { id: number; name: string; startYear: number | null; endYear: number | null }
    >();
    for (const t of trims) {
      if (!map.has(t.generationId)) {
        map.set(t.generationId, {
          id: t.generationId,
          name: t.generationName,
          startYear: t.startYear,
          endYear: t.endYear,
        });
      }
    }
    return Array.from(map.values()).sort(
      (a, b) => (b.startYear ?? 0) - (a.startYear ?? 0)
    );
  }, [trims]);

  // 選択中の世代に属するトリム一覧
  const trimsInGeneration = useMemo(() => {
    return trims.filter((t) => t.generationId === selectedGenerationId);
  }, [trims, selectedGenerationId]);

  const handleGenerationClick = useCallback(
    (genId: number) => {
      // その世代の最初のトリムを自動選択
      const firstTrim = trims.find((t) => t.generationId === genId);
      if (!firstTrim) return;
      trackEvent("car_trim_select", { car_slug: carSlug, generation_id: genId, trim_id: firstTrim.trimId });
      router.push(`/car/${carSlug}?gen=${genId}&trim=${firstTrim.trimId}`, {
        scroll: false,
      });
    },
    [trims, carSlug, router]
  );

  const handleTrimClick = useCallback(
    (trimId: number) => {
      trackEvent("car_trim_select", { car_slug: carSlug, generation_id: selectedGenerationId, trim_id: trimId });
      router.push(
        `/car/${carSlug}?gen=${selectedGenerationId}&trim=${trimId}`,
        { scroll: false }
      );
    },
    [carSlug, selectedGenerationId, router]
  );

  return (
    <div className="mb-8 space-y-4">
      {/* 世代選択 */}
      <div>
        <p className="mb-2 text-sm font-medium text-muted-foreground">世代</p>
        <div className="flex flex-wrap gap-2">
          {generationList.map((gen) => (
            <Button
              key={gen.id}
              variant={gen.id === selectedGenerationId ? "default" : "outline"}
              size="sm"
              onClick={() => handleGenerationClick(gen.id)}
            >
              {formatGenerationLabel(gen.name, gen.startYear, gen.endYear)}
            </Button>
          ))}
        </div>
      </div>

      {/* グレード選択 */}
      <div>
        <p className="mb-2 text-sm font-medium text-muted-foreground">
          グレード
        </p>
        <div className="flex flex-wrap gap-2">
          {trimsInGeneration.map((t) => (
            <Button
              key={t.trimId}
              variant={t.trimId === selectedTrimId ? "default" : "outline"}
              size="sm"
              onClick={() => handleTrimClick(t.trimId)}
            >
              {formatTrimLabel(t.trimName, t.driveType, t.transmission)}
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
}
