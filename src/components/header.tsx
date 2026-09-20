import Link from "next/link";
import Image from "next/image";
import { getModelsForSearch } from "@/lib/queries";
import { HeaderSearch } from "./header-search";
import { HeaderMyCar } from "./header-my-car";
import { HeaderMobileNav } from "./header-mobile-nav";

const navLinks = [
  { href: "/car", label: "車種一覧" },
  { href: "/area", label: "エリア" },
  { href: "/articles", label: "コラム" },
] as const;

export async function Header() {
  const vehicles = await getModelsForSearch();

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-4 md:gap-8">
          {/* Logo */}
          <Link href="/" className="flex shrink-0 items-center gap-2 whitespace-nowrap">
            <Image src="/logo.svg" alt="トメピタ" width={28} height={28} />
            <span className="text-lg font-bold tracking-tight text-primary sm:text-xl">トメピタ</span>
          </Link>

          <div className="hidden sm:block"><HeaderMyCar /></div>

          {/* Desktop search */}
          <HeaderSearch vehicles={vehicles} className="hidden md:flex" />
        </div>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-6 md:flex">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Mobile search & nav */}
        <div className="flex items-center gap-2 md:hidden">
          <HeaderMobileNav navLinks={navLinks} vehicles={vehicles} />
        </div>
      </div>
    </header>
  );
}
