
"use client";

import { useState, useRef, type MouseEvent, useEffect } from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { updateDocumentNonBlocking, deleteDocumentNonBlocking } from "@/firebase/non-blocking-updates";
import { doc, getFirestore, serverTimestamp } from "firebase/firestore";
import { ref, deleteObject } from "firebase/storage";
import { useStorage } from "@/firebase";
import { Trash2, AlertTriangle, RotateCcw, FlipHorizontal, Maximize2, Move, Bold, Underline, Type, Plus, Minus } from "lucide-react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
    angle: 0,
    dist: 0,
    vCenterX: 0,
    vCenterY: 0
  });
  
  const hasMoved = useRef(false);
  const itemRef = useRef<HTMLDivElement>(null);
  
  const db = getFirestore();
  const storage = useStorage();
  const { toast } = useToast();

  const handleMouseDown = (e: MouseEvent<HTMLDivElement>, mode: InteractionMode = 'drag') => {
    e.stopPropagation();
    
    if ((e.target as HTMLElement).closest('.action-button') && mode === 'drag') return;

    setInteractionMode(mode);
    hasMoved.current = false;

    const rect = itemRef.current?.getBoundingClientRect();
    if (!rect) return;

    const vCenterX = rect.left + rect.width / 2;
    const vCenterY = rect.top + rect.height / 2;

    const dx = e.clientX - vCenterX;
    const dy = e.clientY - vCenterY;

    interactionStart.current = {
      clientX: e.clientX,
      clientY: e.clientY,
      x: item.x,
      y: item.y,
      width: item.width,
      height: item.height,
      rotation: item.rotation || 0,
      angle: Math.atan2(dy, dx),
      dist: Math.sqrt(dx * dx + dy * dy),
      vCenterX,
      vCenterY
    };
    
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
  };

  const handleMouseMove = (e: globalThis.MouseEvent) => {
    if (!interactionMode || !itemRef.current) return;
    hasMoved.current = true;

    const parentRect = itemRef.current.parentElement?.getBoundingClientRect();
    if (!parentRect) return;

    const { vCenterX, vCenterY, clientX: startClientX, clientY: startClientY, x: startX, y: startY, width: startW, height: startH, rotation: startR, dist: startDist, angle: startAngle } = interactionStart.current;

    if (interactionMode === 'drag') {
      const dx = e.clientX - startClientX;
      const dy = e.clientY - startClientY;
      
      let newX = startX + dx;
      let newY = startY + dy;

      newX = Math.max(0, Math.min(newX, parentRect.width - startW));
      newY = Math.max(0, Math.min(newY, parentRect.height - startH));

      itemRef.current.style.left = `${newX}px`;
      itemRef.current.style.top = `${newY}px`;
    } 
    else if (interactionMode === 'resize') {
      const dx = e.clientX - vCenterX;
      const dy = e.clientY - vCenterY;
      const currentDist = Math.sqrt(dx * dx + dy * dy);
      const ratio = currentDist / startDist;

      const newWidth = Math.max(50, startW * ratio);
      const newHeight = (item.type === 'video' || item.type === 'image')
        ? (newWidth * startH) / startW
        : Math.max(30, startH * ratio);

      itemRef.current.style.width = `${newWidth}px`;
      itemRef.current.style.height = `${newHeight}px`;
    }
    else if (interactionMode === 'rotate') {
      const dx = e.clientX - vCenterX;
      const dy = e.clientY - vCenterY;
      const currentAngle = Math.atan2(dy, dx);
      const rotationDiff = (currentAngle - startAngle) * (180 / Math.PI);
      const finalRotation = (startR + rotationDiff) % 360;
      
      itemRef.current.style.transform = `rotate(${finalRotation}deg)`;
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

    if (!itemRef.current) return;

    const docRef = doc(db, "scrapbooks", scrapbookId, "pages", pageId, "canvasObjects", item.id);
    const updates: any = { updatedAt: serverTimestamp() };

    if (finalMode === 'drag') {
      updates.x = parseFloat(itemRef.current.style.left);
      updates.y = parseFloat(itemRef.current.style.top);
      onUpdatePosition(item.id, updates.x, updates.y);
    } 
    else if (finalMode === 'resize') {
      updates.width = parseFloat(itemRef.current.style.width);
      updates.height = parseFloat(itemRef.current.style.height);
    }
    else if (finalMode === 'rotate') {
      const transform = itemRef.current.style.transform;
      const match = transform.match(/rotate\((.*)deg\)/);
      if (match) {
        updates.rotation = parseFloat(match[1]);
      }
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

  const handleToggleBold = () => {
    const docRef = doc(db, "scrapbooks", scrapbookId, "pages", pageId, "canvasObjects", item.id);
    updateDocumentNonBlocking(docRef, {
      isBold: !item.isBold,
      updatedAt: serverTimestamp()
    });
    toast({ title: !item.isBold ? "Bold Applied" : "Bold Removed" });
  };

  const handleToggleUnderline = () => {
    const docRef = doc(db, "scrapbooks", scrapbookId, "pages", pageId, "canvasObjects", item.id);
    updateDocumentNonBlocking(docRef, {
      isUnderline: !item.isUnderline,
      updatedAt: serverTimestamp()
    });
    toast({ title: !item.isUnderline ? "Underline Applied" : "Underline Removed" });
  };

  const handleFontSizeChange = (delta: number) => {
    const newSize = Math.max(8, (item.fontSize || 24) + delta);
    const docRef = doc(db, "scrapbooks", scrapbookId, "pages", pageId, "canvasObjects", item.id);
    updateDocumentNonBlocking(docRef, {
      fontSize: newSize,
      updatedAt: serverTimestamp()
    });
  };

  const handleFontFamilyChange = (font: string) => {
    const docRef = doc(db, "scrapbooks", scrapbookId, "pages", pageId, "canvasObjects", item.id);
    updateDocumentNonBlocking(docRef, {
      fontFamily: font,
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
          <div className="relative w-full h-full overflow-hidden rounded-sm bg-muted/20 pointer-events-none select-none">
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
          <div className="w-full h-full p-4 flex items-center justify-center pointer-events-none bg-white/40 backdrop-blur-[2px] rounded-lg border border-dashed border-primary/20 overflow-hidden">
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
        onMouseDown={(e) => handleMouseDown(e, 'drag')}
        className={cn(
          "absolute transition-shadow duration-300 transform-gpu select-none",
          interactionMode === 'drag' ? "cursor-grabbing shadow-2xl z-[9999]" : "cursor-grab shadow-md hover:shadow-lg",
          isSelected ? "ring-2 ring-primary ring-offset-2 z-[999]" : "",
          item.type === "text" ? "bg-transparent" : "bg-white p-2 border border-muted/30 rounded-sm"
        )}
        style={{
          left: `${item.x}px`,
          top: `${item.y}px`,
          width: `${item.width}px`,
          height: `${item.height}px`,
          transform: `rotate(${item.rotation || 0}deg)`,
          transformOrigin: 'center center',
          zIndex: interactionMode ? 9999 : (item.zIndex || 1),
        }}
      >
        <div 
          className="w-full h-full pointer-events-none"
          style={{
            transform: `scaleX(${item.scaleX || 1}) scaleY(${item.scaleY || 1})`,
            transformOrigin: 'center center'
          }}
        >
          {renderContent()}
        </div>

        {isSelected && (
          <div className="absolute inset-0 pointer-events-none">
            {/* TEXT FORMATTING TOOLBAR */}
            {item.type === 'text' && (
              <div className="absolute -top-28 left-1/2 -translate-x-1/2 flex items-center gap-1 bg-white border border-primary/20 rounded-full p-1.5 shadow-lg pointer-events-auto z-[110] action-button flex-nowrap whitespace-nowrap min-w-max">
                <Select value={item.fontFamily || "font-serif"} onValueChange={handleFontFamilyChange}>
                  <SelectTrigger className="h-8 w-[110px] rounded-full border-none focus:ring-0">
                    <SelectValue placeholder="Font" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="font-serif">Serif</SelectItem>
                    <SelectItem value="font-sans">Sans</SelectItem>
                    <SelectItem value="font-mono">Mono</SelectItem>
                  </SelectContent>
                </Select>

                <div className="h-6 w-px bg-muted mx-1" />

                <Button 
                  size="icon" 
                  variant="ghost" 
                  className="h-8 w-8 rounded-full hover:bg-primary/10"
                  onClick={(e) => { e.stopPropagation(); handleFontSizeChange(-2); }}
                >
                  <Minus className="h-3 w-3" />
                </Button>
                <span className="text-xs font-medium w-6 text-center">{item.fontSize || 24}</span>
                <Button 
                  size="icon" 
                  variant="ghost" 
                  className="h-8 w-8 rounded-full hover:bg-primary/10"
                  onClick={(e) => { e.stopPropagation(); handleFontSizeChange(2); }}
                >
                  <Plus className="h-3 w-3" />
                </Button>

                <div className="h-6 w-px bg-muted mx-1" />

                <Button 
                  size="icon" 
                  variant={item.isBold ? "default" : "ghost"} 
                  className="h-8 w-8 rounded-full hover:bg-primary/10"
                  onClick={(e) => { e.stopPropagation(); handleToggleBold(); }}
                  title="Bold"
                >
                  <Bold className="h-4 w-4" />
                </Button>
                <Button 
                  size="icon" 
                  variant={item.isUnderline ? "default" : "ghost"} 
                  className="h-8 w-8 rounded-full hover:bg-primary/10"
                  onClick={(e) => { e.stopPropagation(); handleToggleUnderline(); }}
                  title="Underline"
                >
                  <Underline className="h-4 w-4" />
                </Button>
              </div>
            )}

            <div 
              onMouseDown={(e) => handleMouseDown(e, 'rotate')}
              className="absolute -top-12 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 cursor-alias group pointer-events-auto z-[100]"
            >
              <div className="w-0.5 h-6 bg-primary" />
              <Button size="icon" variant="outline" className="h-8 w-8 rounded-full border-primary bg-white shadow-md action-button hover:bg-primary hover:text-white transition-colors">
                <RotateCcw className="h-4 w-4" />
              </Button>
            </div>

            <Button 
              variant="destructive" 
              size="icon" 
              className="absolute -top-4 -right-4 h-8 w-8 rounded-full shadow-lg action-button pointer-events-auto z-[102]"
              onClick={(e) => { e.stopPropagation(); setIsDeleteDialogOpen(true); }}
            >
              <Trash2 className="h-4 w-4" />
            </Button>

            <Button 
              variant="secondary" 
              size="icon" 
              className="absolute -bottom-4 -left-4 h-8 w-8 rounded-full shadow-lg action-button pointer-events-auto z-[102]"
              onClick={handleFlip}
            >
              <FlipHorizontal className="h-4 w-4" />
            </Button>

            <div 
              onMouseDown={(e) => handleMouseDown(e, 'resize')}
              className="absolute -bottom-4 -right-4 h-8 w-8 bg-white border-2 border-primary rounded-full cursor-nwse-resize shadow-lg pointer-events-auto z-[100] flex items-center justify-center active:bg-primary group transition-colors"
            >
              <Maximize2 className="h-4 w-4 text-primary group-active:text-white" />
            </div>

            <div className="absolute inset-4 border border-dashed border-primary/20 flex items-center justify-center rounded-md bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity">
              <Move className="h-6 w-6 text-primary/40" />
            </div>
          </div>
        )}
      </div>

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
