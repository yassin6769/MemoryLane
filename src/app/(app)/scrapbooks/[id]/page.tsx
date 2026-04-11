'use client';

import { useRouter } from "next/navigation";
import { useEffect, use } from "react";

export const dynamic = 'force-dynamic';

/**
 * Dynamic route for scrapbooks.
 * Redirects to the editor page with the appropriate ID.
 */
export default function ScrapbookByIdPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();

  useEffect(() => {
    if (id) {
      router.replace(`/editor?id=${id}`);
    }
  }, [id, router]);

  return (
    <div className="flex h-screen w-full items-center justify-center bg-muted/20">
      <div className="flex flex-col items-center gap-4">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        <p className="text-sm font-medium text-muted-foreground italic">Opening your canvas...</p>
      </div>
    </div>
  );
}
