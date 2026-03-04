"use client";

import { useState, useRef, type MouseEvent } from "react";
import Image from "next/image";
import type { CanvasItem as CanvasItemType } from "@/lib/data";
import { cn } from "@/lib/utils";

interface CanvasItemProps {
  item: CanvasItemType;
  onUpdatePosition: (id: string, x: number, y: number) => void;
}

export function CanvasItem({ item, onUpdatePosition }: CanvasItemProps) {
  const [isDragging, setIsDragging] = useState(false);
  const dragStartPos = useRef({ x: 0, y: 0 });
  const itemStartPos = useRef({ x: 0, y: 0 });

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

  const handleMouseUp = () => {
    setIsDragging(false);
    window.removeEventListener("mousemove", handleMouseMove);
    window.removeEventListener("mouseup", handleMouseUp);
  };

  const renderContent = () => {
    switch (item.type) {
      case "image":
        return (
          <Image
            src={item.content}
            alt="Canvas item"
            width={item.width}
            height={item.height}
            className="w-full h-full object-cover pointer-events-none"
            data-ai-hint="photo memory"
          />
        );
      case "text":
        return (
          <div className="w-full h-full p-2 flex items-center justify-center pointer-events-none">
            <p className="text-xl font-headline" style={{ transform: `scale(${item.scale})` }}>
              {item.content}
            </p>
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
        "absolute rounded-md shadow-lg transition-shadow duration-300",
        isDragging ? "cursor-grabbing shadow-2xl z-10" : "cursor-grab",
        item.type === "text" ? "" : "bg-card"
      )}
      style={{
        left: `${item.x}px`,
        top: `${item.y}px`,
        width: `${item.width}px`,
        height: `${item.height}px`,
        transform: `rotate(${item.rotation}deg) scale(${item.scale})`,
        transformOrigin: 'center center',
      }}
    >
      {renderContent()}
    </div>
  );
}
