"use client";

import { vehicleHref } from "@/lib/vehicle-selection";
import { useMyCar } from "@/hooks/use-my-car";
import { Car, ChevronRight, CheckCircle } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface MyCarWardBannerProps {
  wardSlug: string;
  wardName: string;
  className?: string;
}

export function MyCarWardBanner({ wardSlug, wardName, className }: MyCarWardBannerProps) {
  const { myCar, isLoaded } = useMyCar();

  if (!isLoaded) return null;

  if (!myCar) {
    return (
      <div className={cn(
        "relative overflow-hidden rounded-xl border-2 border-dashed border-muted-foreground/20 bg-muted/30 p-4 sm:p-6",
        className
      )}>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex size-12 shrink-0 items-center justify-center rounded-full bg-muted/50 text-muted-foreground">
              <Car className="size-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold">
                あなたの車で {wardName} の駐車場を判定
              </h3>
              <p className="text-sm text-muted-foreground">
                マイカーを登録すると、このエリアの駐車場に停められるか一括でチェックできます。
              </p>
            </div>
          </div>
          <Link
            href="/car"
            className="inline-flex h-11 items-center justify-center rounded-lg border bg-background px-6 text-sm font-bold transition-all hover:bg-muted active:scale-95"
          >
            車種を選んで登録する
            <ChevronRight className="ml-2 size-4" />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className={cn(
      "relative overflow-hidden rounded-xl border-2 border-primary/20 bg-primary/5 p-4 transition-all hover:border-primary/40 sm:p-6",
      "animate-in fade-in slide-in-from-bottom-2 duration-700",
      className
    )}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-4">
          <div className="flex size-12 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Car className="size-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-primary">保存した車で探す</span>
              <CheckCircle className="size-3 text-match-ok" />
            </div>
            <h3 className="text-lg font-bold">
              {myCar.name} での {wardName} 判定結果
            </h3>
            <p className="text-sm text-muted-foreground">
              登録済みのマイカーで、このエリアの駐車場に停められるか一括判定します。
            </p>
          </div>
        </div>
        <Link
          href={vehicleHref(`/area/${wardSlug}/car/${myCar.slug}`, { carSlug: myCar.slug, generationId: myCar.generationId, trimId: myCar.trimId })}
          className="inline-flex h-11 items-center justify-center rounded-lg bg-primary px-6 text-sm font-bold text-primary-foreground transition-all hover:bg-primary/90 hover:shadow-lg active:scale-95"
        >
          {myCar.name} で判定する
          <ChevronRight className="ml-2 size-4" />
        </Link>
      </div>
      
      {/* 背景の装飾 */}
      <div className="absolute -right-8 -top-8 size-32 rounded-full bg-primary/5 blur-3xl" />
    </div>
  );
}
