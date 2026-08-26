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
        className="inline-flex min-h-11 items-center border border-zinc-300 px-3 text-sm font-medium text-zinc-700 transition-colors hover:border-zinc-950 hover:text-zinc-950 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-950 md:hidden"
        aria-expanded={isOpen}
        aria-controls="main-navigation-links"
        onClick={() => setIsOpen((open) => !open)}
      >
        {isOpen ? "Close" : "Menu"}
      </button>

      <ul
        id="main-navigation-links"
        className={`${isOpen ? "flex" : "hidden"} absolute right-0 top-14 z-10 min-w-48 flex-col gap-1 border border-zinc-200 bg-white p-2 shadow-lg md:static md:flex md:min-w-0 md:flex-row md:items-center md:gap-6 md:border-0 md:bg-transparent md:p-0 md:shadow-none`}
      >
        {navigationItems.map((item) => (
          <li key={item.href}>
            <Link
              href={item.href}
              className="block px-3 py-2 text-sm text-zinc-600 transition-colors hover:text-zinc-950 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-950 md:px-0 md:py-1"
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
