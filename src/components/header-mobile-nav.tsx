"use client";

import { useState, type ComponentProps } from "react";
import Link from "next/link";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetTrigger,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { HeaderSearch } from "./header-search";
import { HeaderMyCar } from "./header-my-car";
import { SearchPicker } from "./search-picker";
import { useRouter } from "next/navigation";

interface HeaderMobileNavProps {
  navLinks: readonly { href: string; label: string }[];
  vehicles: ComponentProps<typeof HeaderSearch>["vehicles"];
}

export function HeaderMobileNav({ navLinks, vehicles }: HeaderMobileNavProps) {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  return (
    <div className="flex items-center gap-2">
      <SearchPicker compact label="車種検索" placeholder="車種を検索" options={vehicles.map((vehicle) => ({ id: vehicle.slug, label: vehicle.name, description: vehicle.makerName }))} onSelect={(slug) => router.push(`/car/${slug}`)} />

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger render={<Button variant="ghost" size="icon" className="size-11" />}>
          <Menu className="size-5" />
          <span className="sr-only">メニューを開く</span>
        </SheetTrigger>
        <SheetContent side="right" className="w-[280px]">
          <SheetHeader>
            <SheetTitle>
              <span className="text-primary">トメピタ</span>
            </SheetTitle>
          </SheetHeader>
          <div className="px-4"><HeaderMyCar /></div>
          <nav className="mt-6 flex flex-col gap-4 px-4">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className="text-lg font-semibold text-foreground transition-colors hover:text-primary"
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </SheetContent>
      </Sheet>
    </div>
  );
}
