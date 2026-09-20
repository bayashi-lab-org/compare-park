"use client";

import { useState, type ComponentProps } from "react";
import Link from "next/link";
import { Menu, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetTrigger,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { HeaderSearch } from "./header-search";

interface HeaderMobileNavProps {
  navLinks: readonly { href: string; label: string }[];
  vehicles: ComponentProps<typeof HeaderSearch>["vehicles"];
}

export function HeaderMobileNav({ navLinks, vehicles }: HeaderMobileNavProps) {
  const [open, setOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  return (
    <div className="flex items-center gap-2">
      {searchOpen ? (
        <div className="flex items-center gap-2 animate-in slide-in-from-right-2 duration-200">
          <HeaderSearch vehicles={vehicles} className="w-[180px]" />
          <Button variant="ghost" size="icon" onClick={() => setSearchOpen(false)}>
            <span className="text-xs font-bold">閉じる</span>
          </Button>
        </div>
      ) : (
        <Button variant="ghost" size="icon" onClick={() => setSearchOpen(true)}>
          <Search className="size-5" />
          <span className="sr-only">検索</span>
        </Button>
      )}

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger render={<Button variant="ghost" size="icon" />}>
          <Menu className="size-5" />
          <span className="sr-only">メニューを開く</span>
        </SheetTrigger>
        <SheetContent side="right" className="w-[280px]">
          <SheetHeader>
            <SheetTitle>
              <span className="text-primary">トメピタ</span>
            </SheetTitle>
          </SheetHeader>
          <nav className="mt-8 flex flex-col gap-4">
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
