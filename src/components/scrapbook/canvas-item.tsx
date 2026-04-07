
"use client";

import { useState, useRef, type MouseEvent, useEffect } from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { deleteDocumentNonBlocking } from "@/firebase/non-blocking-updates";
import { doc, getFirestore } from "firebase/firestore";
import { ref, deleteObject } from "firebase/storage";
import { useStorage } from "@/firebase";
import { Trash2, FlipHorizontal, Move, Play, CircleStop, Edit3 } from "lucide-react";
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
  onEditText?: (item: any) => void;
  scrapbookId: string;
  pageId: string;
}

export function CanvasItem({ item, isSelected, onSelect, onUpdatePosition, onEditText, scrapbookId, pageId }: CanvasItemProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  
  const interactionStart = useRef({ 
    clientX: 0, 
    clientY: 0, 
    x: 0, 
    y: 0 
  });
  
  const hasMoved = useRef(false);
  const itemRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  
  const db = getFirestore();
  const storage = useStorage();
  const { toast } = useToast();
  const { debouncedUpdate } = useAutoSave();

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = item.volume !== undefined ? item.volume / 100 : 1.0;
    }
  }, [item.volume]);

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
    newX = Math.max(-100, Math.min(newX, parentRect.width - 50));
    newY = Math.max(-100, Math.min(newY, parentRect.height - 50));

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

  const togglePlay = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      if (item.mediaUri && item.type !== 'text' && item.type !== 'shape') {
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

  const getShapeStyles = () => {
    if (!item.shapeType || item.shapeType === 'none' || item.shapeType === 'rectangle') return {};
    if (item.shapeType === 'circle') return { borderRadius: '100%' };
    if (item.shapeType === 'square') return { aspectRatio: '1/1' };
    if (item.shapeType === 'triangle') return { clipPath: 'polygon(50% 0%, 0% 100%, 100% 100%)' };
    return {};
  };

  const renderContent = () => {
    const commonStyles = {
      borderWidth: `${item.borderWidth || 0}px`,
      borderColor: item.borderColor || '#000000',
      borderStyle: item.borderWidth > 0 ? 'solid' : 'none',
      opacity: (item.alpha !== undefined ? item.alpha : 100) / 100,
      ...getShapeStyles()
    };

    switch (item.type) {
      case "image":
        return (
          <div 
            className="relative w-full h-full overflow-hidden pointer-events-none select-none bg-muted/20"
            style={commonStyles}
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
            className="w-full h-full p-6 flex items-center justify-center pointer-events-none bg-transparent rounded-lg overflow-hidden"
            style={commonStyles}
          >
            <p className={cn(
              "text-center leading-relaxed whitespace-pre-wrap",
              item.fontFamily || "font-serif",
              item.isBold && "font-bold",
              item.isUnderline && "underline"
            )}
            style={{ 
              fontSize: `${item.fontSize || 22}px`,
              color: item.textColor || "#000000"
            }}
            >
              {item.text}
            </p>
          </div>
        );
      case "video":
        return (
          <div 
            className="relative w-full h-full pointer-events-none bg-black overflow-hidden shadow-inner group/video"
            style={commonStyles}
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
            className="w-full h-full flex flex-col items-center justify-center p-4 bg-primary/10 rounded-xl border-2 border-primary/20 shadow-sm overflow-hidden"
            style={commonStyles}
          >
            <audio 
              ref={audioRef} 
              src={item.mediaUri} 
              onEnded={() => setIsPlaying(false)} 
              onPause={() => setIsPlaying(false)}
              onPlay={() => setIsPlaying(true)}
              className="hidden"
            />
            <Button 
              variant="ghost" 
              size="icon" 
              className="action-button h-12 w-12 rounded-full bg-primary/20 text-primary hover:bg-primary/30 mb-2 relative z-10"
              onClick={togglePlay}
            >
              {isPlaying ? <CircleStop className="h-6 w-6" /> : <Play className="h-6 w-6 fill-primary" />}
            </Button>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary pointer-events-none">Voice Memo</p>
          </div>
        );
      case "shape":
        return (
          <div 
            className="w-full h-full"
            style={{
              ...commonStyles,
              backgroundColor: item.fillColor || "#f1b36a"
            }}
          />
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
        onDoubleClick={(e) => {
          e.stopPropagation();
          if (item.type === 'text' && onEditText) {
            onEditText(item);
          }
        }}
        className={cn(
          "absolute transition-shadow duration-300 transform-gpu select-none",
          isDragging ? "cursor-grabbing shadow-2xl z-[9999]" : "cursor-grab shadow-sm hover:shadow-md",
          isSelected ? "ring-2 ring-primary ring-offset-2 z-[999] shadow-xl" : "",
          item.type === "text" || item.type === "audio" || item.type === "shape" ? "bg-transparent" : "bg-white p-2 border border-muted/30 rounded-sm"
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
          className="w-full h-full"
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
            
            {item.type === 'text' && (
              <Button 
                variant="secondary" 
                size="icon" 
                className="absolute -top-3 -left-3 h-7 w-7 rounded-full shadow-lg action-button pointer-events-auto z-[1002]"
                onClick={(e) => { e.stopPropagation(); onEditText?.(item); }}
              >
                <Edit3 className="h-3.5 w-3.5" />
              </Button>
            )}

            <div className="absolute inset-0 border-2 border-dashed border-primary/40 rounded-sm pointer-events-none" />
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
