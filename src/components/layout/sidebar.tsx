
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Settings, Users, Library } from "lucide-react";
import { cn } from "@/lib/utils";

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Logo } from "@/components/icons/logo";

export default function AppSidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed inset-y-0 left-0 z-10 hidden w-14 flex-col border-r bg-background sm:flex">
      <TooltipProvider>
        <nav className="flex flex-col items-center gap-4 px-2 sm:py-5">
          <Link
            href="/dashboard"
            className="group flex h-9 w-9 shrink-0 items-center justify-center gap-2 rounded-full bg-primary text-lg font-semibold text-primary-foreground md:h-8 md:w-8 md:text-base"
          >
            <Logo className="h-5 w-5 transition-all group-hover:scale-110" />
            <span className="sr-only">MemoryLane Canvas</span>
          </Link>
          
          <Tooltip>
            <TooltipTrigger asChild>
              <Link
                href="/dashboard"
                className={cn(
                  "flex h-9 w-9 items-center justify-center rounded-lg transition-colors md:h-8 md:w-8",
                  pathname === "/dashboard" 
                    ? "bg-accent text-accent-foreground" 
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Library className="h-5 w-5" />
                <span className="sr-only">My Scrapbooks</span>
              </Link>
            </TooltipTrigger>
            <TooltipContent side="right">My Scrapbooks</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Link
                href="/shared"
                className={cn(
                  "flex h-9 w-9 items-center justify-center rounded-lg transition-colors md:h-8 md:w-8",
                  pathname === "/shared" 
                    ? "bg-accent text-accent-foreground" 
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Users className="h-5 w-5" />
                <span className="sr-only">Shared with me</span>
              </Link>
            </TooltipTrigger>
            <TooltipContent side="right">Shared with me</TooltipContent>
          </Tooltip>
        </nav>

        <nav className="mt-auto flex flex-col items-center gap-4 px-2 sm:py-5">
          <Tooltip>
            <TooltipTrigger asChild>
              <Link
                href="/settings"
                className={cn(
                  "flex h-9 w-9 items-center justify-center rounded-lg transition-colors md:h-8 md:w-8",
                  pathname === "/settings" 
                    ? "bg-accent text-accent-foreground" 
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Settings className="h-5 w-5" />
                <span className="sr-only">Settings</span>
              </Link>
            </TooltipTrigger>
            <TooltipContent side="right">Settings</TooltipContent>
          </Tooltip>
        </nav>
      </TooltipProvider>
    </aside>
  );
}
