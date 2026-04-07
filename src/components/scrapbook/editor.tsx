
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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useAutoSave } from "@/hooks/use-auto-save";

interface ScrapbookEditorProps {
  scrapbook: any;
  initialPageId?: string;
}

export function ScrapbookEditor({ scrapbook }: ScrapbookEditorProps) {
  const db = useFirestore();
  const { toast } = useToast();
  const { debouncedUpdate } = useAutoSave();
  const [activePageIndex, setActivePageIndex] = useState(0);
  const [localItems, setLocalItems] = useState<any[]>([]);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [isAddingPage, setIsAddingPage] = useState(false);
  const [editingTextItem, setEditingTextItem] = useState<any | null>(null);
  const [tempText, setTempText] = useState("");

  const pagesQuery = useMemoFirebase(() => {
    return query(
      collection(db, "scrapbooks", scrapbook.id, "pages"),
      orderBy("pageNumber", "asc")
    );
  }, [db, scrapbook.id]);

  const { data: pages, isLoading: isPagesLoading } = useCollection<any>(pagesQuery);

  useEffect(() => {
    if (isPagesLoading || !pages) return;
    if (pages.length === 0) {
      const pagesCol = collection(db, "scrapbooks", scrapbook.id, "pages");
      const newPageId = "page_" + Date.now();
      const newPageRef = doc(pagesCol, newPageId);
      setDoc(newPageRef, {
        id: newPageId, scrapbookId: scrapbook.id, pageNumber: 1, backgroundColor: "#ffffff",
        members: scrapbook.members, createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
      });
      updateDoc(doc(db, "scrapbooks", scrapbook.id), { pageCount: 1, updatedAt: serverTimestamp() });
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
    if (serverItems) setLocalItems(serverItems);
  }, [serverItems, activePageId]);

  const handleLiveUpdate = useCallback((id: string, updates: any) => {
    setLocalItems((prev) => prev.map((item) => (item.id === id ? { ...item, ...updates } : item)));
  }, []);

  const handleAddPage = async () => {
    if (isAddingPage) return;
    setIsAddingPage(true);
    try {
      const pagesCol = collection(db, "scrapbooks", scrapbook.id, "pages");
      const nextNumber = pages ? pages.length + 1 : 1;
      const newPageData = {
        scrapbookId: scrapbook.id, pageNumber: nextNumber, backgroundColor: "#ffffff",
        members: scrapbook.members, createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
      };
      const docRef = await addDoc(pagesCol, newPageData);
      await setDoc(docRef, { ...newPageData, id: docRef.id }, { merge: true });
      updateDoc(doc(db, "scrapbooks", scrapbook.id), { pageCount: increment(1), updatedAt: serverTimestamp() });
      toast({ title: "Page Added" });
      setActivePageIndex(nextNumber - 1);
    } finally {
      setIsAddingPage(false);
    }
  };

  const handleEditText = (item: any) => {
    setEditingTextItem(item);
    setTempText(item.text || "");
  };

  const saveEditedText = () => {
    if (!editingTextItem || !activePageId) return;
    
    const finalContent = tempText.trim();
    if (finalContent === "") {
        toast({ title: "Text cannot be empty", variant: "destructive" });
        return;
    }

    handleLiveUpdate(editingTextItem.id, { text: finalContent });
    debouncedUpdate(scrapbook.id, activePageId, editingTextItem.id, { text: finalContent });
    setEditingTextItem(null);
    toast({ title: "Text updated" });
  };

  if (isPagesLoading || !activePage) return <Skeleton className="h-[80vh] w-full" />;

  const selectedItem = localItems.find(i => i.id === selectedItemId);

  return (
    <div className="flex flex-col h-full gap-4 pb-32">
      <Toolbar scrapbook={scrapbook} pageId={activePageId} items={localItems} currentPageData={activePage} />
      <PagePagination currentPage={activePage.pageNumber} totalPages={pages?.length || 1} onPrev={() => setActivePageIndex(p => p - 1)} onNext={() => setActivePageIndex(p => p + 1)} onAddPage={handleAddPage} isAddingPage={isAddingPage} />
      <Canvas 
        scrapbookId={scrapbook.id} 
        pageId={activePageId} 
        items={localItems} 
        backgroundColor={activePage.backgroundColor} 
        selectedItemId={selectedItemId} 
        onSelectItem={setSelectedItemId} 
        onUpdateItemPosition={(id, x, y) => handleLiveUpdate(id, { x, y })} 
        onEditText={handleEditText}
      />
      {selectedItem && (
        <EditingPanel 
          selectedItem={selectedItem} 
          allItems={localItems} 
          scrapbookId={scrapbook.id} 
          pageId={activePageId} 
          currentCoverImage={scrapbook.coverImage} 
          onClose={() => setSelectedItemId(null)} 
          onLiveUpdate={handleLiveUpdate} 
          onEditText={handleEditText}
        />
      )}

      <Dialog open={!!editingTextItem} onOpenChange={(open) => !open && setEditingTextItem(null)}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Edit Text Content</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Textarea 
              autoFocus
              value={tempText} 
              onChange={(e) => setTempText(e.target.value)}
              placeholder="Enter your story..."
              className="min-h-[150px] text-lg font-serif"
            />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditingTextItem(null)}>Cancel</Button>
            <Button onClick={saveEditedText}>Update Story</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
