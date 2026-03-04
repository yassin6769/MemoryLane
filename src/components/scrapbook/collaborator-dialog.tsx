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
import { Share2, Copy, UserPlus, Globe, Lock } from "lucide-react";
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

  const isPublic = scrapbook?.isPublic || false;
  const scrapbookId = scrapbook?.id;

  const togglePrivacy = (checked: boolean) => {
    const scrapbookRef = doc(db, "scrapbooks", scrapbookId);
    updateDocumentNonBlocking(scrapbookRef, { isPublic: checked });
    toast({
      title: checked ? "Scrapbook is now Public" : "Scrapbook is now Private",
      description: checked ? "Anyone with the link can view." : "Only collaborators can access.",
    });
  };

  const copyLink = () => {
    if (!isPublic) {
      toast({
        variant: "destructive",
        title: "Access Denied",
        description: "Set scrapbook to Public to share via link.",
      });
      return;
    }
    const url = `${window.location.origin}/editor?id=${scrapbookId}`;
    navigator.clipboard.writeText(url);
    toast({
      title: "Link Copied",
      description: "Deep link copied to clipboard.",
    });
  };

  const inviteUser = () => {
    if (!inviteUid.trim()) return;
    
    const scrapbookRef = doc(db, "scrapbooks", scrapbookId);
    const updatedMembers = {
      ...(scrapbook.members || {}),
      [inviteUid]: "editor",
    };

    updateDocumentNonBlocking(scrapbookRef, { members: updatedMembers });
    
    toast({
      title: "User Invited",
      description: `User ${inviteUid} added as an editor.`,
    });
    setInviteUid("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="h-5 w-5" />
            Manage Collaborators
          </DialogTitle>
          <DialogDescription>
            Control who can view and edit your canvas.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div className="space-y-0.5">
              <Label className="text-base flex items-center gap-2">
                {isPublic ? <Globe className="h-4 w-4 text-primary" /> : <Lock className="h-4 w-4" />}
                Privacy Status
              </Label>
              <p className="text-sm text-muted-foreground">
                {isPublic ? "Visible to anyone with the link." : "Only you and editors can see this."}
              </p>
            </div>
            <Switch checked={isPublic} onCheckedChange={togglePrivacy} />
          </div>

          <div className="space-y-2">
            <Label>Share Link</Label>
            <div className="flex gap-2">
              <Input
                readOnly
                value={isPublic ? `${window.location.origin}/editor?id=${scrapbookId}` : "Set to public to generate link"}
                className="bg-muted"
              />
              <Button size="icon" variant="outline" onClick={copyLink}>
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Invite Editor (UID)</Label>
            <div className="flex gap-2">
              <Input
                placeholder="Enter User ID"
                value={inviteUid}
                onChange={(e) => setInviteUid(e.target.value)}
              />
              <Button onClick={inviteUser}>
                <UserPlus className="h-4 w-4 mr-2" />
                Invite
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
