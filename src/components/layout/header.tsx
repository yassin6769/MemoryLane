
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, Settings, Users, Library, Phone, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";
import { useUser } from "@/firebase";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Logo } from "../icons/logo";

export default function AppHeader() {
  const pathname = usePathname();
  const { user } = useUser();

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-background px-4 sm:static sm:h-auto sm:border-0 sm:bg-transparent sm:px-6">
      <Sheet>
        <SheetTrigger asChild>
          <Button size="icon" variant="outline" className="sm:hidden">
            <Menu className="h-5 w-5" />
            <span className="sr-only">Toggle Menu</span>
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="sm:max-w-xs">
          <nav className="grid gap-6 text-lg font-medium">
            <Link
              href="/dashboard"
              className="group flex h-10 w-10 shrink-0 items-center justify-center gap-2 rounded-full bg-primary text-lg font-semibold text-primary-foreground md:text-base"
            >
              <Logo className="h-5 w-5 transition-all group-hover:scale-110" />
              <span className="sr-only">MemoryLane Canvas</span>
            </Link>
            <Link
              href="/dashboard"
              className={cn(
                "flex items-center gap-4 px-2.5 transition-colors",
                pathname === "/dashboard" ? "text-foreground" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Library className="h-5 w-5" />
              My Scrapbooks
            </Link>
            <Link
              href="#"
              className={cn(
                "flex items-center gap-4 px-2.5 transition-colors",
                pathname === "/shared" ? "text-foreground" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Users className="h-5 w-5" />
              Shared with me
            </Link>
            <Link
              href="/settings"
              className={cn(
                "flex items-center gap-4 px-2.5 transition-colors",
                pathname === "/settings" ? "text-foreground" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Settings className="h-5 w-5" />
              Settings
            </Link>
          </nav>
        </SheetContent>
      </Sheet>

      <div className="ml-auto" />
      
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="rounded-full h-9 w-9 ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            <Avatar className="h-8 w-8">
              <AvatarImage src={user?.photoURL || ""} alt={user?.displayName || "User avatar"} />
              <AvatarFallback className="bg-primary/10 text-primary text-xs">
                {user?.displayName?.charAt(0) || "U"}
              </AvatarFallback>
            </Avatar>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel className="font-headline">My Account</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild>
            <Link href="/settings" className="flex items-center gap-2 cursor-pointer">
              <Settings className="h-4 w-4" /> Settings
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href="/contact" className="flex items-center gap-2 cursor-pointer">
              <Phone className="h-4 w-4" /> Contact Us
            </Link>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild>
            <Link href="/" className="flex items-center gap-2 text-destructive focus:text-destructive cursor-pointer">
              <LogOut className="h-4 w-4" /> Logout
            </Link>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
