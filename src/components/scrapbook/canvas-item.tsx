
"use client";

import { useState, useRef, type MouseEvent, useEffect } from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { updateDocumentNonBlocking, deleteDocumentNonBlocking } from "@/firebase/non-blocking-updates";
import { doc, getFirestore, serverTimestamp } from "firebase/firestore";
import { ref, deleteObject } from "firebase/storage";
import { useStorage } from "@/firebase";
import { Trash2, AlertTriangle, RotateCcw, FlipHorizontal, Maximize2 } from "lucide-react";
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

type InteractionMode = 'drag' | 'resize' | 'rotate' | null;

export function CanvasItem({ item, onUpdatePosition, scrapbookId, pageId }: CanvasItemProps) {
  const [interactionMode, setInteractionMode] = useState<InteractionMode>(null);
  const [isSelected, setIsSelected] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  
  const interactionStart = useRef({ 
    clientX: 0, 
    clientY: 0, 
    x: 0, 
    y: 0, 
    width: 0, 
    height: 0, 
    rotation: 0,
    angle: 0
  });
  
  const hasMoved = useRef(false);
  const itemRef = useRef<HTMLDivElement>(null);
  
  const db = getFirestore();
  const storage = useStorage();
  const { toast } = useToast();

  /**
   * UNIFIED GESTURE HANDLER
   * Determines mode based on the target handle or body.
   */
  const handleMouseDown = (e: MouseEvent<HTMLDivElement>, mode: InteractionMode = 'drag') => {
    // Stop event propagation to prevent multiple items from being selected/moved
    e.stopPropagation();
    
    // Check if we clicked an action button within the overlay
    if ((e.target as HTMLElement).closest('.action-button')) return;

    setInteractionMode(mode);
    hasMoved.current = false;

    // Calculate center for rotation reference
    const rect = itemRef.current?.getBoundingClientRect();
    const centerX = rect ? rect.left + rect.width / 2 : 0;
    const centerY = rect ? rect.top + rect.height / 2 : 0;

    interactionStart.current = {
      clientX: e.clientX,
      clientY: e.clientY,
      x: item.x,
      y: item.y,
      width: item.width,
      height: item.height,
      rotation: item.rotation || 0,
      angle: Math.atan2(e.clientY - centerY, e.clientX - centerX)
    };
    
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
  };

  /**
   * HIGH-PERFORMANCE LOCAL UPDATES
   * Direct DOM manipulation of the element's style for 60fps interaction.
   */
  const handleMouseMove = (e: globalThis.MouseEvent) => {
    if (!interactionMode) return;
    hasMoved.current = true;

    const dx = e.clientX - interactionStart.current.clientX;
    const dy = e.clientY - interactionStart.current.clientY;

    if (interactionMode === 'drag') {
      const newX = interactionStart.current.x + dx;
      const newY = interactionStart.current.y + dy;
      if (itemRef.current) {
        itemRef.current.style.left = `${newX}px`;
        itemRef.current.style.top = `${newY}px`;
      }
    } 
    else if (interactionMode === 'resize') {
      const newWidth = Math.max(50, interactionStart.current.width + dx);
      // Maintain aspect ratio for media
      const newHeight = (item.type === 'video' || item.type === 'image')
        ? (newWidth * interactionStart.current.height) / interactionStart.current.width
        : Math.max(30, interactionStart.current.height + dy);

      if (itemRef.current) {
        itemRef.current.style.width = `${newWidth}px`;
        itemRef.current.style.height = `${newHeight}px`;
      }
    }
    else if (interactionMode === 'rotate') {
      const rect = itemRef.current?.getBoundingClientRect();
      const centerX = rect ? rect.left + rect.width / 2 : 0;
      const centerY = rect ? rect.top + rect.height / 2 : 0;
      const currentAngle = Math.atan2(e.clientY - centerY, e.clientX - centerX);
      const rotationDiff = (currentAngle - interactionStart.current.angle) * (180 / Math.PI);
      const finalRotation = interactionStart.current.rotation + rotationDiff;
      
      if (itemRef.current) {
        itemRef.current.style.transform = `rotate(${finalRotation}deg) scaleX(${item.scaleX || 1}) scaleY(${item.scaleY || 1})`;
      }
    }
  };

  /**
   * FIRESTORE PERSISTENCE
   * Sync final state to the database only when the user releases the object.
   */
  const handleMouseUp = (e: globalThis.MouseEvent) => {
    const finalMode = interactionMode;
    setInteractionMode(null);
    window.removeEventListener("mousemove", handleMouseMove);
    window.removeEventListener("mouseup", handleMouseUp);

    // If no movement happened, it's a selection toggle
    if (!hasMoved.current) {
      setIsSelected(!isSelected);
      return;
    }

    const docRef = doc(db, "scrapbooks", scrapbookId, "pages", pageId, "canvasObjects", item.id);
    const updates: any = { updatedAt: serverTimestamp() };

    const dx = e.clientX - interactionStart.current.clientX;
    const dy = e.clientY - interactionStart.current.clientY;

    if (finalMode === 'drag') {
      updates.x = interactionStart.current.x + dx;
      updates.y = interactionStart.current.y + dy;
      // Sync parent state for immediate re-render if necessary
      onUpdatePosition(item.id, updates.x, updates.y);
    } 
    else if (finalMode === 'resize') {
      updates.width = Math.max(50, interactionStart.current.width + dx);
      updates.height = (item.type === 'video' || item.type === 'image')
        ? (updates.width * interactionStart.current.height) / interactionStart.current.width
        : Math.max(30, interactionStart.current.height + dy);
    }
    else if (finalMode === 'rotate') {
      const rect = itemRef.current?.getBoundingClientRect();
      const centerX = rect ? rect.left + rect.width / 2 : 0;
      const centerY = rect ? rect.top + rect.height / 2 : 0;
      const currentAngle = Math.atan2(e.clientY - centerY, e.clientX - centerX);
      const rotationDiff = (currentAngle - interactionStart.current.angle) * (180 / Math.PI);
      updates.rotation = interactionStart.current.rotation + rotationDiff;
    }

    updateDocumentNonBlocking(docRef, updates);
  };

  const handleFlip = (e: React.MouseEvent) => {
    e.stopPropagation();
    const docRef = doc(db, "scrapbooks", scrapbookId, "pages", pageId, "canvasObjects", item.id);
    updateDocumentNonBlocking(docRef, {
      scaleX: (item.scaleX || 1) * -1,
      updatedAt: serverTimestamp()
    });
    toast({ title: "Memory Flipped" });
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      if (item.mediaUri && item.type !== 'text') {
        try {
          const storageRef = ref(storage, item.mediaUri);
          await deleteObject(storageRef);
        } catch (sErr) { console.warn("Storage cleanup skipped:", sErr); }
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
          <div className="relative w-full h-full overflow-hidden rounded-sm bg-muted/20 shadow-sm border border-white/50 pointer-events-none select-none">
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
          <div className="w-full h-full p-4 flex items-center justify-center pointer-events-none bg-white/40 backdrop-blur-[2px] rounded-lg border border-dashed border-primary/20">
            <p className="text-2xl font-headline text-center leading-tight text-foreground/80">
              {item.text}
            </p>
          </div>
        );
      case "video":
        return (
          <div className="relative w-full h-full pointer-events-none rounded-sm bg-black shadow-md overflow-hidden">
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
        onMouseDown={(e) => handleMouseDown(e, 'drag')}
        className={cn(
          "absolute transition-shadow duration-300 transform-gpu select-none",
          interactionMode === 'drag' ? "cursor-grabbing shadow-2xl scale-[1.02] z-[9999]" : "cursor-grab shadow-md hover:shadow-lg",
          isSelected ? "ring-2 ring-primary ring-offset-2 z-[999]" : "",
          item.type === "text" ? "bg-transparent" : "bg-white p-2 border border-muted/30 rounded-sm"
        )}
        style={{
          left: `${item.x}px`,
          top: `${item.y}px`,
          width: `${item.width}px`,
          height: `${item.height}px`,
          transform: `rotate(${item.rotation || 0}deg) scaleX(${item.scaleX || 1}) scaleY(${item.scaleY || 1})`,
          transformOrigin: 'center center',
          zIndex: interactionMode ? 9999 : (item.zIndex || 1),
        }}
      >
        {renderContent()}

        {/* TRANSFORMATION OVERLAY (Visible on selection) */}
        {isSelected && (
          <>
            {/* ROTATION HANDLE (TOP) */}
            <div 
              onMouseDown={(e) => handleMouseDown(e, 'rotate')}
              className="absolute -top-12 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 cursor-alias group z-[100]"
            >
              <div className="w-0.5 h-6 bg-primary" />
              <Button size="icon" variant="outline" className="h-8 w-8 rounded-full border-primary bg-white shadow-md action-button hover:bg-primary hover:text-white transition-colors">
                <RotateCcw className="h-4 w-4" />
              </Button>
            </div>

            {/* RESIZE HANDLE (BOTTOM RIGHT) */}
            <div 
              onMouseDown={(e) => handleMouseDown(e, 'resize')}
              className="absolute -bottom-2 -right-2 h-7 w-7 bg-white border-2 border-primary rounded-sm cursor-nwse-resize shadow-sm z-[100] flex items-center justify-center active:bg-primary group transition-colors"
            >
              <Maximize2 className="h-4 w-4 text-primary group-active:text-white" />
            </div>

            {/* QUICK ACTIONS (BOTTOM) */}
            <div className="absolute -bottom-14 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-white/95 backdrop-blur-md border p-1 rounded-full shadow-xl action-button z-[101]">
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-9 w-9 rounded-full hover:bg-muted"
                onClick={handleFlip}
                title="Flip Horizontal"
              >
                <FlipHorizontal className="h-5 w-5" />
              </Button>
              <div className="w-px h-6 bg-muted mx-1" />
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-9 w-9 rounded-full text-destructive hover:bg-destructive/10"
                onClick={(e) => { e.stopPropagation(); setIsDeleteDialogOpen(true); }}
                title="Remove Memory"
              >
                <Trash2 className="h-5 w-5" />
              </Button>
            </div>
          </>
        )}
      </div>

      {/* DELETION CONFIRMATION */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Remove this memory?
            </AlertDialogTitle>
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
