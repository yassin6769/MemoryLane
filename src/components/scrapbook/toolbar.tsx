
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
      const mediaRecorder = new MediaRecorder(stream);
      const chunks: Blob[] = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };

      mediaRecorder.onstop = async () => {
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
    if (!storage || !storage.app.options.storageBucket) {
        toast({ 
            variant: "destructive", 
            title: "Configuration Error", 
            description: "Firebase Storage is not properly initialized." 
        });
        return;
    }

    if (!user) {
      toast({ variant: "destructive", title: "Upload Failed", description: "You must be logged in to upload media." });
      return;
    }

    if (!pageId) {
      toast({ variant: "destructive", title: "Upload Failed", description: "No active page selected." });
      return;
    }

    // Client-side size validation (5MB limit)
    const MAX_SIZE = 5 * 1024 * 1024;
    if (blob.size > MAX_SIZE) {
      toast({
        variant: "destructive",
        title: "File Too Large",
        description: "Please select a file smaller than 5MB.",
      });
      return;
    }
    
    setUploadProgress(0);
    setCurrentMediaType(type);

    try {
      // Path structure: /scrapbooks/{scrapbookId}/{userId}/{fileName}
      const storagePath = `scrapbooks/${scrapbook.id}/${user.uid}/${Date.now()}_${fileName}`;
      const storageRef = ref(storage, storagePath);
      const uploadTask = uploadBytesResumable(storageRef, blob);

      uploadTask.on('state_changed', 
        (snapshot) => {
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          setUploadProgress(progress);
        }, 
        (error: StorageError) => {
          setUploadProgress(null);
          
          let errorMessage = "An unexpected error occurred.";
          
          // Enhanced error handling switch
          switch (error.code) {
            case 'storage/unauthorized':
              errorMessage = "Permission denied. Please check security rules.";
              break;
            case 'storage/canceled':
              errorMessage = "Upload was canceled.";
              break;
            case 'storage/quota-exceeded':
              errorMessage = "Storage quota exceeded. Please try again later.";
              break;
            case 'storage/invalid-checksum':
              errorMessage = "File integrity check failed. Please retry.";
              break;
            case 'storage/retry-limit-exceeded':
              errorMessage = "Max retry limit reached. Check your connection.";
              break;
            default:
              errorMessage = error.message || "Storage error.";
              break;
          }

          toast({ 
            variant: "destructive", 
            title: "Upload Failed", 
            description: errorMessage 
          });
          console.error(`[Firebase Storage Error] ${error.code}:`, error);
        }, 
        async () => {
          const downloadUrl = await getDownloadURL(uploadTask.snapshot.ref);
          const objectsCol = collection(db, "scrapbooks", scrapbook.id, "pages", pageId, "canvasObjects");
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
            borderWidth: 0,
            borderColor: "#000000",
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

          setUploadProgress(null);
          toast({ title: "Success", description: `${type} added to your canvas.` });
        }
      );
    } catch (err: any) {
      setUploadProgress(null);
      toast({ variant: "destructive", title: "Process Failed", description: err.message });
    }
  };

  const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !currentMediaType) return;
    await uploadMediaBlob(file, file.name, currentMediaType);
    e.target.value = '';
  };

  const saveText = () => {
    if (!textInput.trim()) return;
    if (!pageId) return;

    const objectsCol = collection(db, "scrapbooks", scrapbook.id, "pages", pageId, "canvasObjects");
    const nextZIndex = items.length > 0 ? Math.max(...items.map((i: any) => i.zIndex || 0)) + 1 : 1;

    addDocumentNonBlocking(objectsCol, {
      pageId,
      type: "text",
      text: textInput,
      isBold: false,
      isUnderline: false,
      fontSize: 24,
      fontFamily: "font-serif",
      borderWidth: 0,
      borderColor: "#000000",
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
