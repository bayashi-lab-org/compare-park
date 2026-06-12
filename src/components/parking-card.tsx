import Image from "next/image";
import Link from "next/link";
import { MapPin } from "lucide-react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MatchBadge } from "@/components/match-badge";
import type { MatchResult } from "@/lib/matching";

const parkingTypeLabels: Record<string, string> = {
  mechanical: "機械式",
  self_propelled: "自走式",
  flat: "平面",
  tower: "タワー式",
};

const parkingTypeImages: Record<string, string> = {
  mechanical: "/images/parking/mechanical.jpg",
  self_propelled: "/images/parking/self_propelled.jpg",
  flat: "/images/parking/flat.jpg",
  tower: "/images/parking/tower.jpg",
};

interface ParkingCardProps {
  slug: string;
  name: string;
  address?: string | null;
  parkingType?: string | null;
  maxLengthMm?: number | null;
  maxWidthMm?: number | null;
  maxHeightMm?: number | null;
  maxWeightKg?: number | null;
  matchResult?: MatchResult;
  id?: string;
}

export function ParkingCard({
  slug,
  name,
  address,
  parkingType,
  maxLengthMm,
  maxWidthMm,
  maxHeightMm,
  maxWeightKg,
  matchResult,
  id,
}: ParkingCardProps) {
  return (
    <Link id={id} href={`/parking/${slug}`} className="block scroll-mt-20 transition-transform hover:scale-[1.02]">
      <Card className="h-full overflow-hidden">
        {parkingType && parkingTypeImages[parkingType] && (
          <div className="relative h-32 w-full bg-muted/30">
            <Image
              src={parkingTypeImages[parkingType]}
              alt={parkingTypeLabels[parkingType] ?? parkingType}
              fill
              className="object-contain p-2"
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            />
          </div>
        )}
        <CardHeader className={parkingType && parkingTypeImages[parkingType] ? "pt-3" : ""}>
          <div className="flex items-center justify-between gap-2">
            <CardTitle className="text-base font-semibold">{name}</CardTitle>
            {matchResult && <MatchBadge result={matchResult} />}
          </div>
          <CardDescription className="flex items-center gap-2">
            {address && (
              <span className="flex items-center gap-1">
                <MapPin className="size-3 shrink-0" />
                {address}
              </span>
            )}
            {parkingType && (
              <Badge variant="outline" className="text-xs">
                {parkingTypeLabels[parkingType] ?? parkingType}
              </Badge>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
            {maxLengthMm != null && <span>全長制限 {maxLengthMm.toLocaleString()}mm</span>}
            {maxWidthMm != null && <span>全幅制限 {maxWidthMm.toLocaleString()}mm</span>}
            {maxHeightMm != null && <span>全高制限 {maxHeightMm.toLocaleString()}mm</span>}
            {maxWeightKg != null && <span>重量制限 {maxWeightKg.toLocaleString()}kg</span>}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
