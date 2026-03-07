
"use client";

import { useState, useRef, useEffect } from "react";
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
  FileAudio
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { useFirestore, useUser, useStorage } from "@/firebase";
import { addDocumentNonBlocking, updateDocumentNonBlocking } from "@/firebase/non-blocking-updates";
import { collection, doc, serverTimestamp } from "firebase/firestore";
import { ref, uploadBytesResumable, getDownloadURL, StorageError } from "firebase/storage";
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
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);

  // Audio Recording State
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
    console.log(`[Toolbar] Media selection initiated for type: ${type}`);
    setCurrentMediaType(type);
    setTimeout(() => {
        fileInputRef.current?.click();
    }, 50);
  };

  const startRecording = async () => {
    console.log("[Toolbar] Attempting to start audio recording...");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      const chunks: Blob[] = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        console.log("[Toolbar] Recording stopped. Preparing upload...");
        const audioBlob = new Blob(chunks, { type: 'audio/webm' });
        await uploadMediaBlob(audioBlob, 'voice_memo.webm', 'audio');
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
      console.error("[Toolbar] Microphone access error:", err);
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

  /**
   * ROBUST MEDIA UPLOAD LOGIC
   * Handles Storage upload, Progress monitoring, and Firestore metadata writing.
   */
  const uploadMediaBlob = async (blob: Blob | File, fileName: string, type: 'image' | 'video' | 'audio') => {
    console.log(`[MediaUpload] Starting upload process for ${fileName} (${type})`);
    
    // SAFETY CHECK: Verify Storage Initialization
    if (!storage || !storage.app.options.storageBucket) {
        console.error("[MediaUpload] Firebase Error: Storage Bucket not found. Check firebase/config.ts");
        toast({ 
            variant: "destructive", 
            title: "Configuration Error", 
            description: "Firebase Storage is not properly initialized. Default bucket is missing." 
        });
        return;
    }

    if (!user) {
      console.error("[MediaUpload] Failed: User not authenticated.");
      toast({ variant: "destructive", title: "Upload Failed", description: "You must be logged in to upload media." });
      return;
    }

    if (!pageId) {
      console.error("[MediaUpload] Failed: No active Page ID found.");
      toast({ variant: "destructive", title: "Upload Failed", description: "No active page selected for this canvas." });
      return;
    }
    
    setUploadProgress(0);
    setCurrentMediaType(type);

    try {
      const storagePath = `scrapbooks/${scrapbook.id}/pages/${pageId}/${Date.now()}_${fileName}`;
      console.log(`[MediaUpload] Target Storage Path: ${storagePath}`);
      
      const storageRef = ref(storage, storagePath);
      const uploadTask = uploadBytesResumable(storageRef, blob);

      uploadTask.on('state_changed', 
        (snapshot) => {
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          console.log(`[MediaUpload] Progress: ${Math.round(progress)}%`);
          setUploadProgress(progress);
        }, 
        (error: StorageError) => {
          console.error("[MediaUpload] Firebase Storage Error:", error.code, error.message);
          setUploadProgress(null);
          
          let errorMessage = "Could not upload media.";
          if (error.code === 'storage/unauthorized') {
            errorMessage = "Permission Denied: Check your storage security rules.";
          } else if (error.code === 'storage/quota-exceeded') {
            errorMessage = "Storage quota exceeded. Please contact support.";
          } else if (error.code === 'storage/canceled') {
            errorMessage = "Upload was canceled by the user.";
          } else if (error.code === 'storage/no-default-bucket') {
            errorMessage = "Storage Bucket not found. Check your configuration.";
          }

          toast({ 
            variant: "destructive", 
            title: "Upload Failed", 
            description: errorMessage 
          });
        }, 
        async () => {
          console.log("[MediaUpload] Storage upload complete. Fetching Download URL...");
          const downloadUrl = await getDownloadURL(uploadTask.snapshot.ref);
          console.log(`[MediaUpload] Download URL retrieved: ${downloadUrl}`);

          const objectsCol = collection(db, "scrapbooks", scrapbook.id, "pages", pageId, "canvasObjects");
          
          // Calculate next zIndex
          const nextZIndex = items.length > 0 ? Math.max(...items.map((i: any) => i.zIndex || 0)) + 1 : 1;

          const objectData = {
            pageId,
            type: type,
            mediaUri: downloadUrl,
            members: scrapbook.members,
            x: 100,
            y: 100,
            width: type === 'audio' ? 300 : 250,
            height: type === 'audio' ? 80 : 250,
            rotation: 0,
            scaleX: 1,
            scaleY: 1,
            zIndex: nextZIndex,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          };

          console.log("[MediaUpload] Writing metadata to Firestore:", objectData);
          
          addDocumentNonBlocking(objectsCol, objectData);

          setUploadProgress(null);
          toast({ title: "Success", description: `${type} added to your canvas.` });
        }
      );
    } catch (err: any) {
      console.error("[MediaUpload] Unexpected process failure:", err);
      setUploadProgress(null);
      toast({ 
        variant: "destructive", 
        title: "Process Failed", 
        description: err.message || "An unexpected error occurred during processing." 
      });
    }
  };

  const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) {
        console.warn("[Toolbar] onFileChange triggered but no file selected.");
        return;
    }
    
    if (!currentMediaType) {
        console.error("[Toolbar] onFileChange triggered but currentMediaType is null.");
        return;
    }

    console.log(`[Toolbar] File selected: ${file.name}, Size: ${file.size} bytes`);
    await uploadMediaBlob(file, file.name, currentMediaType);
    
    // Reset input value to allow selecting the same file again if needed
    e.target.value = '';
  };

  const saveText = () => {
    if (!textInput.trim()) {
        toast({ variant: "destructive", title: "Invalid Input", description: "Please enter some text." });
        return;
    }
    
    if (!pageId) {
        toast({ variant: "destructive", title: "Error", description: "No active page found." });
        return;
    }

    console.log(`[Toolbar] Saving text object: "${textInput}"`);

    const objectsCol = collection(db, "scrapbooks", scrapbook.id, "pages", pageId, "canvasObjects");
    const nextZIndex = items.length > 0 ? Math.max(...items.map((i: any) => i.zIndex || 0)) + 1 : 1;

    addDocumentNonBlocking(objectsCol, {
      pageId,
      type: "text",
      text: textInput,
      members: scrapbook.members,
      x: 150,
      y: 150,
      width: 250,
      height: 80,
      rotation: 0,
      scaleX: 1,
      scaleY: 1,
      zIndex: nextZIndex,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    setTextInput("");
    setIsTextDialogOpen(false);
  };

  return (
    <div className="flex flex-col gap-4">
      {uploadProgress !== null && (
        <div className="w-full space-y-2 px-1">
          <div className="flex justify-between text-xs font-medium">
            <span className="animate-pulse flex items-center gap-2">
                <Loader2 className="h-3 w-3 animate-spin" />
                Uploading {currentMediaType}...
            </span>
            <span>{Math.round(uploadProgress)}%</span>
          </div>
          <Progress value={uploadProgress} className="h-2" />
        </div>
      )}

      {isRecording && (
        <div className="w-full bg-destructive/10 border border-destructive/20 p-2 rounded-lg flex items-center justify-between animate-in fade-in slide-in-from-top-2">
            <div className="flex items-center gap-3">
                <div className="h-3 w-3 rounded-full bg-destructive animate-pulse" />
                <span className="text-sm font-medium text-destructive">Recording Voice Memo...</span>
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
                ? 'image/png,image/jpeg,image/jpg' 
                : currentMediaType === 'video' 
                ? 'video/mp4,video/quicktime' 
                : 'audio/mpeg,audio/wav,audio/m4a'
            }
            onChange={onFileChange}
          />
          
          <Button variant="outline" size="sm" onClick={() => handleMediaClick('image')} disabled={scrapbook?.isFinalized || isRecording}>
            <ImagePlus className="mr-2 h-4 w-4" />
            Image
          </Button>
          <Button variant="outline" size="sm" onClick={() => setIsTextDialogOpen(true)} disabled={scrapbook?.isFinalized || isRecording}>
            <Type className="mr-2 h-4 w-4" />
            Text
          </Button>
          <Button variant="outline" size="sm" onClick={() => handleMediaClick('video')} disabled={scrapbook?.isFinalized || isRecording}>
            <Video className="mr-2 h-4 w-4" />
            Video
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" disabled={scrapbook?.isFinalized || isRecording}>
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
                    Select Audio File
                </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          
          <div className="h-6 border-l mx-2" />
          
          <div className="flex -space-x-2 mr-2">
            {Object.keys(scrapbook?.members || {}).slice(0, 3).map((uid) => (
              <Avatar key={uid} className="h-8 w-8 border-2 border-background">
                <AvatarImage src={`https://picsum.photos/seed/${uid}/40/40`} />
                <AvatarFallback>U</AvatarFallback>
              </Avatar>
            ))}
          </div>
          
          <Button variant="outline" size="sm" onClick={() => setIsShareOpen(true)}>
            <Share2 className="mr-2 h-4 w-4" />
            Share
          </Button>
          
          <Button size="sm" onClick={handleFinalize} disabled={isFinalizing || scrapbook?.isFinalized || isRecording}>
            {isFinalizing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
            {scrapbook?.isFinalized ? "Finalized" : "Finalize Design"}
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

      <AlertDialog open={isBackDialogOpen} onOpenChange={setIsBackDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Discard changes?
            </AlertDialogTitle>
            <AlertDialogDescription>
              You haven't finalized this design yet. If you leave now, the scrapbook will remain in an unfinalized state. You can continue editing it later from the dashboard.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep Editing</AlertDialogCancel>
            <AlertDialogAction onClick={confirmBack} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Exit to Dashboard
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
