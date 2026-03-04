"use client";

import type { Scrapbook, ScrapbookPageDef } from "@/lib/data";
import { Canvas } from "@/components/scrapbook/canvas";
import { Toolbar } from "@/components/scrapbook/toolbar";
import { useState } from "react";
import type { CanvasItem as CanvasItemType } from "@/lib/data";

interface ScrapbookEditorProps {
  scrapbook: Scrapbook;
  initialPage: ScrapbookPageDef;
}

export function ScrapbookEditor({ scrapbook, initialPage }: ScrapbookEditorProps) {
  const [items, setItems] = useState<CanvasItemType[]>(initialPage.items);

  const updateItemPosition = (id: string, x: number, y: number) => {
    setItems((prevItems) =>
      prevItems.map((item) => (item.id === id ? { ...item, x, y } : item))
    );
  };

  return (
    <>
      <Toolbar scrapbook={scrapbook} />
      <div className="flex-grow rounded-lg border bg-card shadow-sm mt-4 p-4">
        <Canvas items={items} onUpdateItemPosition={updateItemPosition} />
      </div>
    </>
  );
}
