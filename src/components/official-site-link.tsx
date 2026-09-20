"use client";

import { trackEvent } from "@/lib/analytics";

export function OfficialSiteLink({ href, parkingSlug, className, children }: { href: string; parkingSlug: string; className?: string; children?: React.ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer"
      className={className ?? "text-primary hover:underline"}
      onClick={() => trackEvent("parking_official_click", { parking_slug: parkingSlug })}>
      {children ?? "公式サイト"}
    </a>
  );
}
