/**
 * Firebase Authentication Utilities
 * 
 * This module handles Google Sign-In and authentication with our backend.
 */

import { GoogleAuthProvider, signInWithPopup, signInWithRedirect, getRedirectResult } from "firebase/auth";
import { auth } from "./firebase";
import { authenticateWithGoogle } from "./queryClient";

// Create a Google provider instance
const googleProvider = new GoogleAuthProvider();

/**
 * Sign in with Google using a popup
 * This is the recommended approach for web
 */
export async function signInWithGoogle() {
  try {
    // Sign in with Google popup
    const result = await signInWithPopup(auth, googleProvider);
    
    // Get Google account information
    const user = result.user;
    
    // Get the ID token
    const idToken = await user.getIdToken();
    
    // Authenticate with our backend
    return await authenticateWithGoogle(user.email || '', idToken);
  } catch (error) {
    console.error("Error during Google sign-in:", error);
    throw error;
  }
}

/**
 * Sign in with Google using redirect (alternative for mobile)
 * Better UX on mobile devices
 */
export function signInWithGoogleRedirect() {
  return signInWithRedirect(auth, googleProvider);
}

/**
 * Handle the redirect result after a Google sign-in redirect
 */
export async function handleRedirectResult() {
  try {
    const result = await getRedirectResult(auth);
    
    if (result) {
      // User successfully signed in with Google
      const user = result.user;
      
      // Get the ID token
      const idToken = await user.getIdToken();
      
      // Authenticate with our backend
      const authResult = await authenticateWithGoogle(user.email || '', idToken);
      
      // If authentication was successful, store tokens in localStorage
      if (authResult && authResult.accessToken) {
        localStorage.setItem('accessToken', authResult.accessToken);
        
        if (authResult.refreshToken) {
          localStorage.setItem('refreshToken', authResult.refreshToken);
        }
      }
      
      return {
        success: true,
        user: authResult.user,
        isNewUser: authResult.isNewUser,
        credential: {
          accessToken: idToken
        }
      };
    }
    
    return { success: false }; // No redirect result
  } catch (error) {
    console.error("Error handling Google redirect:", error);
    throw error;
  }
}

/**
 * Get the current ID token for the authenticated user
 */
export async function getIdToken() {
  const currentUser = auth.currentUser;
  if (!currentUser) {
    return null;
  }
  
  return await currentUser.getIdToken();
}

/**
 * Sign out from Firebase
 */
export async function signOutFromFirebase() {
  return auth.signOut();
}