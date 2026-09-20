"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TOKYO_WARD_MAP } from "@/lib/constants";
import { vehicleHref, type VehicleSelection } from "@/lib/vehicle-selection";

interface AreaSearchMiniProps {
  carSlug: string;
  selection?: VehicleSelection;
}

export function AreaSearchMini({ carSlug, selection }: AreaSearchMiniProps) {
  const router = useRouter();
  const [ward, setWard] = useState("");

  const handleSearch = () => {
    if (ward) {
      router.push(vehicleHref(`/area/${ward}/car/${carSlug}`, selection ?? { carSlug }));
    }
  };

  return (
    <div className="flex items-end gap-3">
      <div className="flex-1">
        <label htmlFor="area-search-ward" className="mb-1.5 block text-sm font-medium text-foreground">
          エリア
        </label>
        <select
          id="area-search-ward"
          value={ward}
          onChange={(e) => setWard(e.target.value)}
          className="h-12 w-full rounded-xl border border-border bg-background px-3 py-2 text-base"
        >
          <option value="">区を選択...</option>
          {TOKYO_WARD_MAP.map((w) => (
            <option key={w.slug} value={w.slug}>
              {w.name}
            </option>
          ))}
        </select>
      </div>
      <Button onClick={handleSearch} disabled={!ward} className="h-12 px-5">
        <MapPin className="mr-1.5 size-4" />
        探す
      </Button>
    </div>
  );
}
