import { 
  collection, 
  doc, 
  setDoc, 
  updateDoc, 
  getDoc,
  serverTimestamp 
} from "firebase/firestore";
import { db } from "./config";

/**
 * Create or update user document in Firestore
 * @param {string} userId - User's UID from Firebase Auth
 * @param {Object} userData - User data to store (name, email, etc.)
 */
export const createOrUpdateUser = async (userId, userData) => {
  try {
    const userRef = doc(db, "user", userId);
    const userDoc = await getDoc(userRef);
    
    const dataToSave = {
      ...userData,
      updatedAt: serverTimestamp(),
    };

    if (userDoc.exists()) {
      // Update existing user
      await updateDoc(userRef, dataToSave);
      console.log("User updated in Firestore");
    } else {
      // Create new user
      await setDoc(userRef, {
        ...dataToSave,
        createdAt: serverTimestamp(),
        Questions: [], // Initialize empty Questions array
      });
      console.log("User created in Firestore");
    }
    
    return { success: true };
  } catch (error) {
    console.error("Error saving user to Firestore:", error);
    throw error;
  }
};

/**
 * Save answers to user's Questions array in Firestore
 * @param {string} userId - User's UID from Firebase Auth
 * @param {Array<string>} answers - Array of answer strings
 */
export const saveUserAnswers = async (userId, answers) => {
  try {
    const userRef = doc(db, "user", userId);
    
    // Filter out empty answers and create the Questions array
    // Handle different types: strings, arrays (join them), null/undefined
    const questionsArray = answers
      .map(answer => {
        // Convert arrays to strings (e.g., skills array)
        if (Array.isArray(answer)) {
          return answer.join(', ');
        }
        // Convert to string if not already
        if (answer == null) {
          return '';
        }
        return String(answer);
      })
      .filter(answer => answer.trim() !== "");
    
    await updateDoc(userRef, {
      Questions: questionsArray,
      updatedAt: serverTimestamp(),
    });
    
    console.log("Answers saved to Firestore");
    return { success: true };
  } catch (error) {
    console.error("Error saving answers to Firestore:", error);
    throw error;
  }
};

/**
 * Get user document from Firestore
 * @param {string} userId - User's UID from Firebase Auth
 */
export const getUserData = async (userId) => {
  try {
    const userRef = doc(db, "user", userId);
    const userDoc = await getDoc(userRef);
    
    if (userDoc.exists()) {
      return { id: userDoc.id, ...userDoc.data() };
    } else {
      return null;
    }
  } catch (error) {
    console.error("Error getting user from Firestore:", error);
    throw error;
  }
};
