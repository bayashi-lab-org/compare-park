"use client";
import { type VehicleSelection } from "@/lib/vehicle-selection";

import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/skeleton";
import type { MapItem } from "./parking-map";

const MapContent = dynamic(() => import("./parking-map"), {
  ssr: false,
  loading: () => (
    <div className="h-[400px] w-full rounded-xl border bg-muted sm:h-[500px]">
      <Skeleton className="h-full w-full" />
    </div>
  ),
});

interface Props {
  selection?: VehicleSelection;
  items: MapItem[];
  center?: [number, number];
  zoom?: number;
}

export function ParkingMapLoader(props: Props) {
  return <MapContent {...props} />;
}
