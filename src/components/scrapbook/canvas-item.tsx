
"use client";

import { useState, useRef, type MouseEvent, useEffect } from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { updateDocumentNonBlocking, deleteDocumentNonBlocking } from "@/firebase/non-blocking-updates";
import { doc, getFirestore, serverTimestamp } from "firebase/firestore";
import { ref, deleteObject } from "firebase/storage";
import { useStorage } from "@/firebase";
import { Trash2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";

interface CanvasItemProps {
  item: any;
  onUpdatePosition: (id: string, x: number, y: number) => void;
  scrapbookId: string;
  pageId: string;
}

export function CanvasItem({ item, onUpdatePosition, scrapbookId, pageId }: CanvasItemProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isSelected, setIsSelected] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  
  const dragStartPos = useRef({ x: 0, y: 0 });
  const itemStartPos = useRef({ x: 0, y: 0 });
  const hasMoved = useRef(false);
  
  const db = getFirestore();
  const storage = useStorage();
  const { toast } = useToast();

  // Close selection when clicking outside (simple version)
  useEffect(() => {
    const handleClickOutside = () => {
        if (!isDragging) {
            // This is a bit aggressive for an MVP but works for focus logic
        }
    };
    window.addEventListener("mousedown", handleClickOutside);
    return () => window.removeEventListener("mousedown", handleClickOutside);
  }, [isDragging]);

  const handleMouseDown = (e: MouseEvent<HTMLDivElement>) => {
    // Prevent triggering drag when clicking the delete button
    if ((e.target as HTMLElement).closest('.delete-trigger')) return;

    setIsDragging(true);
    hasMoved.current = false;
    dragStartPos.current = { x: e.clientX, y: e.clientY };
    itemStartPos.current = { x: item.x, y: item.y };
    
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    e.preventDefault();
  };

  const handleMouseMove = (e: globalThis.MouseEvent) => {
    const dx = e.clientX - dragStartPos.current.x;
    const dy = e.clientY - dragStartPos.current.y;
    
    if (Math.abs(dx) > 2 || Math.abs(dy) > 2) {
        hasMoved.current = true;
    }
    
    onUpdatePosition(item.id, itemStartPos.current.x + dx, itemStartPos.current.y + dy);
  };

  const handleMouseUp = (e: globalThis.MouseEvent) => {
    setIsDragging(false);
    window.removeEventListener("mousemove", handleMouseMove);
    window.removeEventListener("mouseup", handleMouseUp);

    // If it didn't move, it's a selection click
    if (!hasMoved.current) {
        setIsSelected(!isSelected);
        return;
    }

    const dx = e.clientX - dragStartPos.current.x;
    const dy = e.clientY - dragStartPos.current.y;
    
    // Persist final position to Firestore
    const docRef = doc(db, "scrapbooks", scrapbookId, "pages", pageId, "canvasObjects", item.id);
    updateDocumentNonBlocking(docRef, {
      x: itemStartPos.current.x + dx,
      y: itemStartPos.current.y + dy,
      updatedAt: serverTimestamp(),
    });
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      // 1. Delete from Storage if it has a URI (Images, Video, Audio)
      if (item.mediaUri && item.type !== 'text') {
        try {
            const storageRef = ref(storage, item.mediaUri);
            await deleteObject(storageRef);
            console.log("[Delete] Media file removed from Storage");
        } catch (storageErr) {
            console.warn("[Delete] Storage cleanup failed or file already gone", storageErr);
            // We continue anyway to clean up the Firestore record
        }
      }

      // 2. Delete from Firestore
      const docRef = doc(db, "scrapbooks", scrapbookId, "pages", pageId, "canvasObjects", item.id);
      deleteDocumentNonBlocking(docRef);

      toast({
        title: "Item Deleted",
        description: "The object has been removed from your canvas.",
      });
    } catch (error) {
      console.error("[Delete] Failed to delete item", error);
      toast({
        variant: "destructive",
        title: "Deletion Failed",
        description: "Could not remove the item. Please try again.",
      });
    } finally {
      setIsDeleting(false);
      setIsDeleteDialogOpen(false);
    }
  };

  const renderContent = () => {
    switch (item.type) {
      case "image":
        return (
          <div className="relative w-full h-full overflow-hidden rounded-sm bg-muted/20">
            <Image
              src={item.mediaUri}
              alt="Memory"
              fill
              className="object-cover pointer-events-none"
              unoptimized
            />
          </div>
        );
      case "text":
        return (
          <div className="w-full h-full p-4 flex items-center justify-center pointer-events-none">
            <p className="text-2xl font-headline text-center leading-tight">
              {item.text}
            </p>
          </div>
        );
      case "video":
        return (
          <video 
            src={item.mediaUri} 
            className="w-full h-full object-cover pointer-events-none rounded-sm bg-black"
            muted
            autoPlay
            loop
          />
        );
      case "audio":
        return (
          <div className="w-full h-full flex flex-col items-center justify-center p-4 bg-primary/5 rounded-lg border border-primary/20 pointer-events-none">
            <div className="h-10 w-10 rounded-full bg-primary flex items-center justify-center mb-2 shadow-sm">
              <div className="w-4 h-4 bg-white rounded-full animate-pulse" />
            </div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-primary">Voice Memo</p>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <>
      <div
        onMouseDown={handleMouseDown}
        className={cn(
          "absolute transition-shadow duration-300 group",
          isDragging ? "cursor-grabbing shadow-2xl ring-2 ring-primary scale-105" : "cursor-grab shadow-md hover:shadow-lg",
          isSelected && !isDragging ? "ring-2 ring-primary ring-offset-2" : "",
          item.type === "text" ? "bg-transparent" : "bg-white p-2 border border-muted/30"
        )}
        style={{
          left: `${item.x}px`,
          top: `${item.y}px`,
          width: `${item.width}px`,
          height: `${item.height}px`,
          transform: `rotate(${item.rotation || 0}deg) scaleX(${item.scaleX || 1}) scaleY(${item.scaleY || 1})`,
          transformOrigin: 'center center',
          zIndex: isDragging ? 9999 : (item.zIndex || 1),
        }}
      >
        {renderContent()}

        {/* Delete Trigger - Top Right */}
        {isSelected && (
            <div className="absolute -top-4 -right-4 z-[10000] delete-trigger animate-in zoom-in-50 duration-200">
                <Button 
                    variant="destructive" 
                    size="icon" 
                    className="h-8 w-8 rounded-full shadow-lg border-2 border-white"
                    onClick={() => setIsDeleteDialogOpen(true)}
                >
                    <Trash2 className="h-4 w-4" />
                </Button>
            </div>
        )}
      </div>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Delete this item?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove this {item.type} from your scrapbook page. 
              {item.type !== 'text' && " The associated media file will also be deleted from storage."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
                onClick={(e) => {
                    e.preventDefault();
                    handleDelete();
                }}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                disabled={isDeleting}
            >
                {isDeleting ? "Deleting..." : "Delete Permanently"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
