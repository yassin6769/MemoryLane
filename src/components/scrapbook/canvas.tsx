
"use client";

import { useState, useRef, useEffect } from "react";
import { CanvasItem } from "./canvas-item";
import { Button } from "@/components/ui/button";
import { Trash2, AlertTriangle, Move } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { deleteDocumentNonBlocking } from "@/firebase/non-blocking-updates";
import { doc, getFirestore } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface CanvasProps {
  scrapbookId: string;
  pageId: string;
  items: any[];
  backgroundColor?: string;
  selectedItemId: string | null;
  onSelectItem: (id: string | null) => void;
  onUpdateItemPosition: (id: string, x: number, y: number) => void;
  onEditText?: (item: any) => void;
  className?: string;
}

export function Canvas({ 
  scrapbookId, 
  pageId, 
  items, 
  backgroundColor = "#ffffff", 
  selectedItemId, 
  onSelectItem, 
  onUpdateItemPosition, 
  onEditText,
  className 
}: CanvasProps) {
  const { toast } = useToast();
  const db = getFirestore();

  // Panning State
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const startPos = useRef({ x: 0, y: 0 });

  const handleStartPan = (e: React.MouseEvent | React.TouchEvent) => {
    // Only pan if clicking/touching the canvas background directly
    if (e.target !== e.currentTarget) return;

    setIsPanning(true);
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    startPos.current = { x: clientX - pan.x, y: clientY - pan.y };
  };

  const handleMovePan = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isPanning) return;
    const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;
    
    setPan({
      x: clientX - startPos.current.x,
      y: clientY - startPos.current.y
    });
  };

  const handleEndPan = () => setIsPanning(false);

  useEffect(() => {
    if (isPanning) {
      window.addEventListener("mousemove", handleMovePan as any);
      window.addEventListener("mouseup", handleEndPan);
      window.addEventListener("touchmove", handleMovePan as any, { passive: false });
      window.addEventListener("touchend", handleEndPan);
    } else {
      window.removeEventListener("mousemove", handleMovePan as any);
      window.removeEventListener("mouseup", handleEndPan);
      window.removeEventListener("touchmove", handleMovePan as any);
      window.removeEventListener("touchend", handleEndPan);
    }
    return () => {
      window.removeEventListener("mousemove", handleMovePan as any);
      window.removeEventListener("mouseup", handleEndPan);
      window.removeEventListener("touchmove", handleMovePan as any);
      window.removeEventListener("touchend", handleEndPan);
    };
  }, [isPanning]);

  const handleClearCanvas = () => {
    items.forEach((item) => {
      const docRef = doc(db, "scrapbooks", scrapbookId, "pages", pageId, "canvasObjects", item.id);
      deleteDocumentNonBlocking(docRef);
    });
    onSelectItem(null);
    toast({
      title: "Canvas cleared",
      description: "All objects have been removed from this page.",
    });
  };

  const handleCanvasClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onSelectItem(null);
    }
  };

  return (
    <div className={cn("flex flex-col gap-4 h-full", className)}>
      <div
        onMouseDown={handleStartPan}
        onTouchStart={handleStartPan}
        onClick={handleCanvasClick}
        className={cn(
          "relative w-full h-[60vh] sm:h-[80vh] rounded-lg overflow-hidden border shadow-inner transition-colors duration-500",
          isPanning ? "cursor-grabbing" : "cursor-grab"
        )}
        style={{
          backgroundColor: backgroundColor,
          backgroundImage:
            "radial-gradient(circle at 1px 1px, rgba(0,0,0,0.05) 1px, transparent 0)",
          backgroundSize: "20px 20px",
        }}
      >
        <div 
          className="absolute inset-0 w-full h-full"
          style={{ 
            transform: `translate(${pan.x}px, ${pan.y}px)`,
            transition: isPanning ? 'none' : 'transform 0.1s ease-out'
          }}
        >
          {items.map((item) => (
            <CanvasItem
              key={item.id}
              item={item}
              isSelected={selectedItemId === item.id}
              onSelect={() => onSelectItem(item.id)}
              onUpdatePosition={onUpdateItemPosition}
              onEditText={onEditText}
              scrapbookId={scrapbookId}
              pageId={pageId}
            />
          ))}
          {items.length === 0 && (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground pointer-events-none p-4">
              <p className="text-xl font-headline opacity-40 text-center">Empty Canvas</p>
              <p className="text-sm opacity-30 text-center">Use the toolbar to add media. Drag the background to pan.</p>
            </div>
          )}
        </div>

        {/* Pan Indicator for Mobile */}
        <div className="absolute bottom-4 right-4 p-2 bg-white/80 backdrop-blur-md rounded-full shadow-lg pointer-events-none border border-muted/50">
          <Move className="h-4 w-4 text-primary opacity-60" />
        </div>
      </div>

      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
           <Button variant="outline" size="sm" onClick={() => setPan({ x: 0, y: 0 })} className="text-xs h-8">
            Reset Pan
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" size="sm" className="text-destructive hover:bg-destructive/10 text-xs h-8">
                <Trash2 className="mr-2 h-4 w-4" />
                Clear Page
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle className="flex items-center gap-2 text-destructive">
                  <AlertTriangle className="h-5 w-5" />
                  Clear this page?
                </AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently delete all {items.length} objects from this page.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleClearCanvas} className="bg-destructive text-destructive-foreground">
                  Clear Everything
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
        <p className="text-[10px] text-muted-foreground italic uppercase tracking-widest">
          {isPanning ? "Panning..." : "Drag background to pan"}
        </p>
      </div>
    </div>
  );
}
