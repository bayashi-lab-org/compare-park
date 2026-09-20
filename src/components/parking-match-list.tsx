"use client";

import { useMemo, useState } from "react";
import { Search, RotateCcw, ChevronDown } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { SearchPicker } from "@/components/search-picker";
import { ParkingMatchRow } from "@/components/parking-match-row";
import {
  normalizeSearch,
  type VehicleSelection,
} from "@/lib/vehicle-selection";
import type { MatchResult, ParkingMatchItem } from "@/lib/matching";

const PAGE_SIZE = 12;
const FILTERS = [
  { key: "all", label: "すべて" },
  { key: "ok", label: "条件内" },
  { key: "caution", label: "要確認" },
  { key: "ng", label: "超過" },
] as const;

export function ParkingMatchList({
  items,
  selection,
  showSearch = true,
  showAreaFilter = false,
}: {
  items: ParkingMatchItem[];
  selection?: VehicleSelection;
  showSearch?: boolean;
  showAreaFilter?: boolean;
}) {
  const [activeFilter, setActiveFilter] = useState<"all" | MatchResult>("all");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [query, setQuery] = useState("");
  const [ward, setWard] = useState("");
  const extractWard = (address: string) =>
    address.match(/([\u4e00-\u9fa5]+区)/)?.[1] ?? "";
  const wards = useMemo(
    () =>
      [
        ...new Set(
          items
            .map((item) => extractWard(item.parkingLotAddress))
            .filter(Boolean),
        ),
      ].sort(),
    [items],
  );
  const scoped = useMemo(
    () =>
      items.filter(
        (item) =>
          (!ward || extractWard(item.parkingLotAddress) === ward) &&
          normalizeSearch(
            `${item.parkingLotName} ${item.parkingLotAddress}`,
          ).includes(normalizeSearch(query)),
      ),
    [items, ward, query],
  );
  const filtered =
    activeFilter === "all"
      ? scoped
      : scoped.filter((item) => item.result === activeFilter);
  const reset = () => {
    setQuery("");
    setWard("");
    setActiveFilter("all");
    setVisibleCount(PAGE_SIZE);
  };
  return (
    <div className="space-y-4">
      <div className="rounded-2xl border bg-white p-4 sm:p-5">
        <div
          className={
            showAreaFilter
              ? "grid items-end gap-4 sm:grid-cols-[1.4fr_1fr]"
              : ""
          }
        >
          {showSearch && (
            <div>
              <label
                htmlFor="parking-result-search"
                className="mb-2 block text-xs font-bold text-muted-foreground"
              >
                駐車場名・住所で絞り込む
              </label>
              <div className="relative">
                <Search className="absolute top-4 left-3 size-4 text-muted-foreground" />
                <Input
                  id="parking-result-search"
                  placeholder="例：渋谷、宮下公園"
                  value={query}
                  onChange={(event) => {
                    setQuery(event.target.value);
                    setVisibleCount(PAGE_SIZE);
                  }}
                  className="h-14 rounded-xl pl-10 text-base"
                />
              </div>
            </div>
          )}
          {showAreaFilter && (
            <SearchPicker
              label="エリア"
              placeholder="すべてのエリア"
              value={ward || "all"}
              options={[
                { id: "all", label: "すべてのエリア" },
                ...wards.map((ward) => ({ id: ward, label: ward })),
              ]}
              onSelect={(value) => {
                setWard(value === "all" ? "" : value);
                setVisibleCount(PAGE_SIZE);
              }}
            />
          )}
        </div>
        <div
          className="mt-5 grid grid-cols-4 gap-1 rounded-xl bg-muted p-1"
          aria-label="判定結果で絞り込む"
        >
          {FILTERS.map(({ key, label }) => (
            <Button
              key={key}
              variant="ghost"
              aria-pressed={activeFilter === key}
              onClick={() => {
                setActiveFilter(key);
                setVisibleCount(PAGE_SIZE);
              }}
              className={`h-auto min-h-12 flex-col gap-0 rounded-lg px-1 py-2 text-xs ${activeFilter === key ? "bg-white text-primary shadow-sm" : "text-muted-foreground"}`}
            >
              <span>{label}</span>
              <span className="text-sm font-bold tabular-nums">
                {(key === "all"
                  ? scoped.length
                  : scoped.filter((item) => item.result === key).length
                ).toLocaleString()}
              </span>
            </Button>
          ))}
        </div>
      </div>
      <div className="flex items-center justify-between gap-3">
        <p role="status" className="text-sm text-muted-foreground">
          <strong className="text-foreground">
            {filtered.length.toLocaleString()}
          </strong>
          件の候補
          {filtered.length > visibleCount && ` · ${visibleCount}件を表示`}
        </p>
        {(query || ward || activeFilter !== "all") && (
          <Button variant="ghost" onClick={reset} className="h-11 text-xs">
            <RotateCcw className="size-3.5" />
            条件をリセット
          </Button>
        )}
      </div>
      {filtered.length > 0 ? (
        <div className="overflow-hidden rounded-2xl border bg-white">
          {filtered.slice(0, visibleCount).map((item) => (
            <ParkingMatchRow
              key={item.restrictionId}
              item={item}
              selection={selection}
            />
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border bg-white p-8 text-center">
          <p className="font-bold">この条件の駐車場は見つかりませんでした</p>
          <p className="mt-2 text-sm leading-7 text-muted-foreground">
            エリアを広げるか、別の名前でお試しください。
          </p>
          <Button variant="outline" className="mt-5 h-11" onClick={reset}>
            絞り込みを解除する
          </Button>
        </div>
      )}
      {filtered.length > visibleCount && (
        <Button
          variant="outline"
          className="h-12 w-full rounded-xl bg-white"
          onClick={() => setVisibleCount((count) => count + PAGE_SIZE)}
        >
          さらに{Math.min(PAGE_SIZE, filtered.length - visibleCount)}件を見る
          <ChevronDown className="size-4" />
        </Button>
      )}
    </div>
  );
}
