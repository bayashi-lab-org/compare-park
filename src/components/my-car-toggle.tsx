"use client";

import { useMyCar } from "@/hooks/use-my-car";
import { Star, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface MyCarToggleProps {
  slug: string;
  name: string;
  makerName: string;
  lengthMm?: number;
  widthMm?: number;
  heightMm?: number;
  weightKg?: number;
  generationId?: number;
  trimId?: number;
  gradeName?: string;
}

export function MyCarToggle({ slug, name, makerName, lengthMm, widthMm, heightMm, weightKg, generationId, trimId, gradeName }: MyCarToggleProps) {
  const { myCar, isLoaded, saveMyCar, removeMyCar } = useMyCar();

  if (!isLoaded) return <div className="h-10 w-40" />;

  const isMyCar = myCar?.slug === slug && myCar?.generationId === generationId && myCar?.trimId === trimId;

  return (
    <Button
      variant={isMyCar ? "secondary" : "outline"}
      size="sm"
      className={`h-11 ${isMyCar ? "bg-match-ok/10 text-match-ok border-match-ok" : ""}`}
      onClick={() => {
        if (isMyCar) {
          removeMyCar();
        } else {
          saveMyCar({ slug, name, makerName, lengthMm, widthMm, heightMm, weightKg, generationId, trimId, gradeName });
        }
      }}
    >
      {isMyCar ? (
        <>
          <CheckCircle className="mr-2 size-4 fill-match-ok text-white" />
          マイカーに登録済み
        </>
      ) : (
        <>
          <Star className="mr-2 size-4" />
          この車をマイカーに登録
        </>
      )}
    </Button>
  );
}
