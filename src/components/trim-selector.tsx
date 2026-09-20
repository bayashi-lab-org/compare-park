"use client";

import { useRouter } from "next/navigation";
import { VehicleGradePicker } from "@/components/vehicle-grade-picker";
import {
  resolveVehicleGrade,
  vehicleHref,
  type VehicleGrade,
} from "@/lib/vehicle-selection";
import { trackEvent } from "@/lib/analytics";

export function TrimSelector({
  trims,
  selectedGenerationId,
  selectedTrimId,
  carSlug,
}: {
  trims: VehicleGrade[];
  selectedGenerationId: number | null;
  selectedTrimId: number | null;
  carSlug: string;
}) {
  const router = useRouter();
  const selected =
    selectedTrimId && selectedGenerationId
      ? resolveVehicleGrade(trims, {
          generationId: selectedGenerationId,
          trimId: selectedTrimId,
        })
      : null;
  return (
    <div className="mb-5">
      <VehicleGradePicker
        grades={trims}
        selected={selected}
        onSelect={(grade) => {
          trackEvent("car_trim_select", {
            car_slug: carSlug,
            generation_id: grade.generationId,
            trim_id: grade.trimId,
          });
          router.push(
            vehicleHref(`/car/${carSlug}`, {
              carSlug,
              generationId: grade.generationId,
              trimId: grade.trimId,
            }),
            { scroll: false },
          );
        }}
      />
    </div>
  );
}
