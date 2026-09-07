"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { destinations } from "@/lib/shared/navigation";
export function Navigation() {
  const path = usePathname();
  return (
    <nav aria-label="Main destinations" className="main-nav">
      {destinations.map((d) => (
        <Link
          key={d.href}
          href={d.href}
          aria-current={path === d.href ? "page" : undefined}
        >
          <span aria-hidden="true">{d.symbol}</span>
          <span>{d.label}</span>
        </Link>
      ))}
    </nav>
  );
}
