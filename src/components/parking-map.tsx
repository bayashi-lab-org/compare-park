"use client";
import { vehicleHref, type VehicleSelection } from "@/lib/vehicle-selection";

import { useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { ParkingMatchItem } from "@/lib/matching";
import { Info } from "lucide-react";

// 表示用データの型定義（判定結果あり・なし両対応）
export interface MapItem {
  parkingLotName: string;
  parkingLotSlug: string;
  latitude: number | null;
  longitude: number | null;
  parkingTypeLabel?: string;
  address?: string | null;
  result?: ParkingMatchItem["result"];
}

// Leafletのデフォルトアイコン設定
const DefaultIcon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

L.Marker.prototype.options.icon = DefaultIcon;

interface Props {
  selection?: VehicleSelection;
  items: MapItem[];
  center?: [number, number];
  zoom?: number;
}

// 判定結果に応じたアイコンの色分け（SVGを使用）
const createCustomIcon = (result?: ParkingMatchItem["result"]) => {
  const color =
    result === "ok" ? "#16A34A" : 
    result === "caution" ? "#D97706" : 
    result === "ng" ? "#DC2626" : 
    "#1B65A6"; // デフォルト（青）
  
  return L.divIcon({
    className: "custom-div-icon",
    html: `<div style="background-color: ${color}; width: 24px; height: 24px; border-radius: 50% 50% 50% 0; transform: rotate(-45deg); border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>`,
    iconSize: [24, 24],
    iconAnchor: [12, 24],
    popupAnchor: [0, -24],
  });
};

function MapUpdater({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center);
  }, [center, map]);
  return null;
}

export default function ParkingMap({ items, center, zoom = 14, selection }: Props) {
  // 座標があるデータのみ抽出
  const validItems = items.filter(
    (item) => item.latitude != null && item.longitude != null
  );

  // 中心座標の計算（指定がない場合は平均値）
  const defaultCenter: [number, number] = center || (validItems.length > 0
    ? [
        validItems.reduce((acc, curr) => acc + curr.latitude!, 0) / validItems.length,
        validItems.reduce((acc, curr) => acc + curr.longitude!, 0) / validItems.length,
      ]
    : [35.6895, 139.6917]);

  return (
    <div className="relative h-[400px] w-full overflow-hidden rounded-xl border bg-muted shadow-inner sm:h-[500px]">
      <MapContainer
        center={defaultCenter}
        zoom={zoom}
        scrollWheelZoom={false}
        className="h-full w-full"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {validItems.map((item) => (
          <Marker
            key={item.parkingLotSlug}
            position={[item.latitude!, item.longitude!]}
            icon={createCustomIcon(item.result)}
            eventHandlers={{
              click: () => {
                const element = document.getElementById(`parking-${item.parkingLotSlug}`);
                if (element) {
                  element.scrollIntoView({ behavior: "smooth", block: "center" });
                  element.classList.add("ring-2", "ring-primary", "ring-offset-2", "rounded-lg");
                  setTimeout(() => {
                    element.classList.remove("ring-2", "ring-primary", "ring-offset-2", "rounded-lg");
                  }, 2000);
                }
              },
            }}
          >
            <Popup>
              <div className="p-1 min-w-[140px]">
                <p className="font-bold text-sm leading-tight mb-1">{item.parkingLotName}</p>
                {item.result ? (
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                      item.result === "ok" ? "bg-match-ok text-white" : 
                      item.result === "caution" ? "bg-match-caution text-white" : 
                      "bg-match-ng text-white"
                    }`}>
                      {item.result === "ok" ? "駐車可能" : item.result === "caution" ? "注意" : "不可"}
                    </span>
                    <span className="text-[10px] text-muted-foreground">{item.parkingTypeLabel}</span>
                  </div>
                ) : (
                  <div className="mb-2">
                    <p className="text-[10px] text-muted-foreground line-clamp-1">{item.address}</p>
                  </div>
                )}
                
                <div className="flex flex-col gap-1.5 border-t pt-2 mt-1">
                  <a 
                    href={selection ? vehicleHref(`/parking/${item.parkingLotSlug}#checker`, selection) : `/parking/${item.parkingLotSlug}`}
                    className="inline-flex items-center gap-1.5 text-[11px] text-primary font-bold hover:underline"
                  >
                    <Info className="size-3" />
                    詳細ページへ
                  </a>
                  <button 
                    onClick={() => {
                      const element = document.getElementById(`parking-${item.parkingLotSlug}`);
                      element?.scrollIntoView({ behavior: "smooth", block: "center" });
                    }}
                    className="text-left text-[10px] text-muted-foreground hover:text-foreground underline underline-offset-4"
                  >
                    リストで詳しく見る
                  </button>
                </div>
              </div>
            </Popup>
          </Marker>
        ))}
        {center && <MapUpdater center={center} />}
      </MapContainer>
    </div>
  );
}
