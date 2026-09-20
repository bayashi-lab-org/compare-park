"use client";

import { trackEvent } from "@/lib/analytics";

export function OfficialSiteLink({ href, parkingSlug }: { href: string; parkingSlug: string }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer"
      className="text-primary hover:underline"
      onClick={() => trackEvent("parking_official_click", { parking_slug: parkingSlug })}>
      公式サイト
    </a>
  );
}
