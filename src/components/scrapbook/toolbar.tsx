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
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { useFirestore, useUser, useStorage } from "@/firebase";
import { addDocumentNonBlocking, updateDocumentNonBlocking } from "@/firebase/non-blocking-updates";
import { collection, doc, serverTimestamp } from "firebase/firestore";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
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

interface ToolbarProps {
  scrapbook: any;
  pageId?: string;
}

export function Toolbar({ scrapbook, pageId }: ToolbarProps) {
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

  const collaboratorIds = scrapbook?.collaboratorIds || [];

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
    
    // Update state in Firestore
    updateDocumentNonBlocking(scrapbookRef, { 
      isFinalized: true,
      updatedAt: serverTimestamp()
    });
    
    // Feedback and navigation
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
    fileInputRef.current?.click();
  };

  const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user || !pageId) return;

    // Strict Mime Type Validation
    const allowedImages = ['image/png', 'image/jpeg'];
    const allowedVideos = ['video/mp4', 'video/quicktime'];
    const allowedAudio = ['audio/mpeg', 'audio/wav', 'audio/m4a'];

    if (currentMediaType === 'image' && !allowedImages.includes(file.type)) {
      toast({ variant: "destructive", title: "Invalid format", description: "Only PNG and JPEG images are allowed." });
      return;
    }
    if (currentMediaType === 'video' && !allowedVideos.includes(file.type)) {
      toast({ variant: "destructive", title: "Invalid format", description: "Only MP4 and MOV videos are allowed." });
      return;
    }
    if (currentMediaType === 'audio' && !allowedAudio.includes(file.type)) {
      toast({ variant: "destructive", title: "Invalid format", description: "Only MP3, WAV, and M4A audio are allowed." });
      return;
    }

    setUploadProgress(0);
    
    try {
      const storageRef = ref(storage, `scrapbooks/${scrapbook.id}/pages/${pageId}/${Date.now()}_${file.name}`);
      const uploadTask = uploadBytesResumable(storageRef, file);

      uploadTask.on('state_changed', 
        (snapshot) => {
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          setUploadProgress(progress);
        }, 
        (error) => {
          console.error("Upload error", error);
          setUploadProgress(null);
          toast({ variant: "destructive", title: "Upload Failed", description: "Could not upload media." });
        }, 
        async () => {
          const downloadUrl = await getDownloadURL(uploadTask.snapshot.ref);
          const objectsCol = collection(db, "scrapbooks", scrapbook.id, "pages", pageId, "canvasObjects");
          
          addDocumentNonBlocking(objectsCol, {
            pageId,
            type: currentMediaType,
            mediaUri: downloadUrl,
            members: scrapbook.members,
            x: 100,
            y: 100,
            width: currentMediaType === 'audio' ? 300 : 250,
            height: currentMediaType === 'audio' ? 80 : 250,
            rotation: 0,
            scaleX: 1,
            scaleY: 1,
            zIndex: 1,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });

          setUploadProgress(null);
          toast({ title: "Success", description: `${currentMediaType} added to your canvas.` });
        }
      );
    } catch (err) {
      setUploadProgress(null);
      toast({ variant: "destructive", title: "Process Failed", description: "Something went wrong." });
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
      width: 250,
      height: 80,
      rotation: 0,
      scaleX: 1,
      scaleY: 1,
      zIndex: 10,
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
            <span>Uploading {currentMediaType}...</span>
            <span>{Math.round(uploadProgress)}%</span>
          </div>
          <Progress value={uploadProgress} className="h-2" />
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={handleBackNavigation}
            className="rounded-full h-10 w-10 hover:bg-muted/50 transition-colors"
            aria-label="Go Back"
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
            accept={currentMediaType === 'image' ? 'image/png,image/jpeg' : currentMediaType === 'video' ? 'video/mp4,video/quicktime' : 'audio/*'}
            onChange={onFileChange}
          />
          
          <Button variant="outline" size="sm" onClick={() => handleMediaClick('image')} disabled={scrapbook?.isFinalized}>
            <ImagePlus className="mr-2 h-4 w-4" />
            Image
          </Button>
          <Button variant="outline" size="sm" onClick={() => setIsTextDialogOpen(true)} disabled={scrapbook?.isFinalized}>
            <Type className="mr-2 h-4 w-4" />
            Text
          </Button>
          <Button variant="outline" size="sm" onClick={() => handleMediaClick('video')} disabled={scrapbook?.isFinalized}>
            <Video className="mr-2 h-4 w-4" />
            Video
          </Button>
          <Button variant="outline" size="sm" onClick={() => handleMediaClick('audio')} disabled={scrapbook?.isFinalized}>
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
