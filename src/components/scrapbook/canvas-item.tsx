
"use client";

import { useState, useRef, type MouseEvent } from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { updateDocumentNonBlocking } from "@/firebase/non-blocking-updates";
import { doc, getFirestore, serverTimestamp } from "firebase/firestore";

interface CanvasItemProps {
  item: any;
  onUpdatePosition: (id: string, x: number, y: number) => void;
  scrapbookId: string;
  pageId: string;
}

export function CanvasItem({ item, onUpdatePosition, scrapbookId, pageId }: CanvasItemProps) {
  const [isDragging, setIsDragging] = useState(false);
  const dragStartPos = useRef({ x: 0, y: 0 });
  const itemStartPos = useRef({ x: 0, y: 0 });
  const db = getFirestore();

  const handleMouseDown = (e: MouseEvent<HTMLDivElement>) => {
    setIsDragging(true);
    dragStartPos.current = { x: e.clientX, y: e.clientY };
    itemStartPos.current = { x: item.x, y: item.y };
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    e.preventDefault();
  };

  const handleMouseMove = (e: globalThis.MouseEvent) => {
    const dx = e.clientX - dragStartPos.current.x;
    const dy = e.clientY - dragStartPos.current.y;
    onUpdatePosition(item.id, itemStartPos.current.x + dx, itemStartPos.current.y + dy);
  };

  const handleMouseUp = (e: globalThis.MouseEvent) => {
    setIsDragging(false);
    window.removeEventListener("mousemove", handleMouseMove);
    window.removeEventListener("mouseup", handleMouseUp);

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

  /**
   * CANVAS RENDERING (UI)
   * Dynamically renders media based on the object type.
   * Equivalent to Glide/Coil for image loading in Android.
   */
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
    <div
      onMouseDown={handleMouseDown}
      className={cn(
        "absolute transition-shadow duration-300",
        isDragging ? "cursor-grabbing shadow-2xl ring-2 ring-primary scale-105" : "cursor-grab shadow-md hover:shadow-lg",
        item.type === "text" ? "bg-transparent" : "bg-white p-2 border border-muted/30"
      )}
      style={{
        left: `${item.x}px`,
        top: `${item.y}px`,
        width: `${item.width}px`,
        height: `${item.height}px`,
        // DYNAMIC TRANSFORM LOGIC
        transform: `rotate(${item.rotation || 0}deg) scaleX(${item.scaleX || 1}) scaleY(${item.scaleY || 1})`,
        transformOrigin: 'center center',
        zIndex: isDragging ? 9999 : (item.zIndex || 1),
      }}
    >
      {renderContent()}
    </div>
  );
}
