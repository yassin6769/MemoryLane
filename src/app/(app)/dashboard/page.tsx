import { scrapbooks } from "@/lib/data";
import ScrapbookCard from "@/components/dashboard/scrapbook-card";
import { CreateScrapbookDialog } from "@/components/dashboard/create-scrapbook-dialog";

export default function Dashboard() {
  return (
    <div className="container mx-auto">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold font-headline">Your Scrapbooks</h1>
        <CreateScrapbookDialog />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {scrapbooks.map((scrapbook) => (
          <ScrapbookCard key={scrapbook.id} scrapbook={scrapbook} />
        ))}
      </div>
    </div>
  );
}
