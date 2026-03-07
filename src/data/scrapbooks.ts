
'use client';

import {
  type Firestore,
  collection,
  serverTimestamp,
  addDoc,
  doc,
  deleteDoc,
} from 'firebase/firestore';
import type { User } from 'firebase/auth';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

export async function createScrapbook(
  firestore: Firestore,
  user: User,
  title: string,
  category: string
): Promise<string> {
  if (!user) {
    throw new Error('User must be logged in to create a scrapbook.');
  }

  const scrapbooksCol = collection(firestore, 'scrapbooks');

  const newScrapbookData = {
    title,
    category,
    ownerId: user.uid,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    pageIds: [],
    collaboratorPermissionIds: [],
    collaboratorIds: [],
    pageCount: 0, // Initialize page count
    members: {
      [user.uid]: 'owner',
    },
    isFinalized: false,
    isPublic: false,
    coverImage: `https://picsum.photos/seed/${Math.random().toString(36).substring(7)}/400/300`,
  };

  try {
    const docRef = await addDoc(scrapbooksCol, newScrapbookData);
    return docRef.id;
  } catch (error) {
    const permissionError = new FirestorePermissionError({
        path: scrapbooksCol.path,
        operation: 'create',
        requestResourceData: newScrapbookData,
      });

    errorEmitter.emit('permission-error', permissionError);
    throw error;
  }
}

/**
 * Deletes a scrapbook and attempts to clean up its main document.
 * In a client-side prototype, we primarily delete the top-level document.
 */
export async function deleteScrapbook(firestore: Firestore, scrapbookId: string): Promise<void> {
  const docRef = doc(firestore, 'scrapbooks', scrapbookId);
  
  try {
    await deleteDoc(docRef);
  } catch (error) {
    const permissionError = new FirestorePermissionError({
      path: docRef.path,
      operation: 'delete',
    });
    errorEmitter.emit('permission-error', permissionError);
    throw error;
  }
}
