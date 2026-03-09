
"use client";

import { useRef, useCallback } from "react";
import { doc, getFirestore, serverTimestamp, updateDoc } from "firebase/firestore";
import { setGlobalSaveStatus } from "@/components/scrapbook/save-indicator";
import { errorEmitter } from "@/firebase/error-emitter";
import { FirestorePermissionError } from "@/firebase/errors";
import { useToast } from "./use-toast";

/**
 * Hook to handle debounced auto-saving to Firestore.
 */
export function useAutoSave() {
  const { toast } = useToast();
  const db = getFirestore();
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const debouncedUpdate = useCallback((scrapbookId: string, pageId: string, objectId: string, updates: any) => {
    // 1. Immediately show "Saving..."
    setGlobalSaveStatus('saving');

    // 2. Clear previous timer
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // 3. Set a new timer
    timeoutRef.current = setTimeout(() => {
      const docRef = doc(db, "scrapbooks", scrapbookId, "pages", pageId, "canvasObjects", objectId);
      
      updateDoc(docRef, {
        ...updates,
        updatedAt: serverTimestamp()
      })
      .then(() => {
        setGlobalSaveStatus('saved');
        // Hide "Saved" after 3 seconds
        setTimeout(() => setGlobalSaveStatus('idle'), 3000);
      })
      .catch((error) => {
        setGlobalSaveStatus('error');
        const contextualError = new FirestorePermissionError({
          path: docRef.path,
          operation: 'update',
          requestResourceData: updates,
        });
        errorEmitter.emit('permission-error', contextualError);
        
        toast({
          variant: "destructive",
          title: "Auto-save failed",
          description: "Could not save your changes. Please check your connection.",
        });
      });
    }, 800); // 800ms debounce
  }, [db, toast]);

  return { debouncedUpdate };
}
