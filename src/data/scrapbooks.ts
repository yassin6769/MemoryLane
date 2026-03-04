'use client';

import {
  type Firestore,
  collection,
  serverTimestamp,
  addDoc,
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
    collaboratorIds: [], // Explicitly initialize the array to prevent UI crashes
    members: {
      [user.uid]: 'owner',
    },
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
    // Rethrow to be caught by the calling component's UI
    throw error;
  }
}
