
"use client";

import { useState, useRef, type MouseEvent, useEffect } from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { deleteDocumentNonBlocking } from "@/firebase/non-blocking-updates";
import { doc, getFirestore } from "firebase/firestore";
import { ref, deleteObject } from "firebase/storage";
import { useStorage } from "@/firebase";
import { Trash2, FlipHorizontal, Move, Music, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAutoSave } from "@/hooks/use-auto-save";
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
  const { debouncedUpdate } = useAutoSave();

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
    newX = Math.max(-50, Math.min(newX, parentRect.width - 50));
    newY = Math.max(-50, Math.min(newY, parentRect.height - 50));

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

    // Auto-save the final position
    debouncedUpdate(scrapbookId, pageId, item.id, {
      x: finalX,
      y: finalY
    });
  };

  const handleFlip = (e: React.MouseEvent) => {
    e.stopPropagation();
    debouncedUpdate(scrapbookId, pageId, item.id, {
      scaleX: (item.scaleX || 1) * -1
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
      toast({ title: "Removed from page" });
    } catch (error) {
      toast({ variant: "destructive", title: "Action Failed" });
    } finally {
      setIsDeleting(false);
      setIsDeleteDialogOpen(false);
    }
  };

  const renderContent = () => {
    const contentStyles = {
      borderWidth: `${item.borderWidth || 0}px`,
      borderColor: item.borderColor || '#000000',
      borderStyle: item.borderWidth > 0 ? 'solid' : 'none',
      padding: `${item.borderWidth || 0}px`,
    };

    switch (item.type) {
      case "image":
        return (
          <div 
            className="relative w-full h-full overflow-hidden rounded-sm pointer-events-none select-none bg-muted/20"
            style={contentStyles}
          >
            <Image
              src={item.mediaUri}
              alt="Scrapbook Memory"
              fill
              className="object-cover"
              unoptimized
            />
          </div>
        );
      case "text":
        return (
          <div 
            className="w-full h-full p-6 flex items-center justify-center pointer-events-none bg-card/40 rounded-lg overflow-hidden backdrop-blur-[1px]"
            style={contentStyles}
          >
            <p className={cn(
              "text-center leading-relaxed text-foreground/90 whitespace-pre-wrap",
              item.fontFamily || "font-serif",
              item.isBold && "font-bold",
              item.isUnderline && "underline"
            )}
            style={{ fontSize: `${item.fontSize || 22}px` }}
            >
              {item.text}
            </p>
          </div>
        );
      case "video":
        return (
          <div 
            className="relative w-full h-full pointer-events-none rounded-sm bg-black overflow-hidden shadow-inner"
            style={contentStyles}
          >
            <video 
              src={item.mediaUri} 
              className="w-full h-full object-cover"
              muted autoPlay loop playsInline
            />
          </div>
        );
      case "audio":
        return (
          <div 
            className="w-full h-full flex flex-col items-center justify-center p-6 bg-primary/10 rounded-xl border border-primary/30 pointer-events-none shadow-sm overflow-hidden"
            style={contentStyles}
          >
            <div className="h-12 w-12 rounded-full bg-primary flex items-center justify-center mb-3 shadow-md">
              <div className="relative">
                <Music className="h-5 w-5 text-white animate-bounce" />
                <div className="absolute inset-0 h-full w-full bg-white/20 rounded-full animate-ping" />
              </div>
            </div>
            <p className="text-[12px] font-bold uppercase tracking-[0.2em] text-primary">Voice Memo</p>
            <div className="mt-3 flex gap-1 items-end h-4">
               {[0.6, 0.8, 0.4, 1.0, 0.5, 0.9, 0.7].map((h, i) => (
                 <div 
                  key={i} 
                  className="w-1 bg-primary/40 rounded-full animate-pulse" 
                  style={{ height: `${h * 100}%`, animationDelay: `${i * 0.1}s` }} 
                />
               ))}
            </div>
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
          item.type === "text" || item.type === "audio" ? "bg-transparent" : "bg-white p-2 border border-muted/30 rounded-sm"
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
              className="absolute -top-3 -right-3 h-7 w-7 rounded-full shadow-lg action-button pointer-events-auto z-[1002]"
              onClick={(e) => { e.stopPropagation(); setIsDeleteDialogOpen(true); }}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>

            <Button 
              variant="secondary" 
              size="icon" 
              className="absolute -bottom-3 -right-3 h-7 w-7 rounded-full shadow-lg action-button pointer-events-auto z-[1002]"
              onClick={handleFlip}
            >
              <FlipHorizontal className="h-3.5 w-3.5" />
            </Button>

            <div className="absolute inset-0 border-2 border-dashed border-primary/40 rounded-sm pointer-events-none" />
            <div className="absolute inset-0 flex items-center justify-center opacity-10 pointer-events-none">
              <Move className="h-10 w-10 text-primary" />
            </div>
          </>
        )}
      </div>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove this memory?</AlertDialogTitle>
            <AlertDialogDescription>
              This object will be permanently removed from your current page.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={(e) => { e.preventDefault(); handleDelete(); }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={isDeleting}
            >
              {isDeleting ? "Removing..." : "Confirm Removal"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
