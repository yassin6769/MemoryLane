import {
  FileDown,
  ImagePlus,
  Mic,
  Share2,
  Type,
  Video,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { Button } from "../ui/button";
import type { Scrapbook } from "@/lib/data";
import { Badge } from "../ui/badge";

interface ToolbarProps {
  scrapbook: Scrapbook;
}

export function Toolbar({ scrapbook }: ToolbarProps) {
  // Ensure we have an array to map over even if the field is missing in Firestore
  const collaboratorIds = scrapbook.collaboratorIds || [];

  return (
    <div className="flex flex-wrap items-center justify-between gap-4">
      <div className="flex items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold font-headline">{scrapbook.title}</h1>
          <div className="flex items-center gap-2">
            <Badge variant="outline">{scrapbook.category}</Badge>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm">
          <ImagePlus className="mr-2 h-4 w-4" />
          Image
        </Button>
        <Button variant="outline" size="sm">
          <Type className="mr-2 h-4 w-4" />
          Text
        </Button>
        <Button variant="outline" size="sm">
          <Video className="mr-2 h-4 w-4" />
          Video
        </Button>
        <Button variant="outline" size="sm">
          <Mic className="mr-2 h-4 w-4" />
          Audio
        </Button>
        <div className="h-6 border-l mx-2" />
        <div className="flex -space-x-2 mr-2">
          {collaboratorIds.map((id, index) => (
            <Avatar key={id} className="h-8 w-8 border-2 border-background">
              <AvatarImage src={`https://picsum.photos/seed/30${index + 2}/40/40`} />
              <AvatarFallback>U{index + 2}</AvatarFallback>
            </Avatar>
          ))}
        </div>
        <Button variant="outline" size="sm">
          <Share2 className="mr-2 h-4 w-4" />
          Share
        </Button>
        <Button size="sm">
          <FileDown className="mr-2 h-4 w-4" />
          Export
        </Button>
      </div>
    </div>
  );
}
