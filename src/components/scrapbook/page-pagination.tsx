
"use client";

import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Plus, Loader2 } from "lucide-react";

interface PagePaginationProps {
  currentPage: number;
  totalPages: number;
  onPrev: () => void;
  onNext: () => void;
  onAddPage: () => void;
  isAddingPage: boolean;
  disabled?: boolean;
}

export function PagePagination({ 
  currentPage, 
  totalPages, 
  onPrev, 
  onNext, 
  onAddPage,
  isAddingPage,
  disabled 
}: PagePaginationProps) {
  return (
    <div className="flex items-center justify-between bg-white/50 backdrop-blur-sm p-2 rounded-lg border shadow-sm">
      <div className="flex items-center gap-2">
        <Button 
          variant="outline" 
          size="sm" 
          onClick={onPrev} 
          disabled={currentPage <= 1}
          className="h-8 w-8 p-0"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        
        <div className="px-3 py-1 bg-muted/50 rounded-md text-sm font-medium">
          Page {currentPage} of {totalPages}
        </div>

        <Button 
          variant="outline" 
          size="sm" 
          onClick={onNext} 
          disabled={currentPage >= totalPages}
          className="h-8 w-8 p-0"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      <Button 
        variant="default" 
        size="sm" 
        onClick={onAddPage} 
        disabled={disabled || isAddingPage}
        className="h-8"
      >
        {isAddingPage ? (
          <Loader2 className="mr-2 h-3 w-3 animate-spin" />
        ) : (
          <Plus className="mr-2 h-3 w-3" />
        )}
        Add Page
      </Button>
    </div>
  );
}
