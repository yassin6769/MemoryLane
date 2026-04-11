
"use client";

import { useCollection, useFirestore, useUser, useMemoFirebase } from "@/firebase";
import ScrapbookCard from "@/components/dashboard/scrapbook-card";
import { collection, query, where } from "firebase/firestore";
import { Loader2, Users } from "lucide-react";

export default function SharedPage() {
  const db = useFirestore();
  const { user, isUserLoading } = useUser();

  /**
   * Query scrapbooks that have been explicitly shared with the current user.
   * Uses the sharedWith array-contains filter as requested.
   */
  const sharedQuery = useMemoFirebase(() => {
    if (!user) return null;
    return query(
      collection(db, "scrapbooks"),
      where("sharedWith", "array-contains", user.uid)
    );
  }, [db, user]);

  const { data: scrapbooks, isLoading } = useCollection<any>(sharedQuery);

  if (isUserLoading || isLoading) {
    return (
      <div className="flex h-[70vh] w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto">
      <div className="flex flex-col gap-2 mb-8">
        <h1 className="text-3xl font-bold font-headline flex items-center gap-3">
          <Users className="h-8 w-8 text-primary" />
          Shared with Me
        </h1>
        <p className="text-muted-foreground italic">Memories created together by your friends and family.</p>
      </div>

      {scrapbooks && scrapbooks.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {scrapbooks.map((scrapbook) => (
            <ScrapbookCard key={scrapbook.id} scrapbook={scrapbook} />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center h-64 border-2 border-dashed rounded-xl bg-muted/20">
          <Users className="h-12 w-12 text-muted-foreground/30 mb-4" />
          <p className="text-muted-foreground">No scrapbooks have been shared with you yet.</p>
          <p className="text-sm text-muted-foreground/60">When friends invite you as a collaborator, they'll appear here.</p>
        </div>
      )}
    </div>
  );
}
