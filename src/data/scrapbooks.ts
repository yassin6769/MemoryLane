
'use client';

import {
  type Firestore,
  collection,
  serverTimestamp,
  addDoc,
  doc,
  deleteDoc,
  setDoc,
} from 'firebase/firestore';
import type { User } from 'firebase/auth';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

/**
 * Creates a new scrapbook and ensures the owner is correctly set in the members map
 * to satisfy Firestore Security Rules.
 */
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
    pageCount: 0,
    members: {
      [user.uid]: 'owner', // Required by Security Rules
    },
    isFinalized: false,
    isPublic: false,
    coverImage: "",
  };

  try {
    const docRef = await addDoc(scrapbooksCol, newScrapbookData);
    // Explicitly set the ID field inside the document for convenience
    await setDoc(docRef, { id: docRef.id }, { merge: true });
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
 * Deletes a scrapbook. Only allowed if the user is the owner.
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
