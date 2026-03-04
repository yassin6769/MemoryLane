"use client";

import { useState } from "react";
import type { CanvasItem as CanvasItemType } from "@/lib/data";
import { CanvasItem } from "./canvas-item";
import { Button } from "@/components/ui/button";
import { Trash2, AlertTriangle } from "lucide-react";
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

interface CanvasProps {
  scrapbookId: string;
  pageId: string;
  items: any[];
  onUpdateItemPosition: (id: string, x: number, y: number) => void;
}

export function Canvas({ scrapbookId, pageId, items, onUpdateItemPosition }: CanvasProps) {
  const { toast } = useToast();
  const db = getFirestore();

  const handleClearCanvas = () => {
    items.forEach((item) => {
      const docRef = doc(db, "scrapbooks", scrapbookId, "pages", pageId, "canvasObjects", item.id);
      deleteDocumentNonBlocking(docRef);
    });
    toast({
      title: "Canvas cleared",
      description: "All objects have been removed from this page.",
    });
  };

  return (
    <div className="flex flex-col gap-4 h-full">
      <div
        className="relative w-full h-[70vh] rounded-lg overflow-hidden border bg-white shadow-inner"
        style={{
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
            scrapbookId={scrapbookId}
            pageId={pageId}
          />
        ))}
        {items.length === 0 && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground">
            <p className="text-xl font-headline">Empty Canvas</p>
            <p className="text-sm">Use the toolbar to add media and memories.</p>
          </div>
        )}
      </div>

      <div className="flex justify-start">
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="ghost" size="sm" className="text-destructive hover:bg-destructive/10">
              <Trash2 className="mr-2 h-4 w-4" />
              Clear Entire Canvas
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-destructive" />
                Are you absolutely sure?
              </AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently delete all {items.length} objects from this page.
                This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleClearCanvas} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                Yes, Clear Canvas
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
