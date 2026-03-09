
"use client";

import { useState, useEffect } from "react";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { 
  RotateCcw, 
  Maximize2, 
  Type, 
  X, 
  Bold, 
  Underline,
  Plus,
  Minus,
  BringToFront,
  SendToBack,
  Square
} from "lucide-react";
import { useAutoSave } from "@/hooks/use-auto-save";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface EditingPanelProps {
  selectedItem: any;
  allItems: any[];
  scrapbookId: string;
  pageId: string;
  onClose: () => void;
  onLiveUpdate: (id: string, updates: any) => void;
}

export function EditingPanel({ selectedItem, allItems, scrapbookId, pageId, onClose, onLiveUpdate }: EditingPanelProps) {
  const { debouncedUpdate } = useAutoSave();
  
  // Local state for sliders to allow smooth dragging before Firestore update
  const [rotation, setRotation] = useState(selectedItem.rotation || 0);
  const [scale, setScale] = useState(Math.abs(selectedItem.scaleX || 1));
  const [borderWidth, setBorderWidth] = useState(selectedItem.borderWidth || 0);

  useEffect(() => {
    setRotation(selectedItem.rotation || 0);
    setScale(Math.abs(selectedItem.scaleX || 1));
    setBorderWidth(selectedItem.borderWidth || 0);
  }, [selectedItem.id, selectedItem.rotation, selectedItem.scaleX, selectedItem.borderWidth]);

  const handleRotationChange = (val: number[]) => {
    const newRotation = val[0];
    setRotation(newRotation);
    onLiveUpdate(selectedItem.id, { rotation: newRotation });
    debouncedUpdate(scrapbookId, pageId, selectedItem.id, { rotation: newRotation });
  };

  const handleScaleChange = (val: number[]) => {
    const newScale = val[0];
    setScale(newScale);
    const isFlipped = (selectedItem.scaleX || 1) < 0;
    const updates = { 
      scaleX: newScale * (isFlipped ? -1 : 1),
      scaleY: newScale
    };
    onLiveUpdate(selectedItem.id, updates);
    debouncedUpdate(scrapbookId, pageId, selectedItem.id, updates);
  };

  const handleBorderWidthChange = (val: number[]) => {
    const newWidth = val[0];
    setBorderWidth(newWidth);
    onLiveUpdate(selectedItem.id, { borderWidth: newWidth });
    debouncedUpdate(scrapbookId, pageId, selectedItem.id, { borderWidth: newWidth });
  };

  const handleBorderColorChange = (color: string) => {
    onLiveUpdate(selectedItem.id, { borderColor: color });
    debouncedUpdate(scrapbookId, pageId, selectedItem.id, { borderColor: color });
  };

  const bringToFront = () => {
    if (!allItems.length) return;
    const maxZ = Math.max(...allItems.map(i => i.zIndex || 0));
    const newZ = maxZ + 1;
    onLiveUpdate(selectedItem.id, { zIndex: newZ });
    debouncedUpdate(scrapbookId, pageId, selectedItem.id, { zIndex: newZ });
  };

  const sendToBack = () => {
    if (!allItems.length) return;
    const minZ = Math.min(...allItems.map(i => i.zIndex || 0));
    const newZ = minZ - 1;
    onLiveUpdate(selectedItem.id, { zIndex: newZ });
    debouncedUpdate(scrapbookId, pageId, selectedItem.id, { zIndex: newZ });
  };

  const toggleBold = () => {
    const newBold = !selectedItem.isBold;
    onLiveUpdate(selectedItem.id, { isBold: newBold });
    debouncedUpdate(scrapbookId, pageId, selectedItem.id, { isBold: newBold });
  };

  const toggleUnderline = () => {
    const newUnderline = !selectedItem.isUnderline;
    onLiveUpdate(selectedItem.id, { isUnderline: newUnderline });
    debouncedUpdate(scrapbookId, pageId, selectedItem.id, { isUnderline: newUnderline });
  };

  const adjustFontSize = (delta: number) => {
    const newSize = Math.max(8, (selectedItem.fontSize || 24) + delta);
    onLiveUpdate(selectedItem.id, { fontSize: newSize });
    debouncedUpdate(scrapbookId, pageId, selectedItem.id, { fontSize: newSize });
  };

  const handleFontFamilyChange = (font: string) => {
    onLiveUpdate(selectedItem.id, { fontFamily: font });
    debouncedUpdate(scrapbookId, pageId, selectedItem.id, { fontFamily: font });
  };

  const colors = [
    { name: "White", value: "#FFFFFF" },
    { name: "Black", value: "#000000" },
    { name: "Primary", value: "hsl(35, 83%, 71%)" },
    { name: "Red", value: "#ef4444" },
    { name: "Blue", value: "#3b82f6" },
    { name: "Green", value: "#22c55e" },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-t shadow-2xl animate-in slide-in-from-bottom duration-300 pb-safe sm:left-14">
      <div className="container mx-auto p-4 flex flex-col gap-6 max-w-4xl">
        <div className="flex items-center justify-between border-b pb-2">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-md bg-primary/10 flex items-center justify-center text-primary">
              {selectedItem.type === 'text' ? <Type className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            </div>
            <h3 className="font-headline font-bold text-lg capitalize">Edit {selectedItem.type}</h3>
          </div>
          
          <div className="flex items-center gap-2">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="outline" size="icon" onClick={bringToFront} className="h-9 w-9">
                    <BringToFront className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Bring to Front</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="outline" size="icon" onClick={sendToBack} className="h-9 w-9">
                    <SendToBack className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Send to Back</TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <div className="h-6 border-l mx-2" />

            <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full h-9 w-9">
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Transformation Controls */}
          <div className="space-y-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <RotateCcw className="h-4 w-4" />
                  Rotation
                </Label>
                <span className="text-xs font-mono bg-muted px-2 py-0.5 rounded">{rotation}°</span>
              </div>
              <Slider 
                value={[rotation]} 
                min={0} 
                max={360} 
                step={1}
                onValueChange={handleRotationChange}
              />
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <Maximize2 className="h-4 w-4" />
                  Size
                </Label>
                <span className="text-xs font-mono bg-muted px-2 py-0.5 rounded">{scale.toFixed(1)}x</span>
              </div>
              <Slider 
                value={[scale]} 
                min={0.5} 
                max={3.0} 
                step={0.1}
                onValueChange={handleScaleChange}
              />
            </div>
          </div>

          {/* Border Controls */}
          <div className="space-y-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <Square className="h-4 w-4" />
                  Border Thickness
                </Label>
                <span className="text-xs font-mono bg-muted px-2 py-0.5 rounded">{borderWidth}px</span>
              </div>
              <Slider 
                value={[borderWidth]} 
                min={0} 
                max={20} 
                step={1}
                onValueChange={handleBorderWidthChange}
              />
            </div>

            <div className="space-y-3">
              <Label className="text-xs font-medium text-muted-foreground">Border Color</Label>
              <div className="flex flex-wrap gap-2">
                {colors.map((color) => (
                  <TooltipProvider key={color.value}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          onClick={() => handleBorderColorChange(color.value)}
                          className={cn(
                            "h-7 w-7 rounded-full border border-muted transition-transform hover:scale-110",
                            selectedItem.borderColor === color.value && "ring-2 ring-primary ring-offset-2"
                          )}
                          style={{ backgroundColor: color.value }}
                          aria-label={`Select ${color.name}`}
                        />
                      </TooltipTrigger>
                      <TooltipContent>{color.name}</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Text Specific Controls */}
        {selectedItem.type === 'text' && (
          <div className="flex flex-wrap items-center gap-6 pt-2 border-t mt-2">
            <div className="flex items-center gap-2">
               <Label className="text-xs font-medium text-muted-foreground">Font</Label>
               <Select value={selectedItem.fontFamily || "font-serif"} onValueChange={handleFontFamilyChange}>
                <SelectTrigger className="h-9 w-[130px] rounded-full">
                  <SelectValue placeholder="Font" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="font-serif">Elegant Serif</SelectItem>
                  <SelectItem value="font-sans">Modern Sans</SelectItem>
                  <SelectItem value="font-mono">Clean Mono</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <Label className="text-xs font-medium text-muted-foreground">Size</Label>
              <div className="flex items-center gap-1 bg-muted/50 rounded-full p-1">
                <Button size="icon" variant="ghost" className="h-7 w-7 rounded-full" onClick={() => adjustFontSize(-2)}>
                  <Minus className="h-3 w-3" />
                </Button>
                <span className="text-xs font-bold w-6 text-center">{selectedItem.fontSize || 24}</span>
                <Button size="icon" variant="ghost" className="h-7 w-7 rounded-full" onClick={() => adjustFontSize(2)}>
                  <Plus className="h-3 w-3" />
                </Button>
              </div>
            </div>

            <div className="flex items-center gap-1 bg-muted/50 rounded-full p-1 ml-auto">
              <Button 
                size="icon" 
                variant={selectedItem.isBold ? "default" : "ghost"} 
                className="h-8 w-8 rounded-full"
                onClick={toggleBold}
              >
                <Bold className="h-4 w-4" />
              </Button>
              <Button 
                size="icon" 
                variant={selectedItem.isUnderline ? "default" : "ghost"} 
                className="h-8 w-8 rounded-full"
                onClick={toggleUnderline}
              >
                <Underline className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
