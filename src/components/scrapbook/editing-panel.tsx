
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
  Square,
  Image as ImageIcon,
  Check,
  Volume2,
  Palette,
  Layers
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
import { updateDocumentNonBlocking } from "@/firebase/non-blocking-updates";
import { doc, getFirestore, serverTimestamp } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";

interface EditingPanelProps {
  selectedItem: any;
  allItems: any[];
  scrapbookId: string;
  pageId: string;
  currentCoverImage?: string;
  onClose: () => void;
  onLiveUpdate: (id: string, updates: any) => void;
}

export function EditingPanel({ 
  selectedItem, 
  allItems, 
  scrapbookId, 
  pageId, 
  currentCoverImage,
  onClose, 
  onLiveUpdate 
}: EditingPanelProps) {
  const { debouncedUpdate } = useAutoSave();
  const { toast } = useToast();
  const db = getFirestore();
  
  const [rotation, setRotation] = useState(selectedItem.rotation || 0);
  const [scale, setScale] = useState(Math.abs(selectedItem.scaleX || 1));
  const [borderWidth, setBorderWidth] = useState(selectedItem.borderWidth || 0);
  const [volume, setVolume] = useState(selectedItem.volume !== undefined ? selectedItem.volume : 100);
  const [alpha, setAlpha] = useState(selectedItem.alpha !== undefined ? selectedItem.alpha : 100);

  useEffect(() => {
    setRotation(selectedItem.rotation || 0);
    setScale(Math.abs(selectedItem.scaleX || 1));
    setBorderWidth(selectedItem.borderWidth || 0);
    setVolume(selectedItem.volume !== undefined ? selectedItem.volume : 100);
    setAlpha(selectedItem.alpha !== undefined ? selectedItem.alpha : 100);
  }, [selectedItem.id, selectedItem.rotation, selectedItem.scaleX, selectedItem.borderWidth, selectedItem.volume, selectedItem.alpha]);

  const handleRotationChange = (val: number[]) => {
    const newRotation = val[0];
    setRotation(newRotation);
    onLiveUpdate(selectedItem.id, { rotation: newRotation });
    debouncedUpdate(scrapbookId, pageId, selectedItem.id, { rotation: newRotation });
  };

  const handleScaleChange = (val: number[]) => {
    const newScale = val[0];
    setScale(newScale);
    const updates = { scaleX: newScale * ((selectedItem.scaleX || 1) < 0 ? -1 : 1), scaleY: newScale };
    onLiveUpdate(selectedItem.id, updates);
    debouncedUpdate(scrapbookId, pageId, selectedItem.id, updates);
  };

  const handleAlphaChange = (val: number[]) => {
    const newAlpha = val[0];
    setAlpha(newAlpha);
    onLiveUpdate(selectedItem.id, { alpha: newAlpha });
    debouncedUpdate(scrapbookId, pageId, selectedItem.id, { alpha: newAlpha });
  };

  const handleTextColorChange = (color: string) => {
    onLiveUpdate(selectedItem.id, { textColor: color });
    debouncedUpdate(scrapbookId, pageId, selectedItem.id, { textColor: color });
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

  const handleSetAsCover = () => {
    if (!selectedItem.mediaUri) return;
    const scrapbookRef = doc(db, "scrapbooks", scrapbookId);
    updateDocumentNonBlocking(scrapbookRef, { 
      coverImage: selectedItem.mediaUri,
      updatedAt: serverTimestamp()
    });
    toast({ title: "Cover Updated!" });
  };

  const colors = [
    { name: "Black", value: "#000000" },
    { name: "White", value: "#FFFFFF" },
    { name: "Primary", value: "#f1b36a" },
    { name: "Soft Blue", value: "#93c5fd" },
    { name: "Sage", value: "#a7f3d0" },
    { name: "Rose", value: "#fda4af" },
    { name: "Slate", value: "#475569" },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-t shadow-2xl animate-in slide-in-from-bottom duration-300 pb-safe sm:left-14">
      <div className="container mx-auto p-4 flex flex-col gap-6 max-w-4xl">
        <div className="flex items-center justify-between border-b pb-2">
          <div className="flex items-center gap-2">
            <h3 className="font-headline font-bold text-lg capitalize">Editing {selectedItem.type}</h3>
          </div>
          
          <div className="flex items-center gap-2">
            {(selectedItem.type === 'image' || selectedItem.type === 'video') && (
              <Button 
                variant={selectedItem.mediaUri === currentCoverImage ? "default" : "outline"} 
                size="sm" 
                onClick={handleSetAsCover}
                className="h-9 gap-2"
              >
                <ImageIcon className="h-4 w-4" />
                Set Cover
              </Button>
            )}
            <Button variant="outline" size="icon" onClick={bringToFront}><BringToFront className="h-4 w-4" /></Button>
            <Button variant="outline" size="icon" onClick={sendToBack}><SendToBack className="h-4 w-4" /></Button>
            <Button variant="ghost" size="icon" onClick={onClose}><X className="h-5 w-5" /></Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-6">
            <div className="space-y-4">
              <Label className="flex items-center gap-2 text-sm font-medium"><RotateCcw className="h-4 w-4" /> Rotation ({rotation}°)</Label>
              <Slider value={[rotation]} min={0} max={360} onValueChange={handleRotationChange} />
            </div>
            <div className="space-y-4">
              <Label className="flex items-center gap-2 text-sm font-medium"><Maximize2 className="h-4 w-4" /> Size ({scale.toFixed(1)}x)</Label>
              <Slider value={[scale]} min={0.5} max={3.0} step={0.1} onValueChange={handleScaleChange} />
            </div>
          </div>

          <div className="space-y-6">
            <div className="space-y-4">
              <Label className="flex items-center gap-2 text-sm font-medium"><Layers className="h-4 w-4" /> Transparency ({alpha}%)</Label>
              <Slider value={[alpha]} min={0} max={100} onValueChange={handleAlphaChange} />
            </div>
            {selectedItem.type === 'text' && (
              <div className="space-y-3">
                <Label className="flex items-center gap-2 text-sm font-medium"><Palette className="h-4 w-4" /> Text Color</Label>
                <div className="flex flex-wrap gap-2">
                  {colors.map((color) => (
                    <button
                      key={color.value}
                      onClick={() => handleTextColorChange(color.value)}
                      className={cn(
                        "h-7 w-7 rounded-full border border-muted transition-transform hover:scale-110",
                        selectedItem.textColor === color.value && "ring-2 ring-primary ring-offset-2"
                      )}
                      style={{ backgroundColor: color.value }}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
