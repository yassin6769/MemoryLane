
"use client";

import { useCollection, useFirestore, useUser, useMemoFirebase } from "@/firebase";
import ScrapbookCard from "@/components/dashboard/scrapbook-card";
import { CreateScrapbookDialog } from "@/components/dashboard/create-scrapbook-dialog";
import { collection, query, where } from "firebase/firestore";
import { Loader2 } from "lucide-react";

export default function Dashboard() {
  const db = useFirestore();
  const { user, isUserLoading } = useUser();

  /**
   * Query scrapbooks where the current user is a member.
   * NOTE: We removed orderBy("updatedAt") to avoid requiring dynamic composite indexes
   * for every possible user ID, which is a Firestore limitation for map-key queries.
   */
  const scrapbooksQuery = useMemoFirebase(() => {
    if (!user) return null;
    return query(
      collection(db, "scrapbooks"),
      where(`members.${user.uid}`, "in", ["owner", "editor", "viewer"])
    );
  }, [db, user]);

  const { data: scrapbooks, isLoading } = useCollection<any>(scrapbooksQuery);

  if (isUserLoading || isLoading) {
    return (
      <div className="flex h-[70vh] w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto">
      {/* Header with Title and Actions */}
      <div className="flex flex-col gap-6 mb-8">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold font-headline">Your Scrapbooks</h1>
          <CreateScrapbookDialog />
        </div>
      </div>

      {/* Main Grid Content */}
      {scrapbooks && scrapbooks.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {scrapbooks.map((scrapbook) => (
            <ScrapbookCard key={scrapbook.id} scrapbook={scrapbook} />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center h-64 border-2 border-dashed rounded-xl bg-muted/20">
          <p className="text-muted-foreground mb-4">You haven't created any scrapbooks yet.</p>
          <CreateScrapbookDialog />
        </div>
      )}
    </div>
  );
}
