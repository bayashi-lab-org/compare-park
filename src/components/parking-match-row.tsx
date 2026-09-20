"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronDown, ChevronRight, AlertTriangle, XCircle } from "lucide-react";
import { MatchBadge } from "@/components/match-badge";
import { DimensionCompare } from "@/components/dimension-compare";
import type { ParkingMatchItem } from "@/lib/matching";
import { vehicleHref, type VehicleSelection } from "@/lib/vehicle-selection";

export type { ParkingMatchItem };

const parkingTypeLabels: Record<string, string> = {
  mechanical: "機械式",
  self_propelled: "自走式",
  flat: "平面",
  tower: "タワー式",
};

interface ParkingMatchRowProps {
  item: ParkingMatchItem;
  selection?: VehicleSelection;
}

export function ParkingMatchRow({ item, selection }: ParkingMatchRowProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div 
      id={`parking-${item.parkingLotSlug}`} 
      className="border-b border-border last:border-b-0 transition-all duration-500"
    >
      <div className="flex items-start gap-3 px-4 py-3">
        <div className="min-w-0 flex-1">
          <Link
            href={selection ? vehicleHref(`/parking/${item.parkingLotSlug}#checker`, selection) : `/parking/${item.parkingLotSlug}`}
            className="group block"
          >
            <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between sm:gap-2">
              <span className="font-medium text-foreground group-hover:text-primary transition-colors">
                {item.parkingLotName}
              </span>
              <MatchBadge result={item.result} className="shrink-0 self-start sm:self-auto" />
            </div>
            <p className="mt-0.5 text-sm text-muted-foreground truncate">
              {item.parkingLotAddress}
              {item.parkingType && (
                <span className="ml-2">
                  | {parkingTypeLabels[item.parkingType] ?? item.parkingType}
                </span>
              )}
            </p>
          </Link>
          {item.reason && (
            <p
              className={`mt-1 flex items-center gap-1 text-sm ${
                item.result === "ng"
                  ? "text-match-ng"
                  : "text-match-caution"
              }`}
            >
              {item.result === "ng" ? (
                <XCircle className="size-3.5 shrink-0" />
              ) : (
                <AlertTriangle className="size-3.5 shrink-0" />
              )}
              {item.reason}
            </p>
          )}
        </div>
        {item.details.length > 0 && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="mt-1 flex size-11 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted transition-colors"
            aria-expanded={expanded}
            aria-label={expanded ? "詳細を閉じる" : "詳細を表示"}
          >
            {expanded ? (
              <ChevronDown className="size-4" />
            ) : (
              <ChevronRight className="size-4" />
            )}
          </button>
        )}
      </div>
      {expanded && item.details.length > 0 && (
        <div className="space-y-3 px-4 pb-4">
          {item.details.map((d) => (
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
  );
}
