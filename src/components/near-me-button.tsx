"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { MapPin, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useMyCar } from "@/hooks/use-my-car";
import { vehicleHref, type VehicleSelection } from "@/lib/vehicle-selection";

interface NearMeButtonProps {
  className?: string;
  selection?: VehicleSelection;
}

export function NearMeButton({ className, selection }: NearMeButtonProps) {
  const router = useRouter();
  const { myCar } = useMyCar();
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const handleNearMe = () => {
    setLoading(true);
    setErrorMessage("");
    if (!navigator.geolocation) {
      setErrorMessage("現在地を取得できません。エリアからお探しください。");
      setLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        const car =
          selection ??
          (myCar
            ? {
                carSlug: myCar.slug,
                generationId: myCar.generationId,
                trimId: myCar.trimId,
              }
            : undefined);
        const path = `/search?lat=${latitude}&lng=${longitude}`;
        router.push(car ? vehicleHref(path, car) : path);
        setLoading(false);
      },
      (error) => {
        console.error("Geolocation error:", error);
        setErrorMessage(
          error.code === error.PERMISSION_DENIED
            ? "現在地を取得できませんでした。位置情報の許可設定を確認するか、エリアから駐車場を探してください。"
            : "現在地の取得に失敗しました。電波状況を確認して再度お試しください。",
        );
        setLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 },
    );
  };

  return (
    <div>
      <Button
        onClick={handleNearMe}
        disabled={loading}
        variant="outline"
        className={className}
      >
        {loading ? (
          <Loader2 className="mr-2 size-4 animate-spin" />
        ) : (
          <MapPin className="mr-2 size-4" />
        )}
        {loading ? "現在地を確認しています…" : "現在地周辺で探す"}
      </Button>
      {errorMessage && (
        <p
          role="alert"
          className="mt-3 text-sm leading-6 text-muted-foreground"
        >
          {errorMessage}{" "}
          <Link href="/area" className="font-bold text-primary underline">
            エリアから探す
          </Link>
        </p>
      )}
    </div>
  );
}
