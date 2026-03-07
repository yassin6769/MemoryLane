
"use client";

import { useFirestore, useCollection, useMemoFirebase } from "@/firebase";
import { Canvas } from "@/components/scrapbook/canvas";
import { Toolbar } from "@/components/scrapbook/toolbar";
import { PagePagination } from "@/components/scrapbook/page-pagination";
import { useState, useEffect } from "react";
import { collection, doc, query, orderBy, setDoc, serverTimestamp, onSnapshot, addDoc, getDocs, limit } from "firebase/firestore";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";

interface ScrapbookEditorProps {
  scrapbook: any;
  initialPageId?: string;
}

export function ScrapbookEditor({ scrapbook }: ScrapbookEditorProps) {
  const db = useFirestore();
  const { toast } = useToast();
  const [activePageIndex, setActivePageIndex] = useState(0);
  const [localItems, setLocalItems] = useState<any[]>([]);
  const [isAddingPage, setIsAddingPage] = useState(false);

  // Fetch all pages for this scrapbook ordered by pageNumber
  const pagesQuery = useMemoFirebase(() => {
    return query(
      collection(db, "scrapbooks", scrapbook.id, "pages"),
      orderBy("pageNumber", "asc")
    );
  }, [db, scrapbook.id]);

  const { data: pages, isLoading: isPagesLoading } = useCollection<any>(pagesQuery);

  // Ensure at least one page exists
  useEffect(() => {
    if (isPagesLoading || !pages) return;

    if (pages.length === 0) {
      const pagesCol = collection(db, "scrapbooks", scrapbook.id, "pages");
      const newPageId = "page_" + Date.now();
      const newPageRef = doc(pagesCol, newPageId);
      
      setDoc(newPageRef, {
        id: newPageId,
        scrapbookId: scrapbook.id,
        pageNumber: 1,
        members: scrapbook.members,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
  }, [pages, isPagesLoading, db, scrapbook.id, scrapbook.members]);

  const activePage = pages?.[activePageIndex];
  const activePageId = activePage?.id;

  // Fetch objects for the active page
  const objectsQuery = useMemoFirebase(() => {
    if (!activePageId) return null;
    return collection(db, "scrapbooks", scrapbook.id, "pages", activePageId, "canvasObjects");
  }, [db, scrapbook.id, activePageId]);

  const { data: serverItems, isLoading: isItemsLoading } = useCollection<any>(objectsQuery);

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

  const handleAddPage = async () => {
    if (isAddingPage) return;
    setIsAddingPage(true);

    try {
      const pagesCol = collection(db, "scrapbooks", scrapbook.id, "pages");
      
      // Calculate next page number
      const nextNumber = pages && pages.length > 0 
        ? Math.max(...pages.map(p => p.pageNumber)) + 1 
        : 1;

      const newPageData = {
        scrapbookId: scrapbook.id,
        pageNumber: nextNumber,
        members: scrapbook.members,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      const docRef = await addDoc(pagesCol, newPageData);
      
      // Update the ID in the doc itself for consistency
      await setDoc(docRef, { ...newPageData, id: docRef.id }, { merge: true });

      toast({
        title: "Page Added",
        description: `Created page ${nextNumber}.`,
      });

      // Move to the new page
      if (pages) {
        setActivePageIndex(pages.length);
      }
    } catch (error) {
      console.error("Failed to add page", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Could not create a new page.",
      });
    } finally {
      setIsAddingPage(false);
    }
  };

  if (isPagesLoading || !activePage) {
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
      
      <div className="flex-grow rounded-lg overflow-hidden flex flex-col gap-4">
        <PagePagination 
          currentPage={activePage.pageNumber}
          totalPages={pages?.length || 1}
          onPrev={() => setActivePageIndex(prev => Math.max(0, prev - 1))}
          onNext={() => setActivePageIndex(prev => Math.min((pages?.length || 1) - 1, prev + 1))}
          onAddPage={handleAddPage}
          isAddingPage={isAddingPage}
          disabled={scrapbook.isFinalized}
        />

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
