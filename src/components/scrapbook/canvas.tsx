"use client";

import type { CanvasItem as CanvasItemType } from "@/lib/data";
import { CanvasItem } from "./canvas-item";

interface CanvasProps {
  items: CanvasItemType[];
  onUpdateItemPosition: (id: string, x: number, y: number) => void;
}

export function Canvas({ items, onUpdateItemPosition }: CanvasProps) {
  return (
    <div
      className="relative w-full h-[70vh] rounded-lg overflow-hidden bg-dot-gray-300/50 dark:bg-dot-gray-700/50"
      style={{
        // A subtle dot grid background
        backgroundImage:
          "radial-gradient(circle at 1px 1px, hsl(var(--border)) 1px, transparent 0)",
        backgroundSize: "20px 20px",
      }}
    >
      {items.map((item) => (
        <CanvasItem
          key={item.id}
          item={item}
          onUpdatePosition={onUpdateItemPosition}
        />
      ))}
    </div>
  );
}
