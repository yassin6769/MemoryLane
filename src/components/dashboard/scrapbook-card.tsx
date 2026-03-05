"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "../ui/button";
import { MoreVertical, CheckCircle2, Trash2, Share2, ExternalLink, AlertTriangle } from "lucide-react";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from "../ui/dropdown-menu";
import { 
  AlertDialog, 
  AlertDialogAction, 
  AlertDialogCancel, 
  AlertDialogContent, 
  AlertDialogDescription, 
  AlertDialogFooter, 
  AlertDialogHeader, 
  AlertDialogTitle 
} from "@/components/ui/alert-dialog";
import { CollaboratorDialog } from "../scrapbook/collaborator-dialog";
import { useFirestore } from "@/firebase";
import { deleteScrapbook } from "@/data/scrapbooks";
import { useToast } from "@/hooks/use-toast";

interface ScrapbookCardProps {
  scrapbook: any;
}

export default function ScrapbookCard({ scrapbook }: ScrapbookCardProps) {
  const db = useFirestore();
  const { toast } = useToast();
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await deleteScrapbook(db, scrapbook.id);
      toast({
        title: "Scrapbook Deleted",
        description: "Your memory collection has been removed permanently.",
      });
    } catch (error) {
      console.error("Delete failed", error);
      toast({
        variant: "destructive",
        title: "Delete Failed",
        description: "You might not have permission to delete this scrapbook.",
      });
    } finally {
      setIsDeleting(false);
      setIsDeleteDialogOpen(false);
    }
  };

  return (
    <>
      <Card className="group flex flex-col overflow-hidden h-full transform transition-all duration-300 hover:shadow-xl relative border-muted/60 bg-card/50 backdrop-blur-sm">
        {scrapbook.isFinalized && (
          <div className="absolute top-3 right-3 z-10">
            <Badge className="bg-green-500/90 text-white gap-1 backdrop-blur-md border-none shadow-sm">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Finalized
            </Badge>
          </div>
        )}
        
        <Link href={`/editor?id=${scrapbook.id}`} className="flex-grow">
          <CardHeader className="p-0">
            <div className="relative h-48 w-full bg-muted/30 overflow-hidden">
              {scrapbook.coverImage ? (
                <Image
                  src={scrapbook.coverImage}
                  alt={`Cover image for ${scrapbook.title}`}
                  fill
                  className="object-cover transition-transform duration-500 group-hover:scale-110"
                  data-ai-hint="scrapbook cover"
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center text-muted-foreground/50">
                  No Cover Image
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          </CardHeader>
          <CardContent className="p-5 flex-grow">
            <div className="flex items-center gap-2 mb-3">
              <Badge variant="secondary" className="font-medium px-2.5 py-0.5 bg-primary/10 text-primary border-none">
                {scrapbook.category}
              </Badge>
              {scrapbook.isPublic && (
                <Badge variant="outline" className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  Public
                </Badge>
              )}
            </div>
            <CardTitle className="text-xl font-headline mb-2 leading-tight text-foreground/90">{scrapbook.title}</CardTitle>
            <CardDescription className="text-sm line-clamp-2">
              {scrapbook.isFinalized ? "Locked and preserved memories." : "A creative work in progress."}
            </CardDescription>
          </CardContent>
        </Link>

        <CardFooter className="p-4 flex justify-between items-center border-t border-muted/40 mt-auto bg-muted/5">
          <div className="flex -space-x-2.5">
            {Object.keys(scrapbook.members || {}).slice(0, 3).map((uid, index) => (
              <Avatar key={uid} className="h-8 w-8 border-2 border-background ring-1 ring-muted/20">
                <AvatarImage src={`https://picsum.photos/seed/${uid}/40/40`} />
                <AvatarFallback className="bg-primary/5 text-primary text-[10px]">U</AvatarFallback>
              </Avatar>
            ))}
            {Object.keys(scrapbook.members || {}).length > 3 && (
              <div className="h-8 w-8 rounded-full bg-muted border-2 border-background flex items-center justify-center text-[10px] font-bold text-muted-foreground">
                +{Object.keys(scrapbook.members || {}).length - 3}
              </div>
            )}
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full hover:bg-muted/50">
                <MoreVertical className="h-4.5 w-4.5 text-muted-foreground" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 p-1">
              <DropdownMenuItem asChild>
                <Link href={`/editor?id=${scrapbook.id}`} className="flex items-center gap-2">
                  <ExternalLink className="h-4 w-4" />
                  Open Editor
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setIsShareOpen(true)} className="flex items-center gap-2">
                <Share2 className="h-4 w-4" />
                Share & Privacy
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={() => setIsDeleteDialogOpen(true)}
                className="text-destructive focus:text-destructive flex items-center gap-2"
              >
                <Trash2 className="h-4 w-4" />
                Delete Scrapbook
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </CardFooter>
      </Card>

      {/* Sharing Dialog */}
      <CollaboratorDialog 
        scrapbook={scrapbook} 
        open={isShareOpen} 
        onOpenChange={setIsShareOpen} 
      />

      {/* Delete Confirmation */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Delete this Scrapbook?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>"{scrapbook.title}"</strong>? This will permanently remove all pages and media. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={(e) => {
                e.preventDefault();
                handleDelete();
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={isDeleting}
            >
              {isDeleting ? "Deleting..." : "Delete Permanently"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
