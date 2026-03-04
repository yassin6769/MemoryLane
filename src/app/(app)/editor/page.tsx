'use client';

import { useDoc, useFirestore, useMemoFirebase } from "@/firebase";
import { useSearchParams } from "next/navigation";
import { ScrapbookEditor } from "@/components/scrapbook/editor";
import { doc } from "firebase/firestore";
import { Skeleton } from "@/components/ui/skeleton";
import type { ScrapbookPageDef } from "@/lib/data";
import React, { Suspense } from 'react';

function EditorView() {
  const searchParams = useSearchParams();
  const id = searchParams.get('id');
  const firestore = useFirestore();

  const scrapbookRef = useMemoFirebase(() => {
    if (!id) return null;
    return doc(firestore, "scrapbooks", id);
  }, [firestore, id]);

  const { data: scrapbook, isLoading } = useDoc<any>(scrapbookRef);

  if (!id) {
    return (
        <div className="flex items-center justify-center h-full">
            <p>No scrapbook selected.</p>
        </div>
    )
  }

  if (isLoading) {
    return (
      <div className="h-full flex flex-col p-4 gap-4">
        <div className="flex items-center justify-between">
            <Skeleton className="h-10 w-1/3" />
            <Skeleton className="h-10 w-1/4" />
        </div>
        <Skeleton className="flex-grow w-full" />
      </div>
    );
  }

  if (!isLoading && !scrapbook) {
    return (
        <div className="flex items-center justify-center h-full">
            <p>Scrapbook not found. It may still be saving.</p>
        </div>
    );
  }

  // For a new scrapbook, there are no pages. We provide an empty page definition
  // to the editor to render an empty canvas. In a real app, you would fetch
  // pages from the subcollection and handle creating the first page.
  const page: ScrapbookPageDef = { id: 'page1', items: [] };

  return (
    <div className="h-full flex flex-col">
        <ScrapbookEditor scrapbook={scrapbook} initialPage={page} />
    </div>
  );
}

// We wrap the main view in a Suspense boundary, which is required when using the
// useSearchParams hook in a page that might be pre-rendered.
export default function EditorPage() {
  return (
    <Suspense fallback={
        <div className="h-full flex flex-col p-4 gap-4">
            <div className="flex items-center justify-between">
                <Skeleton className="h-10 w-1/3" />
                <Skeleton className="h-10 w-1/4" />
            </div>
            <Skeleton className="flex-grow w-full" />
        </div>
    }>
      <EditorView />
    </Suspense>
  );
}
