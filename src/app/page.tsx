import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Logo } from '@/components/icons/logo';
import Image from 'next/image';

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen">
      <header className="container mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Logo className="h-8 w-8 text-primary" />
          <h1 className="text-2xl font-bold font-headline text-foreground">
            MemoryLane Canvas
          </h1>
        </div>
        <nav className="flex items-center gap-4">
          <Button variant="ghost" asChild>
            <Link href="/login">Log In</Link>
          </Button>
          <Button asChild>
            <Link href="/signup">Sign Up</Link>
          </Button>
        </nav>
      </header>
      <main className="flex-grow flex items-center">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div className="space-y-6 text-center md:text-left">
              <h2 className="text-4xl md:text-6xl font-headline font-bold text-foreground leading-tight">
                Your creative canvas for digital storytelling.
              </h2>
              <p className="text-lg text-muted-foreground">
                Move away from rigid templates. With MemoryLane, you get a free-form, creative canvas to bring your memories to life, exactly the way you envision them.
              </p>
              <div className="flex gap-4 justify-center md:justify-start">
                <Button size="lg" asChild>
                  <Link href="/signup">Get Started for Free</Link>
                </Button>
              </div>
            </div>
            <div className="relative h-64 md:h-96">
                <Image
                  src="https://picsum.photos/seed/landing-hero/1200/800"
                  alt="A collage of memorable moments"
                  fill
                  className="object-cover rounded-2xl shadow-2xl"
                  data-ai-hint="scrapbook collage"
                  priority
                />
            </div>
          </div>
        </div>
      </main>
      <footer className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 text-center text-muted-foreground text-sm">
        &copy; {new Date().getFullYear()} MemoryLane Canvas. All rights reserved.
      </footer>
    </div>
  );
}
