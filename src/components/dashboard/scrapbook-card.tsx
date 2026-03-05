import Link from "next/link";
import Image from "next/image";
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
import { MoreVertical, CheckCircle2 } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "../ui/dropdown-menu";

interface ScrapbookCardProps {
  scrapbook: any;
}

export default function ScrapbookCard({ scrapbook }: ScrapbookCardProps) {
  return (
    <Card className="flex flex-col overflow-hidden h-full transform transition-transform duration-300 hover:scale-105 hover:shadow-xl relative">
      {scrapbook.isFinalized && (
        <div className="absolute top-2 right-2 z-10">
          <Badge className="bg-green-500 text-white gap-1">
            <CheckCircle2 className="h-3 w-3" />
            Finalized
          </Badge>
        </div>
      )}
      <Link href={`/editor?id=${scrapbook.id}`} className="flex-grow">
        <CardHeader className="p-0">
          <div className="relative h-48 w-full bg-muted">
            {scrapbook.coverImage ? (
              <Image
                src={scrapbook.coverImage}
                alt={`Cover image for ${scrapbook.title}`}
                fill
                className="object-cover"
                data-ai-hint="scrapbook cover"
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
                No Cover Image
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-4 flex-grow">
          <Badge variant="secondary" className="mb-2">
            {scrapbook.category}
          </Badge>
          <CardTitle className="text-lg font-headline mb-1 leading-tight">{scrapbook.title}</CardTitle>
          <CardDescription className="text-sm">
            {scrapbook.isFinalized ? "Locked Design" : "Draft Canvas"}
          </CardDescription>
        </CardContent>
      </Link>
      <CardFooter className="p-4 flex justify-between items-center border-t mt-auto">
        <div className="flex -space-x-2">
          {Object.keys(scrapbook.members || {}).slice(0, 3).map((uid, index) => (
            <Avatar key={uid} className="h-8 w-8 border-2 border-background">
              <AvatarImage src={`https://picsum.photos/seed/${uid}/40/40`} />
              <AvatarFallback>U</AvatarFallback>
            </Avatar>
          ))}
          {Object.keys(scrapbook.members || {}).length > 3 && (
            <Avatar className="h-8 w-8 border-2 border-background">
              <AvatarFallback>
                +{Object.keys(scrapbook.members || {}).length - 3}
              </AvatarFallback>
            </Avatar>
          )}
        </div>
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                    <MoreVertical className="h-4 w-4" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
                <DropdownMenuItem asChild>
                  <Link href={`/editor?id=${scrapbook.id}`}>Open Editor</Link>
                </DropdownMenuItem>
                <DropdownMenuItem>Share</DropdownMenuItem>
                <DropdownMenuItem className="text-destructive">Delete</DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
      </CardFooter>
    </Card>
  );
}
