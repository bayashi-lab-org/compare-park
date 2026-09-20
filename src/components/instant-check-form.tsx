"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Car, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SearchPicker } from "@/components/search-picker";
import { NearMeButton } from "@/components/near-me-button";
import { useMyCar } from "@/hooks/use-my-car";
import { vehicleHref, type VehicleSelection } from "@/lib/vehicle-selection";
import { TOKYO_WARD_MAP } from "@/lib/constants";
import { trackEvent } from "@/lib/analytics";

interface Vehicle {
  slug: string;
  name: string;
  makerName: string;
}
interface ParkingLot {
  slug: string;
  name: string;
  address: string | null;
}

export function InstantCheckForm({
  vehicles,
  parkingLots,
}: {
  vehicles: Vehicle[];
  parkingLots: ParkingLot[];
}) {
  const router = useRouter();
  const { myCar } = useMyCar();
  const [chosen, setChosen] = useState<VehicleSelection | null>(null);
  const [mode, setMode] = useState<"area" | "parking">("area");
  const [ward, setWard] = useState("");
  const [parkingSlug, setParkingSlug] = useState("");
  const selection =
    chosen ??
    (myCar
      ? {
          carSlug: myCar.slug,
          generationId: myCar.generationId,
          trimId: myCar.trimId,
        }
      : null);
  const vehicle = vehicles.find(
    (vehicle) => vehicle.slug === selection?.carSlug,
  );
  const submit = () => {
    if (!vehicle || !selection) return;
    if (mode === "parking" && parkingSlug) {
      trackEvent("parking_check_start", {
        source: "home",
        car_slug: vehicle.slug,
        parking_slug: parkingSlug,
      });
      router.push(vehicleHref(`/parking/${parkingSlug}#checker`, selection));
    } else {
      trackEvent("car_detail_click", {
        source: "home",
        car_slug: vehicle.slug,
      });
      router.push(
        vehicleHref(
          mode === "area" && ward
            ? `/area/${ward}/car/${vehicle.slug}`
            : `/car/${vehicle.slug}`,
          selection,
        ),
      );
    }
  };
  return (
    <div className="space-y-5">
      <div className="flex gap-2 border-b pb-3" aria-label="探し方">
        <Button
          variant={mode === "area" ? "default" : "ghost"}
          aria-pressed={mode === "area"}
          onClick={() => setMode("area")}
          className="h-11 min-w-0 flex-1 rounded-xl px-2 text-xs sm:text-sm"
        >
          <MapPin className="hidden size-4 sm:block" />
          エリアから探す
        </Button>
        <Button
          variant={mode === "parking" ? "default" : "ghost"}
          aria-pressed={mode === "parking"}
          onClick={() => setMode("parking")}
          className="h-11 min-w-0 flex-1 rounded-xl px-2 text-xs sm:text-sm"
        >
          <Car className="hidden size-4 sm:block" />
          施設名で判定
        </Button>
      </div>
      <SearchPicker
        label="1. あなたの車"
        placeholder="車種を選ぶ"
        value={vehicle?.slug}
        options={vehicles.map((vehicle) => ({
          id: vehicle.slug,
          label: vehicle.name,
          description: vehicle.makerName,
        }))}
        onSelect={(slug) => setChosen({ carSlug: slug })}
      />
      {!chosen && myCar?.gradeName && (
        <p className="-mt-2 text-xs leading-6 text-muted-foreground">
          保存した条件：{myCar.gradeName}
        </p>
      )}
      {mode === "area" ? (
        <SearchPicker
          label="2. 探したいエリア（任意）"
          placeholder="東京23区から選ぶ"
          value={ward}
          options={TOKYO_WARD_MAP.map((ward) => ({
            id: ward.slug,
            label: ward.name,
          }))}
          onSelect={setWard}
        />
      ) : (
        <SearchPicker
          label="2. 確認したい駐車場"
          placeholder="施設名・住所で検索"
          value={parkingSlug}
          options={parkingLots.map((parking) => ({
            id: parking.slug,
            label: parking.name,
            description: parking.address ?? undefined,
          }))}
          onSelect={setParkingSlug}
        />
      )}
      <Button
        onClick={submit}
        disabled={!vehicle || (mode === "parking" && !parkingSlug)}
        className="h-auto min-h-14 w-full rounded-xl py-3 text-sm font-bold whitespace-normal sm:text-base"
      >
        {mode === "parking"
          ? "この駐車場でサイズを判定"
          : ward
            ? "この車の駐車場候補を見る"
            : "サイズと駐車場を見る"}
        <ArrowRight className="ml-2 size-5" />
      </Button>
      <div className="border-t pt-4">
        <NearMeButton
          selection={selection ?? undefined}
          className="h-11 w-full rounded-xl border-0 text-primary"
        />
      </div>
      <p className="text-center text-xs leading-6 text-muted-foreground">
        東京23区に対応 · 空車状況の表示ではありません
      </p>
    </div>
  );
}
