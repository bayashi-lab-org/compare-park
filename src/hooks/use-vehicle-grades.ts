"use client";

import { useEffect, useState } from "react";
import type { VehicleGrade } from "@/lib/vehicle-selection";

export function useVehicleGrades(carSlug: string | undefined) {
  const [response, setResponse] = useState<{
    slug: string;
    grades: VehicleGrade[];
    error: string | null;
  } | null>(null);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    if (!carSlug) return;
    const controller = new AbortController();
    fetch(`/api/cars/${encodeURIComponent(carSlug)}/trims`, {
      signal: controller.signal,
    })
      .then(async (result) => {
        if (!result.ok) throw new Error("グレード情報を読み込めませんでした。");
        return result.json() as Promise<{ grades: VehicleGrade[] }>;
      })
      .then(({ grades }) => {
        if (!controller.signal.aborted)
          setResponse({ slug: carSlug, grades, error: null });
      })
      .catch((error: Error) => {
        if (!controller.signal.aborted)
          setResponse({ slug: carSlug, grades: [], error: error.message });
      });
    return () => controller.abort();
  }, [carSlug, attempt]);
  const current = response?.slug === carSlug ? response : null;
  return {
    grades: current?.grades ?? [],
    loading: !!carSlug && !current,
    error: current?.error,
    retry: () => {
      setResponse(null);
      setAttempt((value) => value + 1);
    },
  };
}
