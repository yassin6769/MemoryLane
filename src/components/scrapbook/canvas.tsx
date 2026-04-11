
"use client";

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
    <div className={cn("flex flex-col gap-4 h-full preserve-3d backface-hidden", className)}>
      <div
        onClick={handleCanvasClick}
        className="relative w-full h-[60vh] sm:h-[80vh] rounded-lg overflow-hidden border shadow-inner preserve-3d cursor-crosshair transition-colors duration-500"
        style={{
          backgroundColor: backgroundColor,
          backgroundImage:
            "radial-gradient(circle at 1px 1px, rgba(0,0,0,0.05) 1px, transparent 0)",
          backgroundSize: "20px 20px",
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
            <p className="text-sm opacity-30 text-center">Use the toolbar to add media and memories.</p>
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
