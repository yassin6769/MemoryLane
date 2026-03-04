"use client";

import { useState, useRef } from "react";
import {
  FileDown,
  ImagePlus,
  Mic,
  Share2,
  Type,
  Video,
  CheckCircle2,
  Loader2,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useFirestore, useUser, useStorage } from "@/firebase";
import { addDocumentNonBlocking, updateDocumentNonBlocking } from "@/firebase/non-blocking-updates";
import { collection, doc, serverTimestamp } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { CollaboratorDialog } from "./collaborator-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

interface ToolbarProps {
  scrapbook: any;
  pageId?: string;
}

export function Toolbar({ scrapbook, pageId }: ToolbarProps) {
  const { toast } = useToast();
  const db = useFirestore();
  const storage = useStorage();
  const { user } = useUser();
  const [isFinalizing, setIsFinalizing] = useState(false);
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [isTextDialogOpen, setIsTextDialogOpen] = useState(false);
  const [textInput, setTextInput] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [currentMediaType, setCurrentMediaType] = useState<'image' | 'video' | 'audio' | null>(null);

  const collaboratorIds = scrapbook?.collaboratorIds || [];

  const handleFinalize = () => {
    if (!scrapbook?.id) return;
    setIsFinalizing(true);
    const scrapbookRef = doc(db, "scrapbooks", scrapbook.id);
    updateDocumentNonBlocking(scrapbookRef, { isFinalized: true });
    
    setTimeout(() => {
      setIsFinalizing(false);
      toast({
        title: "Design Finalized",
        description: "Your scrapbook design has been locked.",
      });
    }, 1000);
  };

  const handleMediaClick = (type: 'image' | 'video' | 'audio') => {
    setCurrentMediaType(type);
    fileInputRef.current?.click();
  };

  const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user || !pageId) return;

    toast({
      title: `Uploading ${currentMediaType}...`,
      description: "Please wait while we process your media.",
    });

    try {
      const storageRef = ref(storage, `scrapbooks/${scrapbook.id}/pages/${pageId}/${Date.now()}_${file.name}`);
      const uploadResult = await uploadBytes(storageRef, file);
      const downloadUrl = await getDownloadURL(uploadResult.ref);

      const objectsCol = collection(db, "scrapbooks", scrapbook.id, "pages", pageId, "canvasObjects");
      addDocumentNonBlocking(objectsCol, {
        pageId,
        type: currentMediaType,
        mediaUri: downloadUrl,
        members: scrapbook.members,
        x: 100,
        y: 100,
        width: currentMediaType === 'audio' ? 300 : 200,
        height: currentMediaType === 'audio' ? 60 : 200,
        rotation: 0,
        scaleX: 1,
        scaleY: 1,
        zIndex: 1,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      toast({
        title: "Success",
        description: `${currentMediaType} added to your canvas.`,
      });
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Upload Failed",
        description: "Could not upload media. Please try again.",
      });
    }
  };

  const saveText = () => {
    if (!textInput.trim() || !pageId) return;

    const objectsCol = collection(db, "scrapbooks", scrapbook.id, "pages", pageId, "canvasObjects");
    addDocumentNonBlocking(objectsCol, {
      pageId,
      type: "text",
      text: textInput,
      members: scrapbook.members,
      x: 150,
      y: 150,
      width: 200,
      height: 60,
      rotation: 0,
      scaleX: 1,
      scaleY: 1,
      zIndex: 10,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    setTextInput("");
    setIsTextDialogOpen(false);
    toast({
      title: "Text added",
      description: "You can now drag it around your canvas.",
    });
  };

  return (
    <div className="flex flex-wrap items-center justify-between gap-4">
      <div className="flex items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold font-headline">{scrapbook?.title}</h1>
            {scrapbook?.isFinalized && <CheckCircle2 className="h-5 w-5 text-green-500" />}
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline">{scrapbook?.category}</Badge>
            {scrapbook?.isPublic ? <Badge variant="secondary">Public</Badge> : <Badge variant="secondary">Private</Badge>}
          </div>
        </div>
      </div>
      
      <div className="flex items-center gap-2">
        <input
          type="file"
          ref={fileInputRef}
          className="hidden"
          accept={currentMediaType === 'image' ? 'image/*' : currentMediaType === 'video' ? 'video/*' : 'audio/*'}
          onChange={onFileChange}
        />
        
        <Button variant="outline" size="sm" onClick={() => handleMediaClick('image')}>
          <ImagePlus className="mr-2 h-4 w-4" />
          Image
        </Button>
        <Button variant="outline" size="sm" onClick={() => setIsTextDialogOpen(true)}>
          <Type className="mr-2 h-4 w-4" />
          Text
        </Button>
        <Button variant="outline" size="sm" onClick={() => handleMediaClick('video')}>
          <Video className="mr-2 h-4 w-4" />
          Video
        </Button>
        <Button variant="outline" size="sm" onClick={() => handleMediaClick('audio')}>
          <Mic className="mr-2 h-4 w-4" />
          Audio
        </Button>
        
        <div className="h-6 border-l mx-2" />
        
        <div className="flex -space-x-2 mr-2">
          {collaboratorIds.map((id: string, index: number) => (
            <Avatar key={id} className="h-8 w-8 border-2 border-background">
              <AvatarImage src={`https://picsum.photos/seed/30${index + 2}/40/40`} />
              <AvatarFallback>U</AvatarFallback>
            </Avatar>
          ))}
        </div>
        
        <Button variant="outline" size="sm" onClick={() => setIsShareOpen(true)}>
          <Share2 className="mr-2 h-4 w-4" />
          Share
        </Button>
        
        <Button size="sm" onClick={handleFinalize} disabled={isFinalizing || scrapbook?.isFinalized}>
          {isFinalizing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
          {scrapbook?.isFinalized ? "Finalized" : "Finalize Design"}
        </Button>
      </div>

      <CollaboratorDialog 
        scrapbook={scrapbook} 
        open={isShareOpen} 
        onOpenChange={setIsShareOpen} 
      />

      <Dialog open={isTextDialogOpen} onOpenChange={setIsTextDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Text to Canvas</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Input 
              placeholder="What's the story?" 
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && saveText()}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsTextDialogOpen(false)}>Cancel</Button>
            <Button onClick={saveText}>Add to Canvas</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
