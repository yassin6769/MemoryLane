
'use client';
import { doc, serverTimestamp, type Firestore } from "firebase/firestore";
import { type User } from "firebase/auth";
import { setDocumentNonBlocking } from "@/firebase/non-blocking-updates";

/**
 * Creates or updates a user profile. 
 * Security Rules ensure a user can only write to a document where {userId} == request.auth.uid.
 */
export function createUserProfile(firestore: Firestore, user: User, displayName: string) {
    if (!user) return;

    const userProfileRef = doc(firestore, "users", user.uid);

    const newUserProfile: any = {
        id: user.uid,
        email: user.email,
        displayName: displayName,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
    };

    if (user.photoURL) {
        newUserProfile.profileImageUrl = user.photoURL;
    }
    
    // We use merge: true so we don't overwrite existing custom data (like username/age) 
    // during a simple login refresh.
    setDocumentNonBlocking(userProfileRef, newUserProfile, { merge: true });
}
