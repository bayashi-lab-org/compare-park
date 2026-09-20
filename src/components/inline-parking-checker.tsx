"use client";

import { VehicleSpecificationNote } from "@/components/vehicle-specification-note";

import { useEffect, useMemo, useRef, useTransition, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowRight, Loader2, MapPin, Info } from "lucide-react";
import { SearchPicker } from "@/components/search-picker";
import { VehicleGradePicker } from "@/components/vehicle-grade-picker";
import { MyCarToggle } from "@/components/my-car-toggle";
import { OfficialSiteLink } from "@/components/official-site-link";
import { MatchBadge } from "@/components/match-badge";
import { DimensionCompare } from "@/components/dimension-compare";
import { Button, buttonVariants } from "@/components/ui/button";
import { useVehicleGrades } from "@/hooks/use-vehicle-grades";
import { useMyCar } from "@/hooks/use-my-car";
import { calculateMatch, matchSortOrder } from "@/lib/matching";
import {
  gradeDimensions,
  gradeLabel,
  resolveVehicleGrade,
  vehicleHref,
  type VehicleSelection,
} from "@/lib/vehicle-selection";
import { trackEvent } from "@/lib/analytics";

interface Props {
  parkingSlug: string;
  officialUrl?: string | null;
  mapUrl?: string;
  vehicles: { slug: string; name: string; makerName: string }[];
  restrictions: {
    restriction_name?: string;
    notes?: string | null;
    max_length_mm: number | null;
    max_width_mm: number | null;
    max_height_mm: number | null;
    max_weight_kg: number | null;
  }[];
}

export function InlineParkingChecker(props: Props) {
  return (
    <Suspense
      fallback={
        <p className="p-5 text-sm text-muted-foreground">
          車の選択を読み込んでいます…
        </p>
      }
    >
      <Checker {...props} />
    </Suspense>
  );
}

function Checker({
  parkingSlug,
  restrictions,
  vehicles,
  officialUrl,
  mapUrl,
}: Props) {
  const params = useSearchParams();
  const router = useRouter();
  const { myCar } = useMyCar();
  const [pending, startTransition] = useTransition();
  const fromUrl = params.get("car");
  const selection = fromUrl
    ? {
        carSlug: fromUrl,
        generationId: params.has("gen") ? Number(params.get("gen")) : undefined,
        trimId: params.has("trim") ? Number(params.get("trim")) : undefined,
      }
    : myCar
      ? {
          carSlug: myCar.slug,
          generationId: myCar.generationId,
          trimId: myCar.trimId,
        }
      : null;
  const vehicle = vehicles.find(
    (vehicle) => vehicle.slug === selection?.carSlug,
  );
  const { grades, loading, error, retry } = useVehicleGrades(vehicle?.slug);
  const grade = selection ? resolveVehicleGrade(grades, selection) : null;
  const explicit = !!selection?.trimId;
  const lastTracked = useRef<string | null>(null);
  const result = useMemo(() => {
    if (!grade) return null;
    return (
      restrictions
        .map((restriction) => ({
          restriction,
          match: calculateMatch(gradeDimensions(grade), restriction),
        }))
        .sort(
          (a, b) =>
            matchSortOrder(a.match.result) - matchSortOrder(b.match.result) ||
            b.match.details.length - a.match.details.length,
        )[0] ?? null
    );
  }, [grade, restrictions]);
  useEffect(() => {
    if (!vehicle || !grade || !result || result.match.details.length === 0)
      return;
    const fingerprint = JSON.stringify([
      parkingSlug,
      grade.trimId,
      result.match,
      explicit,
    ]);
    if (lastTracked.current === fingerprint) return;
    lastTracked.current = fingerprint;
    trackEvent("parking_check_complete", {
      parking_slug: parkingSlug,
      car_slug: vehicle.slug,
      generation_id: grade.generationId,
      trim_id: grade.trimId,
      result: result.match.result,
      dimension_basis: explicit ? "selected_trim" : "representative",
      compared_dimensions: result.match.details.length,
    });
  }, [parkingSlug, vehicle, grade, result, explicit]);

  const select = (next: VehicleSelection) => {
    startTransition(() =>
      router.replace(vehicleHref(`/parking/${parkingSlug}#checker`, next), {
        scroll: false,
      }),
    );
  };
  const missing = result
    ? [
        { key: "length", label: "全長" },
        { key: "width", label: "全幅" },
        { key: "height", label: "全高" },
        { key: "weight", label: "重量" },
      ].filter(
        (item) =>
          !result.match.details.some((detail) => detail.dimension === item.key),
      )
    : [];

  return (
    <div className="space-y-5">
      {pending && (
        <p role="status" className="text-sm text-primary">
          選択した条件に切り替えています…
        </p>
      )}
      {grade && result && vehicle && (
        <div className="rounded-xl bg-muted/60 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm font-bold">{vehicle.name}のサイズ判定</p>
            <MatchBadge result={result.match.result} />
          </div>
          <p className="mt-2 text-xs leading-6 text-muted-foreground">
            {gradeLabel(grade)}
          </p>
          {!explicit && (
            <p className="mt-1 text-xs text-muted-foreground">
              代表グレードです。実際のグレードをご確認ください。
            </p>
          )}
          <a
            href="#comparison-details"
            className="mt-3 inline-block text-sm font-bold text-primary underline"
          >
            比較した寸法と理由を見る
          </a>
        </div>
      )}
      <SearchPicker
        label="あなたの車"
        placeholder="車種を選択（例：アルファード）"
        value={vehicle?.slug}
        options={vehicles.map((vehicle) => ({
          id: vehicle.slug,
          label: vehicle.name,
          description: vehicle.makerName,
        }))}
        onSelect={(slug) => {
          trackEvent("parking_check_start", {
            source: "parking",
            parking_slug: parkingSlug,
            car_slug: slug,
          });
          select({ carSlug: slug });
        }}
      />
      {selection && !vehicle && (
        <p role="alert" className="text-sm text-match-caution">
          指定された車種が見つかりません。車を選び直してください。
        </p>
      )}
      {loading && (
        <p
          role="status"
          className="flex items-center gap-2 py-3 text-sm text-muted-foreground"
        >
          <Loader2 className="size-4 animate-spin" />
          グレード情報を確認しています…
        </p>
      )}
      {error && (
        <div role="alert" className="rounded-xl bg-muted p-4 text-sm">
          <p>{error}</p>
          <Button variant="outline" className="mt-3 h-11" onClick={retry}>
            もう一度読み込む
          </Button>
        </div>
      )}
      {!loading && !error && vehicle && grades.length === 0 && (
        <p className="rounded-xl bg-muted p-4 text-sm">
          この車の寸法データはまだありません。公式情報でご確認ください。
        </p>
      )}
      {grades.length > 0 && (
        <>
          <VehicleGradePicker
            grades={grades}
            selected={grade}
            onSelect={(grade) => {
              trackEvent("car_trim_select", {
                car_slug: vehicle!.slug,
                generation_id: grade.generationId,
                trim_id: grade.trimId,
              });
              select({
                carSlug: vehicle!.slug,
                generationId: grade.generationId,
                trimId: grade.trimId,
              });
            }}
          />
          {!grade && (
            <p role="alert" className="text-sm text-match-caution">
              指定の世代・グレードが見つかりません。上の選択欄から選び直してください。
            </p>
          )}
        </>
      )}
      {grade && result && vehicle && (
        <div
          id="comparison-details"
          aria-live="polite"
          className="scroll-mt-24 space-y-5 border-t pt-5"
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="mb-2 text-xs font-bold tracking-wide text-muted-foreground">
                サイズの比較結果
              </p>
              <MatchBadge result={result.match.result} />
              <p className="mt-3 text-sm leading-6">
                {result.match.result === "ng"
                  ? "登録された制限を超える項目があります。"
                  : missing.length
                    ? "情報が不足しているため、入庫条件の確認が必要です。"
                    : result.match.result === "caution"
                      ? "制限値に近い項目があります。利用前に施設へ確認してください。"
                      : "比較した4項目は、登録された制限内です。"}
              </p>
            </div>
            <MyCarToggle
              slug={vehicle.slug}
              name={vehicle.name}
              makerName={vehicle.makerName}
              generationId={grade.generationId}
              trimId={grade.trimId}
              gradeName={gradeLabel(grade)}
              lengthMm={grade.lengthMm ?? undefined}
              widthMm={grade.widthMm ?? undefined}
              heightMm={grade.heightMm ?? undefined}
              weightKg={grade.weightKg ?? undefined}
            />
          </div>
          <div className="rounded-xl bg-muted/60 p-4 text-xs leading-6">
            <p className="font-bold">
              {vehicle.name} ·{" "}
              {explicit ? "選択したグレード" : "代表グレードでの参考判定"}
            </p>
            <p>{gradeLabel(grade)}</p>
            <VehicleSpecificationNote grade={grade} />
            {!explicit && (
              <p className="text-muted-foreground">
                実際の世代・グレードを上の選択欄で確認してください。
              </p>
            )}
            <p className="mt-1">
              駐車区画：
              {result.restriction.restriction_name || "登録された制限"}
            </p>
            {result.restriction.notes && <p>{result.restriction.notes}</p>}
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {result.match.details.map((detail) => (
              <DimensionCompare
                key={detail.dimension}
                label={detail.label}
                value={detail.value}
                limit={detail.limit}
                unit={detail.dimension === "weight" ? "kg" : "mm"}
              />
            ))}
          </div>
          {missing.length > 0 && (
            <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900">
              未確認：{missing.map((item) => item.label).join("・")}
              。車両または施設のデータがありません。
            </p>
          )}
          <p className="flex gap-2 text-xs leading-6 text-muted-foreground">
            <Info className="mt-1 size-4 shrink-0" />
            空車状況は表示していません。装備・ミラー・タイヤ幅などの条件も施設へ確認してください。
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            {officialUrl && (
              <OfficialSiteLink
                href={officialUrl}
                parkingSlug={parkingSlug}
                className={buttonVariants({ className: "h-12 rounded-xl" })}
              >
                公式サイトで条件を確認
                <ArrowRight className="size-4" />
              </OfficialSiteLink>
            )}
            {mapUrl && (
              <a
                href={mapUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={buttonVariants({
                  variant: "outline",
                  className: "h-12 rounded-xl",
                })}
              >
                <MapPin className="size-4" />
                地図・経路を見る
              </a>
            )}
          </div>
        </div>
      )}
      {!vehicle && (
        <p className="text-sm leading-7 text-muted-foreground">
          全長・全幅・全高・重量を、駐車場の制限と比較します。車を選ぶと世代・グレードも確認できます。
        </p>
      )}
    </div>
  );
}
