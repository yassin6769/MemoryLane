
"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Share2, Copy, UserPlus, Globe, Lock, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { updateDocumentNonBlocking } from "@/firebase/non-blocking-updates";
import { doc, getFirestore } from "firebase/firestore";

interface CollaboratorDialogProps {
  scrapbook: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CollaboratorDialog({ scrapbook, open, onOpenChange }: CollaboratorDialogProps) {
  const { toast } = useToast();
  const db = getFirestore();
  const [inviteUid, setInviteUid] = useState("");
  const [hasCopied, setHasCopied] = useState(false);

  const isPublic = scrapbook?.isPublic || false;
  const scrapbookId = scrapbook?.id;

  const togglePrivacy = (checked: boolean) => {
    const scrapbookRef = doc(db, "scrapbooks", scrapbookId);
    updateDocumentNonBlocking(scrapbookRef, { isPublic: checked });
    toast({
      title: checked ? "Public Access Enabled" : "Access Restricted",
      description: checked ? "Anyone with the link can now view." : "Only collaborators can access.",
    });
  };

  const copyLink = () => {
    if (!isPublic) {
      toast({
        variant: "destructive",
        title: "Link sharing disabled",
        description: "Set scrapbook to 'Public' to generate a shareable link.",
      });
      return;
    }

    const url = `${window.location.origin}/editor?id=${scrapbookId}`;
    navigator.clipboard.writeText(url);
    
    setHasCopied(true);
    setTimeout(() => setHasCopied(false), 2000);
    
    toast({
      title: "Link Copied",
      description: "You can now share this URL with others.",
    });
  };

  const inviteUser = () => {
    if (!inviteUid.trim()) return;
    
    const scrapbookRef = doc(db, "scrapbooks", scrapbookId);
    
    // Update both members map (for rules) and sharedWith array (for specific queries)
    const updatedMembers = {
      ...(scrapbook.members || {}),
      [inviteUid]: "editor",
    };

    const currentSharedWith = scrapbook.sharedWith || [];
    const updatedSharedWith = currentSharedWith.includes(inviteUid) 
      ? currentSharedWith 
      : [...currentSharedWith, inviteUid];

    updateDocumentNonBlocking(scrapbookRef, { 
      members: updatedMembers,
      sharedWith: updatedSharedWith
    });
    
    toast({
      title: "Invitation Sent",
      description: `User ${inviteUid} has been granted editor access.`,
    });
    setInviteUid("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-headline text-2xl">
            <Share2 className="h-5 w-5 text-primary" />
            Share & Collaborators
          </DialogTitle>
          <DialogDescription>
            Manage who can view or help you create this memory.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="flex items-center justify-between rounded-xl border bg-muted/20 p-4 transition-colors hover:bg-muted/30">
            <div className="space-y-0.5">
              <Label className="text-base flex items-center gap-2">
                {isPublic ? <Globe className="h-4 w-4 text-primary" /> : <Lock className="h-4 w-4" />}
                Visibility
              </Label>
              <p className="text-sm text-muted-foreground">
                {isPublic ? "Public - Anyone with the link" : "Private - Invited only"}
              </p>
            </div>
            <Switch checked={isPublic} onCheckedChange={togglePrivacy} />
          </div>

          <div className="space-y-2.5">
            <Label className="text-sm font-medium">Shareable Link</Label>
            <div className="flex gap-2">
              <div className="relative flex-grow">
                <Input
                  readOnly
                  value={isPublic ? `${window.location.origin}/editor?id=${scrapbookId}` : "Set to public to generate link"}
                  className={`bg-muted/50 pr-10 text-xs ${!isPublic && "italic text-muted-foreground"}`}
                />
                {isPublic && (
                   <Globe className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-primary/40" />
                )}
              </div>
              <Button 
                size="icon" 
                variant={isPublic ? "default" : "outline"} 
                onClick={copyLink}
                className="shrink-0"
              >
                {hasCopied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">Invite Collaborators</Label>
              <Badge variant="outline" className="text-[10px] font-normal uppercase">Editors</Badge>
            </div>
            <div className="flex gap-2">
              <Input
                placeholder="Enter User ID (UID)"
                value={inviteUid}
                onChange={(e) => setInviteUid(e.target.value)}
                className="bg-muted/30"
              />
              <Button onClick={inviteUser} disabled={!inviteUid.trim()}>
                <UserPlus className="h-4 w-4 mr-2" />
                Add
              </Button>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Invited users can add, move, and edit all objects on the canvas.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
