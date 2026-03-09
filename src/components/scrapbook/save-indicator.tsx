
"use client";

import { useState, useEffect } from "react";
import { Cloud, CloudCheck, CloudOff, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * A global-ish state for the save status.
 * In a larger app, this might be a Context or Redux state.
 */
let pendingCount = 0;
let lastStatus: 'idle' | 'saving' | 'saved' | 'error' = 'idle';
const listeners: Array<(status: typeof lastStatus) => void> = [];

export const setGlobalSaveStatus = (status: typeof lastStatus) => {
  lastStatus = status;
  listeners.forEach(l => l(status));
};

export function SaveIndicator() {
  const [status, setStatus] = useState<typeof lastStatus>(lastStatus);

  useEffect(() => {
    listeners.push(setStatus);
    return () => {
      const index = listeners.indexOf(setStatus);
      if (index > -1) listeners.splice(index, 1);
    };
  }, []);

  if (status === 'idle') return null;

  return (
    <div className={cn(
      "flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-300 backdrop-blur-md border shadow-sm",
      status === 'saving' && "bg-primary/10 text-primary border-primary/20",
      status === 'saved' && "bg-green-500/10 text-green-600 border-green-500/20",
      status === 'error' && "bg-destructive/10 text-destructive border-destructive/20"
    )}>
      {status === 'saving' && (
        <>
          <Loader2 className="h-3 w-3 animate-spin" />
          <span>Saving...</span>
        </>
      )}
      {status === 'saved' && (
        <>
          <CloudCheck className="h-3 w-3" />
          <span>All changes saved</span>
        </>
      )}
      {status === 'error' && (
        <>
          <CloudOff className="h-3 w-3" />
          <span>Save failed</span>
        </>
      )}
    </div>
  );
}
