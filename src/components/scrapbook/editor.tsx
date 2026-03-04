"use client";

import { useFirestore, useCollection, useMemoFirebase } from "@/firebase";
import { Canvas } from "@/components/scrapbook/canvas";
import { Toolbar } from "@/components/scrapbook/toolbar";
import { useState, useEffect } from "react";
import { collection, doc, query, orderBy, limit, setDoc, serverTimestamp, onSnapshot } from "firebase/firestore";
import { Skeleton } from "@/components/ui/skeleton";

interface ScrapbookEditorProps {
  scrapbook: any;
  initialPageId?: string;
}

export function ScrapbookEditor({ scrapbook, initialPageId }: ScrapbookEditorProps) {
  const db = useFirestore();
  const [activePageId, setActivePageId] = useState<string | null>(null);
  const [localItems, setLocalItems] = useState<any[]>([]);

  // Fetch or create a page
  useEffect(() => {
    const pagesCol = collection(db, "scrapbooks", scrapbook.id, "pages");
    const q = query(pagesCol, orderBy("pageNumber", "asc"), limit(1));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (!snapshot.empty) {
        setActivePageId(snapshot.docs[0].id);
      } else {
        // Create first page if none exists
        const newPageId = "page_" + Date.now();
        const newPageRef = doc(db, "scrapbooks", scrapbook.id, "pages", newPageId);
        setDoc(newPageRef, {
          id: newPageId,
          scrapbookId: scrapbook.id,
          pageNumber: 1,
          members: scrapbook.members,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        setActivePageId(newPageId);
      }
    });

    return () => unsubscribe();
  }, [db, scrapbook.id, scrapbook.members]);

  const objectsQuery = useMemoFirebase(() => {
    if (!activePageId) return null;
    return collection(db, "scrapbooks", scrapbook.id, "pages", activePageId, "canvasObjects");
  }, [db, scrapbook.id, activePageId]);

  const { data: serverItems, isLoading } = useCollection<any>(objectsQuery);

  // Sync server items to local state for smooth dragging
  useEffect(() => {
    if (serverItems) {
      setLocalItems(serverItems);
    }
  }, [serverItems]);

  const updateItemPositionLocal = (id: string, x: number, y: number) => {
    setLocalItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, x, y } : item))
    );
  };

  if (!activePageId || isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-[70vh] w-full" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full gap-4">
      <Toolbar scrapbook={scrapbook} pageId={activePageId} />
      <div className="flex-grow rounded-lg overflow-hidden">
        <Canvas 
          scrapbookId={scrapbook.id}
          pageId={activePageId}
          items={localItems} 
          onUpdateItemPosition={updateItemPositionLocal} 
        />
      </div>
    </div>
  );
}
