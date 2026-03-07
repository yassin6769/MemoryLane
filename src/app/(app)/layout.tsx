import AppSidebar from "@/components/layout/sidebar";
import AppHeader from "@/components/layout/header";
import BottomNav from "@/components/layout/bottom-nav";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen w-full bg-muted/40">
      <AppSidebar />
      <div className="flex flex-col w-full sm:gap-4 sm:py-4 sm:pl-14">
        <AppHeader />
        <main className="flex-1 gap-4 p-4 pb-20 sm:px-6 sm:py-0 md:gap-8 sm:pb-0">
            {children}
        </main>
      </div>
      <BottomNav />
    </div>
  );
}
