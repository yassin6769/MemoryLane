import Link from "next/link";
import Image from "next/image";
import type { Scrapbook } from "@/lib/data";
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
import { MoreVertical } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "../ui/dropdown-menu";

interface ScrapbookCardProps {
  scrapbook: Scrapbook;
}

export default function ScrapbookCard({ scrapbook }: ScrapbookCardProps) {
  return (
    <Card className="flex flex-col overflow-hidden h-full transform transition-transform duration-300 hover:scale-105 hover:shadow-xl">
      <Link href={`/editor?id=${scrapbook.id}`} className="flex-grow">
        <CardHeader className="p-0">
          <div className="relative h-48 w-full">
            <Image
              src={scrapbook.coverImage}
              alt={`Cover image for ${scrapbook.title}`}
              fill
              className="object-cover"
              data-ai-hint="scrapbook cover"
            />
          </div>
        </CardHeader>
        <CardContent className="p-4 flex-grow">
          <Badge variant="secondary" className="mb-2">
            {scrapbook.category}
          </Badge>
          <CardTitle className="text-lg font-headline mb-1 leading-tight">{scrapbook.title}</CardTitle>
          <CardDescription className="text-sm">
            {scrapbook.pages.length} pages
          </CardDescription>
        </CardContent>
      </Link>
      <CardFooter className="p-4 flex justify-between items-center">
        <div className="flex -space-x-2">
          {scrapbook.collaboratorIds.slice(0, 2).map((id, index) => (
            <Avatar key={id} className="h-8 w-8 border-2 border-background">
              <AvatarImage src={`https://picsum.photos/seed/30${index + 2}/40/40`} />
              <AvatarFallback>U{index + 2}</AvatarFallback>
            </Avatar>
          ))}
          {scrapbook.collaboratorIds.length > 2 && (
            <Avatar className="h-8 w-8 border-2 border-background">
              <AvatarFallback>
                +{scrapbook.collaboratorIds.length - 2}
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
                <DropdownMenuItem>Edit</DropdownMenuItem>
                <DropdownMenuItem>Share</DropdownMenuItem>
                <DropdownMenuItem className="text-destructive">Delete</DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
      </CardFooter>
    </Card>
  );
}
