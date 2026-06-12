"use client";

import { useState, useMemo, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Car } from "lucide-react";
import { MatchBadge } from "@/components/match-badge";
import { DimensionCompare } from "@/components/dimension-compare";
import {
  Command,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from "@/components/ui/command";
import { calculateMatch } from "@/lib/matching";

interface VehicleDim {
  slug: string;
  name: string;
  makerName: string;
  lengthMm: number | null;
  widthMm: number | null;
  heightMm: number | null;
  weightKg: number | null;
}

interface Restriction {
  max_length_mm: number | null;
  max_width_mm: number | null;
  max_height_mm: number | null;
  max_weight_kg: number | null;
}

interface InlineParkingCheckerProps {
  restrictions: Restriction[];
  vehicles: VehicleDim[];
}

export function InlineParkingChecker(props: InlineParkingCheckerProps) {
  return (
    <Suspense fallback={<InlineParkingCheckerInner {...props} />}>
      <InlineParkingCheckerWithParams {...props} />
    </Suspense>
  );
}

function InlineParkingCheckerWithParams(props: InlineParkingCheckerProps) {
  const searchParams = useSearchParams();
  const initialCarSlug = searchParams.get("car");
  return <InlineParkingCheckerInner {...props} initialCarSlug={initialCarSlug} />;
}

function InlineParkingCheckerInner({
  restrictions,
  vehicles,
  initialCarSlug,
}: InlineParkingCheckerProps & { initialCarSlug?: string | null }) {
  const [selected, setSelected] = useState<VehicleDim | null>(
    () => vehicles.find((v) => v.slug === initialCarSlug) ?? null
  );
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const filteredVehicles = useMemo(() => {
    if (!search) return vehicles.slice(0, 20);
    const q = search.toLowerCase();
    return vehicles
      .filter(
        (v) =>
          v.name.toLowerCase().includes(q) ||
          v.makerName.toLowerCase().includes(q) ||
          `${v.makerName} ${v.name}`.toLowerCase().includes(q)
      )
      .slice(0, 20);
  }, [vehicles, search]);

  // 選択車種と全制限のマッチング（最良結果）
  const matchResult = useMemo(() => {
    if (!selected || restrictions.length === 0) return null;

    let best = calculateMatch(
      {
        length_mm: selected.lengthMm,
        width_mm: selected.widthMm,
        height_mm: selected.heightMm,
        weight_kg: selected.weightKg,
      },
      restrictions[0]
    );

    for (let i = 1; i < restrictions.length; i++) {
      const match = calculateMatch(
        {
          length_mm: selected.lengthMm,
          width_mm: selected.widthMm,
          height_mm: selected.heightMm,
          weight_kg: selected.weightKg,
        },
        restrictions[i]
      );
      if (
        match.result === "ok" ||
        (match.result === "caution" && best.result === "ng")
      ) {
        best = match;
      }
    }

    return best;
  }, [selected, restrictions]);

  return (
    <div className="space-y-4">
      {/* 車種選択 */}
      <div className="relative">
        <button
          type="button"
          onClick={() => setOpen(!open)}
          className="flex w-full items-center gap-2 rounded-lg border border-border bg-background px-3 py-2.5 text-left text-sm transition-colors hover:bg-muted"
        >
          <Car className="size-4 shrink-0 text-muted-foreground" />
          {selected ? (
            <span className="truncate font-medium">
              {selected.makerName} {selected.name}
            </span>
          ) : (
            <span className="text-muted-foreground">
              車種を選んで判定...
            </span>
          )}
        </button>
        {open && (
          <div className="absolute left-0 top-full z-50 mt-1 w-full rounded-lg border bg-popover shadow-lg">
            <Command shouldFilter={false}>
              <CommandInput
                placeholder="車種名で検索..."
                value={search}
                onValueChange={setSearch}
              />
              <CommandList>
                <CommandEmpty>車種が見つかりません</CommandEmpty>
                <CommandGroup>
                  {filteredVehicles.map((v) => (
                    <CommandItem
                      key={v.slug}
                      value={v.slug}
                      onSelect={() => {
                        setSelected(v);
                        setOpen(false);
                        setSearch("");
                      }}
                    >
                      <span className="truncate">
                        {v.makerName} {v.name}
                      </span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </div>
        )}
      </div>

      {/* インライン判定結果 */}
      {selected && matchResult && (
        <div className="rounded-lg border bg-muted/30 p-4 space-y-4">
          <div className="flex items-center justify-between">
            <p className="font-medium text-sm">
              {selected.makerName} {selected.name}
            </p>
            <MatchBadge result={matchResult.result} />
          </div>
          {matchResult.details.length > 0 && (
            <div className="space-y-3">
              {matchResult.details.map((d) => (
                <DimensionCompare
                  key={d.dimension}
                  label={d.label}
                  value={d.value}
                  limit={d.limit}
                  unit={d.dimension === "weight" ? "kg" : "mm"}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
