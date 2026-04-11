
"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  ImagePlus,
  Share2,
  Type,
  Video,
  Loader2,
  ChevronLeft,
  FileAudio,
  Palette,
  Shapes,
  Circle,
  Square,
  Triangle,
  Minus
} from "lucide-react";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { useFirestore, useUser, useStorage } from "@/firebase";
import { addDocumentNonBlocking, updateDocumentNonBlocking } from "@/firebase/non-blocking-updates";
import { collection, doc, serverTimestamp } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { CollaboratorDialog } from "./collaborator-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface ToolbarProps {
  scrapbook: any;
  pageId?: string;
  items?: any[]; 
  currentPageData?: any;
}

export function Toolbar({ scrapbook, pageId, items = [], currentPageData }: ToolbarProps) {
  const router = useRouter();
  const { toast } = useToast();
  const db = useFirestore();
  const storage = useStorage();
  const { user } = useUser();
  const [isFinalizing, setIsFinalizing] = useState(false);
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [isTextDialogOpen, setIsTextDialogOpen] = useState(false);
  const [isBackDialogOpen, setIsBackDialogOpen] = useState(false);
  const [textInput, setTextInput] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [currentMediaType, setCurrentMediaType] = useState<'image' | 'video' | 'audio' | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const canvasColors = [
    { name: "Classic White", value: "#ffffff" },
    { name: "Creamy Paper", value: "#fdf6e3" },
    { name: "Soft Grey", value: "#f8fafc" },
    { name: "Midnight", value: "#1e293b" },
    { name: "Vintage Sepia", value: "#faf3e0" },
    { name: "Pale Pink", value: "#fff1f2" },
    { name: "Sky Mist", value: "#f0f9ff" },
  ];

  const handleBackNavigation = () => {
    if (scrapbook?.isFinalized) {
      router.push("/dashboard");
    } else {
      setIsBackDialogOpen(true);
    }
  };

  const handleFinalize = () => {
    if (!scrapbook?.id) return;
    setIsFinalizing(true);
    const scrapbookRef = doc(db, "scrapbooks", scrapbook.id);
    updateDocumentNonBlocking(scrapbookRef, { isFinalized: true, updatedAt: serverTimestamp() });
    setTimeout(() => {
      setIsFinalizing(false);
      toast({ title: "Design Finalized" });
      router.push("/dashboard");
    }, 800);
  };

  const updatePageColor = (color: string) => {
    if (!pageId) return;
    const pageRef = doc(db, "scrapbooks", scrapbook.id, "pages", pageId);
    updateDocumentNonBlocking(pageRef, { backgroundColor: color, updatedAt: serverTimestamp() });
    toast({ title: "Canvas Color Updated" });
  };

  const uploadMediaBlob = async (blob: Blob | File, fileName: string, type: 'image' | 'video' | 'audio') => {
    if (!storage || !user || !pageId) return;
    setIsUploading(true);
    try {
      await user.getIdToken(true);
      const storagePath = `scrapbooks/${scrapbook.id}/${user.uid}/${Date.now()}_${fileName}`;
      const storageRef = ref(storage, storagePath);
      const snapshot = await uploadBytes(storageRef, blob);
      const downloadUrl = await getDownloadURL(snapshot.ref);
      const objectsCol = collection(db, "scrapbooks", scrapbook.id, "pages", pageId, "canvasObjects");
      const nextZIndex = items.length > 0 ? Math.max(...items.map((i: any) => i.zIndex || 0)) + 1 : 1;

      addDocumentNonBlocking(objectsCol, {
        pageId, id: "obj_" + Date.now(), type, mediaUri: downloadUrl,
        members: scrapbook.members, x: 100, y: 100, width: 250, height: type === 'audio' ? 150 : 350,
        rotation: 0, scaleX: 1, scaleY: 1, zIndex: nextZIndex, createdAt: serverTimestamp(),
      });
      toast({ title: "Memory added!" });
    } catch (error: any) {
      console.error("[Storage Error] Code:", error.code);
      toast({ variant: "destructive", title: "Upload Failed" });
    } finally {
      setIsUploading(false);
    }
  };

  const handleTriggerUpload = (type: 'image' | 'video' | 'audio') => {
    setCurrentMediaType(type);
    setTimeout(() => fileInputRef.current?.click(), 0);
  };

  const saveText = () => {
    if (!textInput.trim() || !pageId || !user) return;
    const objectsCol = collection(db, "scrapbooks", scrapbook.id, "pages", pageId, "canvasObjects");
    const nextZIndex = items.length > 0 ? Math.max(...items.map((i: any) => i.zIndex || 0)) + 1 : 1;
    addDocumentNonBlocking(objectsCol, {
      pageId, type: "text", text: textInput, textColor: "#000000", alpha: 100,
      id: "text_" + Date.now(), fontSize: 24, fontFamily: "font-serif",
      members: scrapbook.members, x: 150, y: 150, width: 280, height: 120, zIndex: nextZIndex,
      createdAt: serverTimestamp(),
    });
    setTextInput("");
    setIsTextDialogOpen(false);
    toast({ title: "Text added!" });
  };

  const addShape = (shapeType: string) => {
    if (!pageId || !user) return;
    const objectsCol = collection(db, "scrapbooks", scrapbook.id, "pages", pageId, "canvasObjects");
    const nextZIndex = items.length > 0 ? Math.max(...items.map((i: any) => i.zIndex || 0)) + 1 : 1;
    addDocumentNonBlocking(objectsCol, {
      pageId, type: "shape", shapeType, fillColor: "#f1b36a", alpha: 100,
      id: "shape_" + Date.now(), members: scrapbook.members,
      x: 200, y: 200, width: 150, height: 150, zIndex: nextZIndex,
      createdAt: serverTimestamp(),
    });
    toast({ title: `${shapeType} added!` });
  };

  return (
    <div className="flex flex-col gap-4">
      {isUploading && <Progress value={undefined} className="h-1" />}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={handleBackNavigation} className="rounded-full shrink-0">
            <ChevronLeft className="h-6 w-6" />
          </Button>
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-bold font-headline truncate">{scrapbook?.title}</h1>
            <Badge variant="outline">{scrapbook?.category}</Badge>
          </div>
        </div>
        
        {/* Scrollable actions for mobile */}
        <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto pb-2 sm:pb-0 no-scrollbar">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="shrink-0"><Palette className="mr-2 h-4 w-4" /> Color</Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 p-2">
              <div className="grid grid-cols-4 gap-2">
                {canvasColors.map((color) => (
                  <button
                    key={color.value}
                    onClick={() => updatePageColor(color.value)}
                    className={cn(
                      "h-8 w-8 rounded-full border border-muted transition-transform hover:scale-110",
                      currentPageData?.backgroundColor === color.value && "ring-2 ring-primary ring-offset-1"
                    )}
                    style={{ backgroundColor: color.value }}
                    title={color.name}
                  />
                ))}
              </div>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button variant="outline" size="sm" className="shrink-0" onClick={() => handleTriggerUpload('image')}><ImagePlus className="mr-2 h-4 w-4" /> Photo</Button>
          <Button variant="outline" size="sm" className="shrink-0" onClick={() => handleTriggerUpload('video')}><Video className="mr-2 h-4 w-4" /> Video</Button>
          <Button variant="outline" size="sm" className="shrink-0" onClick={() => handleTriggerUpload('audio')}><FileAudio className="mr-2 h-4 w-4" /> Audio</Button>
          <Button variant="outline" size="sm" className="shrink-0" onClick={() => setIsTextDialogOpen(true)}><Type className="mr-2 h-4 w-4" /> Text</Button>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="shrink-0"><Shapes className="mr-2 h-4 w-4" /> Shape</Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={() => addShape('circle')}><Circle className="mr-2 h-4 w-4" /> Circle</DropdownMenuItem>
              <DropdownMenuItem onClick={() => addShape('square')}><Square className="mr-2 h-4 w-4" /> Square</DropdownMenuItem>
              <DropdownMenuItem onClick={() => addShape('rectangle')}><Minus className="mr-2 h-4 w-4" /> Rectangle</DropdownMenuItem>
              <DropdownMenuItem onClick={() => addShape('triangle')}><Triangle className="mr-2 h-4 w-4" /> Triangle</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button variant="outline" size="sm" className="shrink-0" onClick={() => setIsShareOpen(true)}><Share2 className="mr-2 h-4 w-4" /> Share</Button>
          <Button size="sm" className="shrink-0" onClick={handleFinalize} disabled={isFinalizing}>{isFinalizing ? <Loader2 className="h-4 w-4 animate-spin" /> : "Finalize"}</Button>
        </div>
      </div>
      <input 
        type="file" 
        ref={fileInputRef} 
        className="hidden" 
        accept={
          currentMediaType === 'image' ? 'image/*' : 
          currentMediaType === 'video' ? 'video/*' : 
          'audio/*'
        } 
        onChange={(e) => { 
          const f = e.target.files?.[0]; 
          if (f && currentMediaType) uploadMediaBlob(f, f.name, currentMediaType); 
          e.target.value = ''; 
        }} 
      />
      <CollaboratorDialog scrapbook={scrapbook} open={isShareOpen} onOpenChange={setIsShareOpen} />
      <Dialog open={isTextDialogOpen} onOpenChange={setIsTextDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Story Text</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Input 
              placeholder="The story behind this moment..." 
              value={textInput} 
              onChange={(e) => setTextInput(e.target.value)} 
              onKeyDown={(e) => e.key === 'Enter' && saveText()} 
            />
          </div>
          <DialogFooter>
            <Button onClick={saveText}>Add to Page</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <AlertDialog open={isBackDialogOpen} onOpenChange={setIsBackDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Exit Editor?</AlertDialogTitle>
            <AlertDialogDescription>Your changes are saved automatically.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Continue Editing</AlertDialogCancel>
            <AlertDialogAction onClick={() => router.push("/dashboard")} className="bg-destructive">Exit</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
