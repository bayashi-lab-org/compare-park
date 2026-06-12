"use client";

import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Car, MapPin, Search, X, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

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

interface InstantCheckFormProps {
  vehicles: Vehicle[];
  parkingLots: ParkingLot[];
}

/* ─── 検索モーダル（スマホ: フルスクリーン / PC: ドロップダウン風） ─── */

interface SearchModalProps<T> {
  open: boolean;
  onClose: () => void;
  title: string;
  placeholder: string;
  items: T[];
  search: string;
  onSearch: (v: string) => void;
  onSelect: (item: T) => void;
  renderItem: (item: T) => React.ReactNode;
  emptyMessage: string;
}

function SearchModal<T>({
  open,
  onClose,
  title,
  placeholder,
  items,
  search,
  onSearch,
  onSelect,
  renderItem,
  emptyMessage,
}: SearchModalProps<T>) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      // モーダル表示時にbodyスクロールを防止
      document.body.style.overflow = "hidden";
      // 少し遅延させてフォーカス（モバイルでキーボードが確実に出るように）
      const timer = setTimeout(() => inputRef.current?.focus(), 100);
      return () => {
        clearTimeout(timer);
        document.body.style.overflow = "";
      };
    }
    document.body.style.overflow = "";
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background sm:items-center sm:justify-center sm:bg-black/40 sm:supports-backdrop-filter:backdrop-blur-sm">
      {/* PC: 背景クリックで閉じる */}
      <div
        className="hidden sm:fixed sm:inset-0 sm:block"
        onClick={onClose}
        aria-hidden
      />

      <div className="relative flex h-full flex-col sm:mx-4 sm:h-[min(600px,80vh)] sm:w-full sm:max-w-2xl sm:rounded-2xl sm:border sm:bg-background sm:shadow-2xl">
        {/* ヘッダー + 検索入力 */}
        <div className="flex-none border-b px-4 pb-4 pt-5 sm:px-6">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-base font-semibold sm:text-lg">{title}</h2>
            <button
              type="button"
              onClick={onClose}
              className="flex size-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground sm:size-9"
            >
              <X className="size-5" />
            </button>
          </div>
          <div className="flex items-center gap-2 rounded-lg border bg-muted/30 px-3 py-2.5 sm:px-4 sm:py-3">
            <Search className="size-4 shrink-0 text-muted-foreground sm:size-5" />
            <input
              ref={inputRef}
              type="text"
              inputMode="search"
              enterKeyHint="search"
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
              placeholder={placeholder}
              value={search}
              onChange={(e) => onSearch(e.target.value)}
              className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground sm:text-base"
            />
            {search && (
              <button
                type="button"
                onClick={() => onSearch("")}
                className="flex size-5 shrink-0 items-center justify-center rounded-full bg-muted-foreground/20 text-muted-foreground"
              >
                <X className="size-3" />
              </button>
            )}
          </div>
        </div>

        {/* 候補リスト */}
        <div className="flex-1 overflow-y-auto overscroll-contain px-2 py-1 sm:px-3 sm:py-2">
          {items.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              {emptyMessage}
            </p>
          ) : (
            <ul role="listbox">
              {items.map((item, i) => (
                <li key={i} role="option" aria-selected={false}>
                  <button
                    type="button"
                    onClick={() => onSelect(item)}
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-3 text-left text-sm transition-colors active:bg-muted sm:px-4 sm:py-3 sm:text-base sm:hover:bg-muted"
                  >
                    <span className="min-w-0 flex-1">{renderItem(item)}</span>
                    <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── メインフォーム ─── */

export function InstantCheckForm({
  vehicles,
  parkingLots,
}: InstantCheckFormProps) {
  const router = useRouter();
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [selectedParking, setSelectedParking] = useState<ParkingLot | null>(null);
  const [vehicleOpen, setVehicleOpen] = useState(false);
  const [parkingOpen, setParkingOpen] = useState(false);
  const [vehicleSearch, setVehicleSearch] = useState("");
  const [parkingSearch, setParkingSearch] = useState("");

  const filteredVehicles = useMemo(() => {
    if (!vehicleSearch) return vehicles.slice(0, 30);
    const q = vehicleSearch.toLowerCase();
    return vehicles
      .filter(
        (v) =>
          v.name.toLowerCase().includes(q) ||
          v.makerName.toLowerCase().includes(q) ||
          `${v.makerName} ${v.name}`.toLowerCase().includes(q)
      )
      .slice(0, 30);
  }, [vehicles, vehicleSearch]);

  const filteredParkingLots = useMemo(() => {
    if (!parkingSearch) return parkingLots.slice(0, 30);
    const q = parkingSearch.toLowerCase();
    return parkingLots
      .filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          (p.address && p.address.toLowerCase().includes(q))
      )
      .slice(0, 30);
  }, [parkingLots, parkingSearch]);

  const openVehicleModal = useCallback(() => {
    setVehicleOpen(true);
    setParkingOpen(false);
  }, []);

  const openParkingModal = useCallback(() => {
    setParkingOpen(true);
    setVehicleOpen(false);
  }, []);

  const handleCheck = () => {
    if (!selectedVehicle) return;
    if (selectedParking) {
      router.push(
        `/parking/${selectedParking.slug}?car=${selectedVehicle.slug}#checker`
      );
    } else {
      router.push(`/car/${selectedVehicle.slug}`);
    }
  };

  return (
    <div className="mx-auto w-full max-w-3xl space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        {/* 車種選択トリガー */}
        <button
          type="button"
          onClick={openVehicleModal}
          className="flex w-full items-center gap-3 rounded-lg border-2 border-border bg-background px-4 py-3.5 text-left transition-colors hover:border-primary/40 hover:bg-muted sm:px-5 sm:py-4 sm:text-base"
        >
          <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 sm:size-9">
            <Car className="size-4 text-primary sm:size-5" />
          </div>
          {selectedVehicle ? (
            <span className="truncate font-medium">
              {selectedVehicle.makerName} {selectedVehicle.name}
            </span>
          ) : (
            <div>
              <span className="text-sm text-muted-foreground sm:text-base">車種を選択</span>
              <p className="text-xs text-muted-foreground sm:text-sm">メーカー名・車種名で検索</p>
            </div>
          )}
        </button>

        {/* 駐車場選択トリガー */}
        <button
          type="button"
          onClick={openParkingModal}
          className="flex w-full items-center gap-3 rounded-lg border-2 border-border bg-background px-4 py-3.5 text-left transition-colors hover:border-primary/40 hover:bg-muted sm:px-5 sm:py-4 sm:text-base"
        >
          <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 sm:size-9">
            <MapPin className="size-4 text-primary sm:size-5" />
          </div>
          {selectedParking ? (
            <span className="truncate font-medium">{selectedParking.name}</span>
          ) : (
            <div>
              <span className="text-sm text-muted-foreground sm:text-base">駐車場を選択（任意）</span>
              <p className="text-xs text-muted-foreground sm:text-sm">駐車場名・住所で検索</p>
            </div>
          )}
        </button>
      </div>

      <Button
        onClick={handleCheck}
        disabled={!selectedVehicle}
        className="w-full text-base sm:py-6 sm:text-lg"
        size="lg"
      >
        <Search className="mr-2 size-4 sm:size-5" />
        {selectedVehicle && selectedParking
          ? "判定する"
          : selectedVehicle
            ? "この車種の詳細を見る"
            : "車種を選択してください"}
      </Button>

      {/* 人気の車種クイック選択 */}
      {!selectedVehicle && (
        <div className="pt-2">
          <p className="mb-2 text-xs font-medium text-muted-foreground">人気の車種から選ぶ</p>
          <div className="flex flex-wrap gap-2">
            {[
              { name: "アルファード", slug: "alphard", maker: "トヨタ" },
              { name: "プリウス", slug: "prius", maker: "トヨタ" },
              { name: "ヴォクシー", slug: "voxy", maker: "トヨタ" },
              { name: "ハリアー", slug: "harrier", maker: "トヨタ" },
              { name: "N-BOX", slug: "n-box", maker: "ホンダ" },
            ].map((v) => (
              <button
                key={v.slug}
                onClick={() => setSelectedVehicle({ name: v.name, slug: v.slug, makerName: v.maker })}
                className="rounded-full border bg-background px-3 py-1 text-xs font-medium transition-colors hover:border-primary/50 hover:bg-primary/5"
              >
                {v.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 車種検索モーダル */}
      <SearchModal
        open={vehicleOpen}
        onClose={() => {
          setVehicleOpen(false);
          setVehicleSearch("");
        }}
        title="車種を選択"
        placeholder="車種名・メーカー名で検索..."
        items={filteredVehicles}
        search={vehicleSearch}
        onSearch={setVehicleSearch}
        onSelect={(v) => {
          setSelectedVehicle(v);
          setVehicleOpen(false);
          setVehicleSearch("");
        }}
        renderItem={(v) => (
          <span className="truncate">
            {v.makerName} {v.name}
          </span>
        )}
        emptyMessage="車種が見つかりません"
      />

      {/* 駐車場検索モーダル */}
      <SearchModal
        open={parkingOpen}
        onClose={() => {
          setParkingOpen(false);
          setParkingSearch("");
        }}
        title="駐車場を選択"
        placeholder="駐車場名・住所で検索..."
        items={filteredParkingLots}
        search={parkingSearch}
        onSearch={setParkingSearch}
        onSelect={(p) => {
          setSelectedParking(p);
          setParkingOpen(false);
          setParkingSearch("");
        }}
        renderItem={(p) => (
          <div className="min-w-0">
            <p className="truncate">{p.name}</p>
            {p.address && (
              <p className="truncate text-xs text-muted-foreground">
                {p.address}
              </p>
            )}
          </div>
        )}
        emptyMessage="駐車場が見つかりません"
      />
    </div>
  );
}
