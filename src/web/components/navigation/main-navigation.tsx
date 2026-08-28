"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

const navigationItems = [
  { href: "/experiments", label: "Experiments" },
  { href: "/projects", label: "Projects" },
  { href: "/log", label: "Log" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
];

export function MainNavigation() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <nav aria-label="Main navigation" className="relative">
      <button
        type="button"
        className="inline-flex min-h-11 items-center border border-surface-border px-3 text-sm font-medium text-muted transition-colors hover:border-foreground hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground md:hidden"
        aria-expanded={isOpen}
        aria-controls="main-navigation-links"
        onClick={() => setIsOpen((open) => !open)}
      >
        {isOpen ? "Close" : "Menu"}
      </button>

      <ul
        id="main-navigation-links"
        className={`${isOpen ? "flex" : "hidden"} absolute right-0 top-14 z-10 min-w-48 flex-col gap-1 border border-surface-border bg-surface p-2 shadow-lg md:static md:flex md:min-w-0 md:flex-row md:items-center md:gap-6 md:border-0 md:bg-transparent md:p-0 md:shadow-none`}
      >
        {navigationItems.map((item) => (
          <li key={item.href}>
            <Link
              href={item.href}
              className="block px-3 py-2 text-sm text-muted transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground md:px-0 md:py-1"
              aria-current={pathname === item.href ? "page" : undefined}
              onClick={() => setIsOpen(false)}
            >
              {item.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
