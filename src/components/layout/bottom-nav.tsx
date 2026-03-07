"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Library, Settings, Users } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * A mobile-only bottom navigation bar, providing the functional equivalent
 * of an Android BottomNavigationView.
 */
export default function BottomNav() {
  const pathname = usePathname();

  const navItems = [
    {
      label: "Home",
      href: "/",
      icon: Home,
    },
    {
      label: "My Scrapbooks",
      href: "/dashboard",
      icon: Library,
    },
    {
      label: "Shared",
      href: "#",
      icon: Users,
    },
    {
      label: "Settings",
      href: "/settings",
      icon: Settings,
    },
  ];

  return (
    <nav className="fixed bottom-0 left-0 z-50 flex h-16 w-full items-center justify-around border-t bg-background px-4 sm:hidden pb-safe">
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive = pathname === item.href;

        return (
          <Link
            key={item.label}
            href={item.href}
            className={cn(
              "flex flex-col items-center justify-center gap-1 transition-colors",
              isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Icon className={cn("h-5 w-5", isActive && "fill-primary/10")} />
            <span className="text-[10px] font-medium">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
