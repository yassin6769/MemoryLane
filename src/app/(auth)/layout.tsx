import { Logo } from "@/components/icons/logo";
import Link from "next/link";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen w-full flex-col items-center justify-center bg-background">
      <div className="mb-8 text-center">
        <Link href="/" className="flex items-center justify-center gap-3">
            <Logo className="h-10 w-10 text-primary" />
            <h1 className="text-3xl font-bold font-headline text-foreground">
                MemoryLane Canvas
            </h1>
        </Link>
      </div>
      {children}
    </div>
  );
}
