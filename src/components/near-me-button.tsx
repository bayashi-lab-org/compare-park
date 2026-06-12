"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MapPin, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useMyCar } from "@/hooks/use-my-car";

interface NearMeButtonProps {
  className?: string;
}

export function NearMeButton({ className }: NearMeButtonProps) {
  const router = useRouter();
  const { myCar } = useMyCar();
  const [loading, setLoading] = useState(false);

  const handleNearMe = () => {
    setLoading(true);
    if (!navigator.geolocation) {
      alert("お使いのブラウザは現在地取得に対応していません。");
      setLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        const carQuery = myCar ? `&car=${myCar.slug}` : "";
        router.push(`/search?lat=${latitude}&lng=${longitude}${carQuery}`);
        setLoading(false);
      },
      (error) => {
        console.error("Geolocation error:", error);
        alert(
          error.code === error.PERMISSION_DENIED
            ? "位置情報の利用が許可されていません。ブラウザの設定から位置情報を許可してください。"
            : "現在地の取得に失敗しました。電波状況を確認して再度お試しください。"
        );
        setLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  };

  return (
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
      現在地周辺で探す
    </Button>
  );
}
