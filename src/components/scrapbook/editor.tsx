
"use client";

import { useFirestore, useCollection, useMemoFirebase } from "@/firebase";
import { Canvas } from "@/components/scrapbook/canvas";
import { Toolbar } from "@/components/scrapbook/toolbar";
import { PagePagination } from "@/components/scrapbook/page-pagination";
import { EditingPanel } from "@/components/scrapbook/editing-panel";
import { SaveIndicator } from "@/components/scrapbook/save-indicator";
import { useState, useEffect, useCallback } from "react";
import { collection, doc, query, orderBy, setDoc, serverTimestamp, addDoc, updateDoc, increment } from "firebase/firestore";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface ScrapbookEditorProps {
  scrapbook: any;
  initialPageId?: string;
}

export function ScrapbookEditor({ scrapbook }: ScrapbookEditorProps) {
  const db = useFirestore();
  const { toast } = useToast();
  const [activePageIndex, setActivePageIndex] = useState(0);
  const [localItems, setLocalItems] = useState<any[]>([]);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [isAddingPage, setIsAddingPage] = useState(false);
  const [direction, setDirection] = useState<'next' | 'prev' | null>(null);
  const [isFlipping, setIsFlipping] = useState(false);

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
      const scrapbookRef = doc(db, "scrapbooks", scrapbook.id);
      
      setDoc(newPageRef, {
        id: newPageId,
        scrapbookId: scrapbook.id,
        pageNumber: 1,
        members: scrapbook.members,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      // Update parent scrapbook metadata
      updateDoc(scrapbookRef, {
        pageCount: 1,
        updatedAt: serverTimestamp()
      });
    }
  }, [pages, isPagesLoading, db, scrapbook.id, scrapbook.members]);

  const activePage = pages?.[activePageIndex];
  const activePageId = activePage?.id;

  const objectsQuery = useMemoFirebase(() => {
    if (!activePageId) return null;
    return collection(db, "scrapbooks", scrapbook.id, "pages", activePageId, "canvasObjects");
  }, [db, scrapbook.id, activePageId]);

  const { data: serverItems } = useCollection<any>(objectsQuery);

  useEffect(() => {
    if (serverItems) {
      setLocalItems(serverItems);
    }
  }, [serverItems, activePageId]);

  // Live update function to provide instant UI feedback (optimistic)
  const handleLiveUpdate = useCallback((id: string, updates: any) => {
    setLocalItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, ...updates } : item))
    );
  }, []);

  const updateItemPositionLocal = (id: string, x: number, y: number) => {
    handleLiveUpdate(id, { x, y });
  };

  const handleNextPage = () => {
    if (pages && activePageIndex < pages.length - 1 && !isFlipping) {
      setSelectedItemId(null); // Clear selection on page flip
      setDirection('next');
      setIsFlipping(true);
      setTimeout(() => {
        setActivePageIndex(prev => prev + 1);
        setIsFlipping(false);
      }, 600);
    }
  };

  const handlePrevPage = () => {
    if (activePageIndex > 0 && !isFlipping) {
      setSelectedItemId(null); // Clear selection on page flip
      setDirection('prev');
      setIsFlipping(true);
      setTimeout(() => {
        setActivePageIndex(prev => prev - 1);
        setIsFlipping(false);
      }, 600);
    }
  };

  const handleAddPage = async () => {
    if (isAddingPage) return;
    setIsAddingPage(true);

    try {
      const pagesCol = collection(db, "scrapbooks", scrapbook.id, "pages");
      const scrapbookRef = doc(db, "scrapbooks", scrapbook.id);
      
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
      await setDoc(docRef, { ...newPageData, id: docRef.id }, { merge: true });

      updateDoc(scrapbookRef, {
        pageCount: increment(1),
        updatedAt: serverTimestamp()
      });

      toast({
        title: "Page Added",
        description: `Created page ${nextNumber}.`,
      });

      setSelectedItemId(null);
      setDirection('next');
      setIsFlipping(true);
      setTimeout(() => {
        if (pages) setActivePageIndex(pages.length);
        setIsFlipping(false);
      }, 600);
      
    } catch (error) {
      console.error("Failed to add page", error);
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

  const selectedItem = localItems.find(i => i.id === selectedItemId);

  return (
    <div className="flex flex-col h-full gap-4 pb-32">
      <div className="flex items-center justify-between">
        <Toolbar 
          scrapbook={scrapbook} 
          pageId={activePageId} 
          items={localItems} 
        />
        <div className="hidden sm:block">
          <SaveIndicator />
        </div>
      </div>
      
      <div className="flex-grow flex flex-col gap-4 perspective-1000">
        <PagePagination 
          currentPage={activePage.pageNumber}
          totalPages={pages?.length || 1}
          onPrev={handlePrevPage}
          onNext={handleNextPage}
          onAddPage={handleAddPage}
          isAddingPage={isAddingPage}
          disabled={scrapbook.isFinalized || isFlipping}
        />

        <div className={cn(
          "relative flex-grow preserve-3d transition-transform duration-700",
          isFlipping && direction === 'next' && "animate-page-flip-next origin-left-center",
          isFlipping && direction === 'prev' && "animate-page-flip-prev origin-right-center",
          !isFlipping && direction === 'next' && "animate-page-enter-next",
          !isFlipping && direction === 'prev' && "animate-page-enter-prev"
        )}>
          <Canvas 
            key={activePageId}
            scrapbookId={scrapbook.id}
            pageId={activePageId}
            items={localItems} 
            selectedItemId={selectedItemId}
            onSelectItem={setSelectedItemId}
            onUpdateItemPosition={updateItemPositionLocal} 
          />
        </div>
      </div>

      <div className="sm:hidden fixed top-20 right-4 z-[60]">
        <SaveIndicator />
      </div>

      {selectedItem && (
        <EditingPanel 
          selectedItem={selectedItem}
          allItems={localItems}
          scrapbookId={scrapbook.id}
          pageId={activePageId}
          onClose={() => setSelectedItemId(null)}
          onLiveUpdate={handleLiveUpdate}
        />
      )}
    </div>
  );
}
