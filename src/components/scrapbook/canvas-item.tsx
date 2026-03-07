
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

  const handleMouseDown = (e: MouseEvent<HTMLDivElement>, mode: InteractionMode = 'drag') => {
    if ((e.target as HTMLElement).closest('.action-button')) return;

    e.stopPropagation();
    e.preventDefault();

    setInteractionMode(mode);
    hasMoved.current = false;

    // Calculate center for rotation logic
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

  const handleMouseMove = (e: globalThis.MouseEvent) => {
    if (!interactionMode) return;
    hasMoved.current = true;

    const dx = e.clientX - interactionStart.current.clientX;
    const dy = e.clientY - interactionStart.current.clientY;

    if (interactionMode === 'drag') {
      onUpdatePosition(item.id, interactionStart.current.x + dx, interactionStart.current.y + dy);
    } 
    else if (interactionMode === 'resize') {
      // Logic for bottom-right resize
      const newWidth = Math.max(50, interactionStart.current.width + dx);
      const newHeight = item.type === 'video' || item.type === 'image' 
        ? (newWidth * interactionStart.current.height) / interactionStart.current.width // Maintain aspect ratio
        : Math.max(30, interactionStart.current.height + dy);

      // Local update via the same parent callback for simplicity (extended with size logic if needed)
      // For a robust prototype, we trigger a silent update or local state
      // Here we'll just update Firestore on mouseUp to keep the callback signature simple
    }
    else if (interactionMode === 'rotate') {
      const rect = itemRef.current?.getBoundingClientRect();
      const centerX = rect ? rect.left + rect.width / 2 : 0;
      const centerY = rect ? rect.top + rect.height / 2 : 0;
      const currentAngle = Math.atan2(e.clientY - centerY, e.clientX - centerX);
      const rotationDiff = (currentAngle - interactionStart.current.angle) * (180 / Math.PI);
      
      // Update local CSS for smooth feel
      if (itemRef.current) {
        itemRef.current.style.transform = `rotate(${interactionStart.current.rotation + rotationDiff}deg) scaleX(${item.scaleX || 1}) scaleY(${item.scaleY || 1})`;
      }
    }
  };

  const handleMouseUp = (e: globalThis.MouseEvent) => {
    const finalMode = interactionMode;
    setInteractionMode(null);
    window.removeEventListener("mousemove", handleMouseMove);
    window.removeEventListener("mouseup", handleMouseUp);

    if (!hasMoved.current) {
      setIsSelected(!isSelected);
      return;
    }

    const docRef = doc(db, "scrapbooks", scrapbookId, "pages", pageId, "canvasObjects", item.id);
    const updates: any = { updatedAt: serverTimestamp() };

    if (finalMode === 'drag') {
      const dx = e.clientX - interactionStart.current.clientX;
      const dy = e.clientY - interactionStart.current.clientY;
      updates.x = interactionStart.current.x + dx;
      updates.y = interactionStart.current.y + dy;
    } 
    else if (finalMode === 'resize') {
      const dx = e.clientX - interactionStart.current.clientX;
      updates.width = Math.max(50, interactionStart.current.width + dx);
      updates.height = item.type === 'video' || item.type === 'image'
        ? (updates.width * interactionStart.current.height) / interactionStart.current.width
        : Math.max(30, interactionStart.current.height + (e.clientY - interactionStart.current.clientY));
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

  const handleFlip = () => {
    const docRef = doc(db, "scrapbooks", scrapbookId, "pages", pageId, "canvasObjects", item.id);
    updateDocumentNonBlocking(docRef, {
      scaleX: (item.scaleX || 1) * -1,
      updatedAt: serverTimestamp()
    });
    toast({ title: "Image Flipped" });
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      if (item.mediaUri && item.type !== 'text') {
        try {
          const storageRef = ref(storage, item.mediaUri);
          await deleteObject(storageRef);
        } catch (sErr) { console.warn(sErr); }
      }
      const docRef = doc(db, "scrapbooks", scrapbookId, "pages", pageId, "canvasObjects", item.id);
      deleteDocumentNonBlocking(docRef);
      toast({ title: "Item Deleted" });
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
          <div className="relative w-full h-full overflow-hidden rounded-sm bg-muted/20 shadow-sm border border-white/50">
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
            className="w-full h-full object-cover pointer-events-none rounded-sm bg-black shadow-md"
            muted autoPlay loop
          />
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
          "absolute transition-shadow duration-300",
          interactionMode === 'drag' ? "cursor-grabbing shadow-2xl ring-2 ring-primary scale-105 z-[9999]" : "cursor-grab shadow-md hover:shadow-lg",
          isSelected ? "ring-2 ring-primary ring-offset-2" : "",
          item.type === "text" ? "bg-transparent" : "bg-white p-2 border border-muted/30"
        )}
        style={{
          left: `${item.x}px`,
          top: `${item.y}px`,
          width: `${item.width}px`,
          height: `${item.height}px`,
          transform: `rotate(${item.rotation || 0}deg) scaleX(${item.scaleX || 1}) scaleY(${item.scaleY || 1})`,
          transformOrigin: 'center center',
          zIndex: interactionMode === 'drag' ? 9999 : (item.zIndex || 1),
        }}
      >
        {renderContent()}

        {/* Transformation Handles */}
        {isSelected && (
          <>
            {/* Rotation Handle */}
            <div 
              onMouseDown={(e) => handleMouseDown(e, 'rotate')}
              className="absolute -top-12 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 cursor-alias group rotate-handle"
            >
              <div className="w-0.5 h-6 bg-primary" />
              <Button size="icon" variant="outline" className="h-8 w-8 rounded-full border-primary bg-white shadow-md action-button">
                <RotateCcw className="h-4 w-4 text-primary" />
              </Button>
            </div>

            {/* Resize Handle - Bottom Right */}
            <div 
              onMouseDown={(e) => handleMouseDown(e, 'resize')}
              className="absolute -bottom-2 -right-2 h-6 w-6 bg-white border-2 border-primary rounded-sm cursor-nwse-resize shadow-sm z-[100] flex items-center justify-center"
            >
              <Maximize2 className="h-3 w-3 text-primary" />
            </div>

            {/* Context Menu Overlay */}
            <div className="absolute -bottom-12 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-white/90 backdrop-blur-sm border p-1 rounded-full shadow-lg action-button">
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8 rounded-full hover:bg-muted"
                onClick={handleFlip}
              >
                <FlipHorizontal className="h-4 w-4" />
              </Button>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8 rounded-full text-destructive hover:bg-destructive/10"
                onClick={() => setIsDeleteDialogOpen(true)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </>
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
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={(e) => { e.preventDefault(); handleDelete(); }}
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
