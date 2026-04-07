"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  ImagePlus,
  Mic,
  Share2,
  Type,
  Video,
  CheckCircle2,
  Loader2,
  ChevronLeft,
  AlertTriangle,
  CircleStop,
  Radio,
  FileAudio,
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
}

export function Toolbar({ scrapbook, pageId, items = [] }: ToolbarProps) {
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

  const [isRecording, setIsRecording] = useState(false);
  const [recorder, setRecorder] = useState<MediaRecorder | null>(null);

  const handleBackNavigation = () => {
    if (scrapbook?.isFinalized) {
      router.push("/dashboard");
    } else {
      setIsBackDialogOpen(true);
    }
  };

  const confirmBack = () => {
    setIsBackDialogOpen(false);
    router.push("/dashboard");
  };

  const handleFinalize = () => {
    if (!scrapbook?.id) return;
    setIsFinalizing(true);
    
    const scrapbookRef = doc(db, "scrapbooks", scrapbook.id);
    
    updateDocumentNonBlocking(scrapbookRef, { 
      isFinalized: true,
      updatedAt: serverTimestamp()
    });
    
    setTimeout(() => {
      setIsFinalizing(false);
      toast({
        title: "Design Finalized",
        description: "Your scrapbook design has been locked.",
      });
      router.push("/dashboard");
    }, 800);
  };

  const handleMediaClick = (type: 'image' | 'video' | 'audio') => {
    setCurrentMediaType(type);
    setTimeout(() => {
        fileInputRef.current?.click();
    }, 50);
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Determine a supported mime type for the recorder
      const mimeType = MediaRecorder.isTypeSupported('audio/webm') 
        ? 'audio/webm' 
        : MediaRecorder.isTypeSupported('audio/ogg')
        ? 'audio/ogg'
        : 'audio/mp4';

      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      const chunks: Blob[] = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(chunks, { type: mimeType });
        const extension = mimeType.split('/')[1] || 'webm';
        await uploadMediaBlob(audioBlob, `voice_memo_${Date.now()}.${extension}`, 'audio');
        stream.getTracks().forEach(track => track.stop());
      };

      setRecorder(mediaRecorder);
      mediaRecorder.start();
      setIsRecording(true);
      toast({
        title: "Recording Started",
        description: "Speak clearly into your microphone.",
      });
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Mic Access Denied",
        description: "Please enable microphone permissions in your settings.",
      });
    }
  };

  const stopRecording = () => {
    if (recorder && isRecording) {
      recorder.stop();
      setIsRecording(false);
    }
  };

  const uploadMediaBlob = async (blob: Blob | File, fileName: string, type: 'image' | 'video' | 'audio') => {
    if (!storage || !user || !pageId) {
        toast({ 
            variant: "destructive", 
            title: "Session Error", 
            description: "Missing required services. Please refresh." 
        });
        return;
    }

    setIsUploading(true);
    setCurrentMediaType(type);

    try {
      // Force a token refresh to ensure synced session with Nuclear Rules
      await user.getIdToken(true);
      await new Promise(resolve => setTimeout(resolve, 800)); 

      const storagePath = `scrapbooks/${scrapbook.id}/${user.uid}/${Date.now()}_${fileName}`;
      const storageRef = ref(storage, storagePath);
      
      const metadata = {
        contentType: blob.type || (type === 'image' ? 'image/jpeg' : type === 'video' ? 'video/mp4' : 'audio/mpeg'),
      };

      const snapshot = await uploadBytes(storageRef, blob, metadata);
      const downloadUrl = await getDownloadURL(snapshot.ref);
      
      const objectsCol = collection(db, "scrapbooks", scrapbook.id, "pages", pageId, "canvasObjects");
      const nextZIndex = items.length > 0 ? Math.max(...items.map((i: any) => i.zIndex || 0)) + 1 : 1;

      const objectData = {
        pageId,
        id: "obj_" + Date.now(),
        type: type,
        mediaUri: downloadUrl,
        members: scrapbook.members || { [user.uid]: 'owner' },
        x: 100,
        y: 100,
        width: type === 'audio' ? 300 : (type === 'text' ? 280 : 250),
        height: type === 'audio' ? 140 : (type === 'text' ? 120 : 350),
        rotation: 0,
        scaleX: 1,
        scaleY: 1,
        zIndex: nextZIndex,
        borderWidth: 0,
        borderColor: "#000000",
        volume: 100,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };
      
      addDocumentNonBlocking(objectsCol, objectData);

      if (type === 'image' && (!scrapbook.coverImage || scrapbook.coverImage === "")) {
        const scrapbookRef = doc(db, "scrapbooks", scrapbook.id);
        updateDocumentNonBlocking(scrapbookRef, {
          coverImage: downloadUrl,
          updatedAt: serverTimestamp()
        });
      }

      toast({ title: "Memory added!" });
    } catch (error: any) {
      console.error("[Storage Error] Details:", error);
      toast({ 
        variant: "destructive", 
        title: "Upload Failed", 
        description: "Permission denied or communication error. Please try again." 
      });
    } finally {
      setIsUploading(false);
    }
  };

  const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !currentMediaType) return;
    await uploadMediaBlob(file, file.name, currentMediaType);
    e.target.value = ''; 
  };

  const saveText = () => {
    if (!textInput.trim() || !pageId || !user) return;

    const objectsCol = collection(db, "scrapbooks", scrapbook.id, "pages", pageId, "canvasObjects");
    const nextZIndex = items.length > 0 ? Math.max(...items.map((i: any) => i.zIndex || 0)) + 1 : 1;

    addDocumentNonBlocking(objectsCol, {
      pageId,
      id: "text_" + Date.now(),
      type: "text",
      text: textInput,
      isBold: false,
      isUnderline: false,
      fontSize: 24,
      fontFamily: "font-serif",
      borderWidth: 0,
      borderColor: "#000000",
      members: scrapbook.members || { [user.uid]: 'owner' },
      x: 150,
      y: 150,
      width: 280,
      height: 120,
      rotation: 0,
      scaleX: 1,
      scaleY: 1,
      zIndex: nextZIndex,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    setTextInput("");
    setIsTextDialogOpen(false);
    toast({ title: "Text added!" });
  };

  return (
    <div className="flex flex-col gap-4">
      {isUploading && (
        <div className="w-full space-y-2 px-1">
          <div className="flex justify-between text-xs font-medium">
            <span className="animate-pulse flex items-center gap-2 text-primary">
                <Loader2 className="h-3 w-3 animate-spin" />
                Uploading {currentMediaType}...
            </span>
            <span className="text-muted-foreground italic">Preserving memory...</span>
          </div>
          <Progress value={undefined} className="h-2" />
        </div>
      )}

      {isRecording && (
        <div className="w-full bg-destructive/10 border border-destructive/20 p-2 rounded-lg flex items-center justify-between animate-in fade-in slide-in-from-top-2">
            <div className="flex items-center gap-3">
                <div className="h-3 w-3 rounded-full bg-destructive animate-pulse" />
                <span className="text-sm font-medium text-destructive">Recording Memo...</span>
            </div>
            <Button variant="destructive" size="sm" onClick={stopRecording} className="h-8 gap-2">
                <CircleStop className="h-4 w-4" />
                Stop & Save
            </Button>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={handleBackNavigation}
            className="rounded-full h-10 w-10 hover:bg-muted/50 transition-colors"
          >
            <ChevronLeft className="h-6 w-6" />
          </Button>
          
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
            accept={
                currentMediaType === 'image' 
                ? 'image/*' 
                : currentMediaType === 'video' 
                ? 'video/*' 
                : 'audio/*'
            }
            onChange={onFileChange}
          />
          
          <Button variant="outline" size="sm" onClick={() => handleMediaClick('image')} disabled={scrapbook?.isFinalized || isRecording || isUploading}>
            <ImagePlus className="mr-2 h-4 w-4" />
            Photo
          </Button>
          <Button variant="outline" size="sm" onClick={() => setIsTextDialogOpen(true)} disabled={scrapbook?.isFinalized || isRecording || isUploading}>
            <Type className="mr-2 h-4 w-4" />
            Text
          </Button>
          <Button variant="outline" size="sm" onClick={() => handleMediaClick('video')} disabled={scrapbook?.isFinalized || isRecording || isUploading}>
            <Video className="mr-2 h-4 w-4" />
            Video
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" disabled={scrapbook?.isFinalized || isRecording || isUploading}>
                    <Mic className="mr-2 h-4 w-4" />
                    Audio
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={startRecording} className="gap-2">
                    <Radio className="h-4 w-4 text-destructive" />
                    Record New Memo
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleMediaClick('audio')} className="gap-2">
                    <FileAudio className="h-4 w-4" />
                    Upload Audio File
                </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          
          <div className="h-6 border-l mx-2 hidden sm:block" />
          
          <Button variant="outline" size="sm" onClick={() => setIsShareOpen(true)}>
            <Share2 className="mr-2 h-4 w-4" />
            Share
          </Button>
          
          <Button size="sm" onClick={handleFinalize} disabled={isFinalizing || scrapbook?.isFinalized || isRecording || isUploading}>
            {isFinalizing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
            {scrapbook?.isFinalized ? "Finalized" : "Finalize"}
          </Button>
        </div>
      </div>

      <CollaboratorDialog 
        scrapbook={scrapbook} 
        open={isShareOpen} 
        onOpenChange={setIsShareOpen} 
      />

      <Dialog open={isTextDialogOpen} onOpenChange={setIsTextDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Story Text</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Input 
              placeholder="What's the story behind this moment?" 
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && saveText()}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsTextDialogOpen(false)}>Cancel</Button>
            <Button onClick={saveText}>Add to Page</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={isBackDialogOpen} onOpenChange={setIsBackDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Discard changes?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Your edits are automatically saved, but you haven't finalized this version yet. You can return to finish it anytime from your dashboard.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Continue Editing</AlertDialogCancel>
            <AlertDialogAction onClick={confirmBack} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Exit
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
