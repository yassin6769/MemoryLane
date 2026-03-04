'use client';
import { doc, serverTimestamp, type Firestore } from "firebase/firestore";
import { type User } from "firebase/auth";
import { setDocumentNonBlocking } from "@/firebase/non-blocking-updates";

export function createUserProfile(firestore: Firestore, user: User, displayName: string) {
    const userProfileRef = doc(firestore, "users", user.uid);

    const newUserProfile: any = {
        id: user.uid,
        email: user.email,
        displayName: displayName,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        ownedScrapbookIds: [],
        settings: [],
    };

    if (user.photoURL) {
        newUserProfile.profilePictureUri = user.photoURL;
    }
    
    setDocumentNonBlocking(userProfileRef, newUserProfile, { merge: true });
}
