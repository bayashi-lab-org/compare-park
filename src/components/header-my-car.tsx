"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { vehicleHref } from "@/lib/vehicle-selection";
import { useMyCar } from "@/hooks/use-my-car";
import { Car, ChevronDown, ChevronRight, X, Ruler, Weight, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "./ui/button";

export function HeaderMyCar() {
  const { myCar, isLoaded, removeMyCar } = useMyCar();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // 点击外部关闭
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  if (!isLoaded || !myCar) return null;

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1.5 text-xs font-bold text-primary transition-all hover:bg-primary/20",
          "animate-in fade-in slide-in-from-top-1 duration-500",
          isOpen && "bg-primary/20"
        )}
      >
        <Car className="size-3.5" />
        <span className="max-w-[52px] truncate sm:max-w-[120px]">{myCar.name}</span>
        <ChevronDown className={cn("size-3 transition-transform", isOpen && "rotate-180")} />
      </button>

      {isOpen && (
        <div className="absolute left-0 mt-2 w-72 rounded-xl border bg-background p-4 shadow-xl animate-in fade-in zoom-in-95 duration-200 sm:left-auto sm:right-0">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-sm font-bold">マイカー情報</h3>
            <button 
              onClick={() => setIsOpen(false)}
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="size-4" />
            </button>
          </div>

          <div className="mb-4 space-y-3">
            <div className="flex items-center justify-between border-b pb-2">
              <span className="text-xs text-muted-foreground">{myCar.makerName}</span>
              <span className="text-sm font-bold">{myCar.name}</span>
            </div>
            
            {(myCar.widthMm || myCar.heightMm) && (
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-lg bg-muted/50 p-2 text-center">
                  <div className="mb-1 flex items-center justify-center gap-1 text-[10px] text-muted-foreground">
                    <Ruler className="size-3" />
                    全幅
                  </div>
                  <div className="text-sm font-bold tabular-nums">
                    {myCar.widthMm?.toLocaleString() ?? "-"}
                    <span className="ml-0.5 text-[10px] font-normal">mm</span>
                  </div>
                </div>
                <div className="rounded-lg bg-muted/50 p-2 text-center">
                  <div className="mb-1 flex items-center justify-center gap-1 text-[10px] text-muted-foreground">
                    <ArrowRight className="size-3 rotate-90" />
                    全高
                  </div>
                  <div className="text-sm font-bold tabular-nums">
                    {myCar.heightMm?.toLocaleString() ?? "-"}
                    <span className="ml-0.5 text-[10px] font-normal">mm</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {myCar.gradeName && <p className="mb-4 text-xs leading-6 text-muted-foreground">{myCar.gradeName}</p>}
          <div className="space-y-2">
            <Link
              href={vehicleHref(`/car/${myCar.slug}`, { carSlug: myCar.slug, generationId: myCar.generationId, trimId: myCar.trimId })}
              onClick={() => setIsOpen(false)}
              className="flex w-full items-center justify-between rounded-lg bg-primary/5 px-3 py-2 text-xs font-bold text-primary transition-colors hover:bg-primary/10"
            >
              車種詳細ページを見る
              <ChevronRight className="size-3" />
            </Link>
            
            <Link
              href="/area"
              onClick={() => setIsOpen(false)}
              className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-xs font-medium transition-colors hover:bg-muted"
            >
              この車でエリアから探す
              <ChevronRight className="size-3" />
            </Link>
            
            <button
              onClick={() => {
                removeMyCar();
                setIsOpen(false);
              }}
              className="w-full pt-2 text-center text-[10px] text-muted-foreground hover:text-match-ng hover:underline"
            >
              マイカー登録を解除
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
