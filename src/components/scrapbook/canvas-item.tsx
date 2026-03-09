
"use client";

import { useState, useRef, type MouseEvent, useEffect } from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { updateDocumentNonBlocking, deleteDocumentNonBlocking } from "@/firebase/non-blocking-updates";
import { doc, getFirestore, serverTimestamp } from "firebase/firestore";
import { ref, deleteObject } from "firebase/storage";
import { useStorage } from "@/firebase";
import { Trash2, AlertTriangle, FlipHorizontal, Move } from "lucide-react";
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
  isSelected: boolean;
  onSelect: () => void;
  onUpdatePosition: (id: string, x: number, y: number) => void;
  scrapbookId: string;
  pageId: string;
}

export function CanvasItem({ item, isSelected, onSelect, onUpdatePosition, scrapbookId, pageId }: CanvasItemProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  
  const interactionStart = useRef({ 
    clientX: 0, 
    clientY: 0, 
    x: 0, 
    y: 0 
  });
  
  const hasMoved = useRef(false);
  const itemRef = useRef<HTMLDivElement>(null);
  
  const db = getFirestore();
  const storage = useStorage();
  const { toast } = useToast();

  const handleMouseDown = (e: MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
    onSelect();

    const target = e.target as HTMLElement;
    if (target.closest('.action-button')) return;

    setIsDragging(true);
    hasMoved.current = false;

    interactionStart.current = {
      clientX: e.clientX,
      clientY: e.clientY,
      x: item.x,
      y: item.y,
    };
    
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
  };

  const handleMouseMove = (e: globalThis.MouseEvent) => {
    if (!itemRef.current) return;
    hasMoved.current = true;

    const parentRect = itemRef.current.parentElement?.getBoundingClientRect();
    if (!parentRect) return;

    const { clientX: startClientX, clientY: startClientY, x: startX, y: startY } = interactionStart.current;

    const dx = e.clientX - startClientX;
    const dy = e.clientY - startClientY;
    
    let newX = startX + dx;
    let newY = startY + dy;

    // Boundary constraints
    newX = Math.max(0, Math.min(newX, parentRect.width - (item.width * (item.scaleX || 1))));
    newY = Math.max(0, Math.min(newY, parentRect.height - (item.height * (item.scaleY || 1))));

    itemRef.current.style.left = `${newX}px`;
    itemRef.current.style.top = `${newY}px`;
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    window.removeEventListener("mousemove", handleMouseMove);
    window.removeEventListener("mouseup", handleMouseUp);

    if (!itemRef.current || !hasMoved.current) return;

    const finalX = parseFloat(itemRef.current.style.left);
    const finalY = parseFloat(itemRef.current.style.top);
    
    onUpdatePosition(item.id, finalX, finalY);

    const docRef = doc(db, "scrapbooks", scrapbookId, "pages", pageId, "canvasObjects", item.id);
    updateDocumentNonBlocking(docRef, {
      x: finalX,
      y: finalY,
      updatedAt: serverTimestamp()
    });
  };

  const handleFlip = (e: React.MouseEvent) => {
    e.stopPropagation();
    const docRef = doc(db, "scrapbooks", scrapbookId, "pages", pageId, "canvasObjects", item.id);
    updateDocumentNonBlocking(docRef, {
      scaleX: (item.scaleX || 1) * -1,
      updatedAt: serverTimestamp()
    });
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      if (item.mediaUri && item.type !== 'text') {
        try {
          const storageRef = ref(storage, item.mediaUri);
          await deleteObject(storageRef);
        } catch (sErr) { 
          console.warn("[Cleanup] Storage file already removed:", sErr); 
        }
      }
      const docRef = doc(db, "scrapbooks", scrapbookId, "pages", pageId, "canvasObjects", item.id);
      deleteDocumentNonBlocking(docRef);
      toast({ title: "Item Removed" });
    } catch (error) {
      toast({ variant: "destructive", title: "Deletion Failed" });
    } finally {
      setIsDeleting(false);
      setIsDeleteDialogOpen(false);
    }
  };

  const renderContent = () => {
    switch (item.type) {
      case "image":
        return (
          <div className="relative w-full h-full overflow-hidden rounded-sm pointer-events-none select-none">
            <Image
              src={item.mediaUri}
              alt="Memory"
              fill
              className="object-cover"
              unoptimized
            />
          </div>
        );
      case "text":
        return (
          <div className="w-full h-full p-4 flex items-center justify-center pointer-events-none bg-white/20 rounded-lg overflow-hidden">
            <p className={cn(
              "text-center leading-tight text-foreground/80",
              item.fontFamily || "font-serif",
              item.isBold && "font-bold",
              item.isUnderline && "underline"
            )}
            style={{ fontSize: `${item.fontSize || 24}px` }}
            >
              {item.text}
            </p>
          </div>
        );
      case "video":
        return (
          <div className="relative w-full h-full pointer-events-none rounded-sm bg-black overflow-hidden">
            <video 
              src={item.mediaUri} 
              className="w-full h-full object-cover"
              muted autoPlay loop playsInline
            />
          </div>
        );
      case "audio":
        return (
          <div className="w-full h-full flex flex-col items-center justify-center p-4 bg-primary/5 rounded-lg border border-primary/20 pointer-events-none shadow-sm">
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
        ref={itemRef}
        onMouseDown={handleMouseDown}
        className={cn(
          "absolute transition-shadow duration-300 transform-gpu select-none",
          isDragging ? "cursor-grabbing shadow-2xl z-[9999]" : "cursor-grab shadow-sm hover:shadow-md",
          isSelected ? "ring-2 ring-primary ring-offset-2 z-[999] shadow-xl" : "",
          item.type === "text" ? "bg-transparent" : "bg-white p-2 border border-muted/30 rounded-sm"
        )}
        style={{
          left: `${item.x}px`,
          top: `${item.y}px`,
          width: `${item.width}px`,
          height: `${item.height}px`,
          transform: `rotate(${item.rotation || 0}deg) scale(${Math.abs(item.scaleX || 1)}, ${item.scaleY || 1})`,
          transformOrigin: 'center center',
          zIndex: isSelected ? 999 : (item.zIndex || 1),
        }}
      >
        {/* Selection Glow */}
        {isSelected && (
          <div className="absolute -inset-4 bg-primary/5 rounded-lg -z-10 animate-pulse" />
        )}

        <div 
          className="w-full h-full pointer-events-none"
          style={{
            transform: `scaleX(${(item.scaleX || 1) < 0 ? -1 : 1})`,
            transformOrigin: 'center center'
          }}
        >
          {renderContent()}
        </div>

        {isSelected && (
          <>
            <Button 
              variant="destructive" 
              size="icon" 
              className="absolute -top-3 -right-3 h-6 w-6 rounded-full shadow-lg action-button pointer-events-auto z-[1002]"
              onClick={(e) => { e.stopPropagation(); setIsDeleteDialogOpen(true); }}
            >
              <Trash2 className="h-3 w-3" />
            </Button>

            <Button 
              variant="secondary" 
              size="icon" 
              className="absolute -bottom-3 -right-3 h-6 w-6 rounded-full shadow-lg action-button pointer-events-auto z-[1002]"
              onClick={handleFlip}
            >
              <FlipHorizontal className="h-3 w-3" />
            </Button>

            <div className="absolute inset-0 border border-dashed border-primary/40 rounded-sm pointer-events-none" />
            
            <div className="absolute inset-0 flex items-center justify-center opacity-10 pointer-events-none">
              <Move className="h-12 w-12 text-primary" />
            </div>
          </>
        )}
      </div>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove this memory?</AlertDialogTitle>
            <AlertDialogDescription>
              This item will be permanently deleted from your scrapbook page.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={(e) => { e.preventDefault(); handleDelete(); }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={isDeleting}
            >
              {isDeleting ? "Removing..." : "Delete Permanently"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
