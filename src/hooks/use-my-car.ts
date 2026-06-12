"use client";

import { useSyncExternalStore } from "react";

interface MyCar {
  slug: string;
  name: string;
  makerName: string;
  lengthMm?: number;
  widthMm?: number;
  heightMm?: number;
  weightKg?: number;
}

const STORAGE_KEY = "tomepita_my_car";
const CHANGE_EVENT = "tomepita:my-car-change";

// getSnapshot は同一内容なら同一参照を返す必要があるため、raw 文字列でキャッシュする
let cachedRaw: string | null = null;
let cachedCar: MyCar | null = null;

function getSnapshot(): MyCar | null {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw === cachedRaw) return cachedCar;
  cachedRaw = raw;
  if (!raw) {
    cachedCar = null;
    return null;
  }
  try {
    cachedCar = JSON.parse(raw) as MyCar;
  } catch (e) {
    console.error("Failed to parse my car from storage", e);
    cachedCar = null;
  }
  return cachedCar;
}

function getServerSnapshot(): MyCar | null {
  return null;
}

function subscribe(callback: () => void): () => void {
  const handleStorage = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY || e.key === null) callback();
  };
  // 同一タブ内の他コンポーネント（ヘッダー等）との同期
  window.addEventListener(CHANGE_EVENT, callback);
  // 別タブでの変更との同期
  window.addEventListener("storage", handleStorage);
  return () => {
    window.removeEventListener(CHANGE_EVENT, callback);
    window.removeEventListener("storage", handleStorage);
  };
}

const emptySubscribe = () => () => {};

export function useMyCar() {
  const myCar = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  // ハイドレーション完了後に true（SSR時のフラッシュ防止用）
  const isLoaded = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );

  const saveMyCar = (car: MyCar) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(car));
    window.dispatchEvent(new Event(CHANGE_EVENT));
  };

  const removeMyCar = () => {
    localStorage.removeItem(STORAGE_KEY);
    window.dispatchEvent(new Event(CHANGE_EVENT));
  };

  return { myCar, isLoaded, saveMyCar, removeMyCar };
}
