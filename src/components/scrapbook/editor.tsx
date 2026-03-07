
"use client";

import { useFirestore, useCollection, useMemoFirebase } from "@/firebase";
import { Canvas } from "@/components/scrapbook/canvas";
import { Toolbar } from "@/components/scrapbook/toolbar";
import { PagePagination } from "@/components/scrapbook/page-pagination";
import { useState, useEffect } from "react";
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

  // Fetch objects for the active page
  const objectsQuery = useMemoFirebase(() => {
    if (!activePageId) return null;
    return collection(db, "scrapbooks", scrapbook.id, "pages", activePageId, "canvasObjects");
  }, [db, scrapbook.id, activePageId]);

  const { data: serverItems } = useCollection<any>(objectsQuery);

  // Sync server items to local state for smooth dragging
  useEffect(() => {
    if (serverItems) {
      setLocalItems(serverItems);
    }
  }, [serverItems, activePageId]);

  const updateItemPositionLocal = (id: string, x: number, y: number) => {
    setLocalItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, x, y } : item))
    );
  };

  const handleNextPage = () => {
    if (pages && activePageIndex < pages.length - 1 && !isFlipping) {
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

      // Atomically increment the total page count
      updateDoc(scrapbookRef, {
        pageCount: increment(1),
        updatedAt: serverTimestamp()
      });

      toast({
        title: "Page Added",
        description: `Created page ${nextNumber}.`,
      });

      // Navigate to the new page with a flip
      setDirection('next');
      setIsFlipping(true);
      setTimeout(() => {
        if (pages) setActivePageIndex(pages.length);
        setIsFlipping(false);
      }, 600);
      
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
            onUpdateItemPosition={updateItemPositionLocal} 
          />
        </div>
      </div>
    </div>
  );
}
