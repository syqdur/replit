import { 
  ref, 
  uploadBytes, 
  listAll, 
  getDownloadURL, 
  deleteObject 
} from 'firebase/storage';
import { 
  collection, 
  addDoc, 
  query, 
  orderBy, 
  onSnapshot, 
  deleteDoc, 
  doc, 
  where,
  getDocs,
  updateDoc
} from 'firebase/firestore';
import { storage, db } from '../config/firebase';
import { MediaItem, Comment, Like, ProfileData } from '../types';

export const uploadFiles = async (
  files: FileList, 
  userName: string, 
  deviceId: string,
  onProgress: (progress: number) => void
): Promise<void> => {
  let uploaded = 0;
  
  for (const file of Array.from(files)) {
    const fileName = `${Date.now()}-${file.name}`;
    const storageRef = ref(storage, `uploads/${fileName}`);
    
    await uploadBytes(storageRef, file);
    
    // Add metadata to Firestore
    const isVideo = file.type.startsWith('video/');
    await addDoc(collection(db, 'media'), {
      name: fileName,
      uploadedBy: userName,
      deviceId: deviceId,
      uploadedAt: new Date().toISOString(),
      type: isVideo ? 'video' : 'image'
    });
    
    uploaded++;
    onProgress((uploaded / files.length) * 100);
  }
};

export const uploadVideoBlob = async (
  videoBlob: Blob,
  userName: string,
  deviceId: string,
  onProgress: (progress: number) => void
): Promise<void> => {
  const fileName = `${Date.now()}-recorded-video.webm`;
  const storageRef = ref(storage, `uploads/${fileName}`);
  
  onProgress(50);
  
  await uploadBytes(storageRef, videoBlob);
  
  // Add metadata to Firestore
  await addDoc(collection(db, 'media'), {
    name: fileName,
    uploadedBy: userName,
    deviceId: deviceId,
    uploadedAt: new Date().toISOString(),
    type: 'video'
  });
  
  onProgress(100);
};

export const addNote = async (
  noteText: string,
  userName: string,
  deviceId: string
): Promise<void> => {
  // Add note as a special media item
  await addDoc(collection(db, 'media'), {
    name: `note-${Date.now()}`,
    uploadedBy: userName,
    deviceId: deviceId,
    uploadedAt: new Date().toISOString(),
    type: 'note',
    noteText: noteText
  });
};

export const editNote = async (
  noteId: string,
  newText: string
): Promise<void> => {
  const noteRef = doc(db, 'media', noteId);
  await updateDoc(noteRef, {
    noteText: newText,
    lastEdited: new Date().toISOString()
  });
};

// 🔧 ENHANCED: Robuste Download-URL Funktion mit besserer Fehlerbehandlung
const getDownloadURLSafe = async (fileName: string): Promise<string> => {
  try {
    console.log(`🔍 Attempting to get URL for: ${fileName}`);
    
    // 🎯 FIX: Try multiple possible paths for the file
    const possiblePaths = [
      `uploads/${fileName}`,  // Standard path
      fileName,               // Direct path (fallback)
      `stories/${fileName}`,  // Stories path (if it was a story)
      `media/${fileName}`     // Alternative media path
    ];
    
    for (const path of possiblePaths) {
      try {
        console.log(`🔍 Trying path: ${path}`);
        const storageRef = ref(storage, path);
        const url = await getDownloadURL(storageRef);
        
        console.log(`✅ URL found at path: ${path}`);
        return url;
        
      } catch (pathError) {
        console.log(`❌ Path failed: ${path} - ${pathError.code}`);
        continue; // Try next path
      }
    }
    
    // If all paths fail, throw a descriptive error
    throw new Error(`File not found in any expected location: ${fileName}`);
    
  } catch (error) {
    console.error(`❌ Failed to get URL for ${fileName}:`, error);
    
    // 🔧 FIX: Return a placeholder or handle gracefully
    if (error.code === 'storage/object-not-found') {
      console.warn(`⚠️ File not found: ${fileName} - marking as unavailable`);
      throw new Error(`File not found: ${fileName}`);
    } else if (error.code === 'storage/unauthorized') {
      console.warn(`🔒 Access denied for: ${fileName} - checking permissions`);
      throw new Error(`Access denied: ${fileName}`);
    } else {
      throw new Error(`Could not load ${fileName}: ${error.message}`);
    }
  }
};

export const loadGallery = (callback: (items: MediaItem[]) => void): () => void => {
  const q = query(collection(db, 'media'), orderBy('uploadedAt', 'desc'));
  
  return onSnapshot(q, async (snapshot) => {
    console.log(`📊 Loading ${snapshot.docs.length} items from Firestore...`);
    
    // 🔧 FIX: Process items with better error handling
    const itemPromises = snapshot.docs.map(async (docSnapshot) => {
      const data = docSnapshot.data();
      
      try {
        if (data.type === 'note') {
          // Handle note items
          return {
            id: docSnapshot.id,
            name: data.name,
            url: '', // Notes don't have URLs
            uploadedBy: data.uploadedBy,
            uploadedAt: data.uploadedAt,
            deviceId: data.deviceId,
            type: 'note' as const,
            noteText: data.noteText
          };
          
        } else {
          // Handle media items (images/videos)
          try {
            const url = await getDownloadURLSafe(data.name);
            
            return {
              id: docSnapshot.id,
              name: data.name,
              url,
              uploadedBy: data.uploadedBy,
              uploadedAt: data.uploadedAt,
              deviceId: data.deviceId,
              type: data.type as 'image' | 'video'
            };
            
          } catch (urlError) {
            console.error(`❌ Could not load ${data.name}:`, urlError);
            
            // 🔧 FIX: Instead of skipping, create a placeholder item
            return {
              id: docSnapshot.id,
              name: data.name,
              url: '', // Empty URL indicates unavailable
              uploadedBy: data.uploadedBy,
              uploadedAt: data.uploadedAt,
              deviceId: data.deviceId,
              type: data.type as 'image' | 'video',
              isUnavailable: true // Mark as unavailable
            };
          }
        }
        
      } catch (itemError) {
        console.error(`❌ Error processing item ${docSnapshot.id}:`, itemError);
        return null; // Skip this item
      }
    });
    
    // Wait for all promises and filter null values
    const resolvedItems = await Promise.all(itemPromises);
    const validItems = resolvedItems.filter((item): item is MediaItem => item !== null);
    
    console.log(`📊 Gallery loaded successfully:`);
    console.log(`   📸 Images: ${validItems.filter(i => i.type === 'image').length}`);
    console.log(`   🎥 Videos: ${validItems.filter(i => i.type === 'video').length}`);
    console.log(`   💌 Notes: ${validItems.filter(i => i.type === 'note').length}`);
    console.log(`   ⚠️ Unavailable: ${validItems.filter(i => i.isUnavailable).length}`);
    console.log(`   ❌ Failed: ${snapshot.docs.length - validItems.length}`);
    
    callback(validItems);
    
  }, (error) => {
    console.error('❌ Gallery listener error:', error);
    // Fallback: empty list
    callback([]);
  });
};

export const deleteMediaItem = async (item: MediaItem): Promise<void> => {
  try {
    console.log(`🗑️ === DELETING MEDIA ITEM ===`);
    console.log(`🗑️ Item: ${item.name} (${item.type})`);
    console.log(`👤 Uploaded by: ${item.uploadedBy}`);
    
    // Delete from storage (only if it's not a note and has a valid URL)
    if (item.type !== 'note' && item.name && !item.isUnavailable) {
      try {
        console.log(`🗑️ Attempting to delete from storage: ${item.name}`);
        
        // 🔧 FIX: Try multiple possible paths for deletion
        const possiblePaths = [
          `uploads/${item.name}`,  // Standard path
          item.name,               // Direct path
          `stories/${item.name}`,  // Stories path
          `media/${item.name}`     // Alternative path
        ];
        
        let deletedFromStorage = false;
        
        for (const path of possiblePaths) {
          try {
            console.log(`🗑️ Trying to delete from path: ${path}`);
            const storageRef = ref(storage, path);
            await deleteObject(storageRef);
            console.log(`✅ Deleted from storage at path: ${path}`);
            deletedFromStorage = true;
            break; // Success, stop trying other paths
          } catch (pathError) {
            console.log(`❌ Delete failed for path: ${path} - ${pathError.code}`);
            continue; // Try next path
          }
        }
        
        if (!deletedFromStorage) {
          console.warn(`⚠️ Could not delete from storage: ${item.name} (file may not exist)`);
          // Continue with Firestore deletion anyway
        }
        
      } catch (storageError) {
        console.warn(`⚠️ Storage deletion error for ${item.name}:`, storageError);
        // Continue with Firestore deletion even if storage deletion fails
      }
    } else if (item.isUnavailable) {
      console.log(`ℹ️ Skipping storage deletion for unavailable item: ${item.name}`);
    }
    
    // Delete from Firestore
    console.log(`🗑️ Deleting from Firestore: ${item.id}`);
    await deleteDoc(doc(db, 'media', item.id));
    console.log(`✅ Deleted from Firestore: ${item.id}`);
    
    // Delete associated comments
    console.log(`🗑️ Deleting associated comments...`);
    const commentsQuery = query(
      collection(db, 'comments'), 
      where('mediaId', '==', item.id)
    );
    const commentsSnapshot = await getDocs(commentsQuery);
    
    const deleteCommentPromises = commentsSnapshot.docs.map(commentDoc => 
      deleteDoc(doc(db, 'comments', commentDoc.id))
    );
    
    // Delete associated likes
    console.log(`🗑️ Deleting associated likes...`);
    const likesQuery = query(
      collection(db, 'likes'), 
      where('mediaId', '==', item.id)
    );
    const likesSnapshot = await getDocs(likesQuery);
    
    const deleteLikePromises = likesSnapshot.docs.map(likeDoc => 
      deleteDoc(doc(db, 'likes', likeDoc.id))
    );
    
    await Promise.all([...deleteCommentPromises, ...deleteLikePromises]);
    console.log(`✅ Deleted ${deleteCommentPromises.length} comments and ${deleteLikePromises.length} likes`);
    
    console.log(`🗑️ === DELETION COMPLETE ===`);
    
  } catch (error) {
    console.error(`❌ Error deleting item ${item.id}:`, error);
    throw error;
  }
};

export const loadComments = (callback: (comments: Comment[]) => void): () => void => {
  const q = query(collection(db, 'comments'), orderBy('createdAt', 'asc'));
  
  return onSnapshot(q, (snapshot) => {
    const comments: Comment[] = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as Comment));
    
    console.log(`💬 Loaded ${comments.length} comments`);
    callback(comments);
    
  }, (error) => {
    console.error('❌ Error loading comments:', error);
    callback([]);
  });
};

export const addComment = async (
  mediaId: string, 
  text: string, 
  userName: string, 
  deviceId: string
): Promise<void> => {
  await addDoc(collection(db, 'comments'), {
    mediaId,
    text,
    userName,
    deviceId,
    createdAt: new Date().toISOString()
  });
};

export const deleteComment = async (commentId: string): Promise<void> => {
  await deleteDoc(doc(db, 'comments', commentId));
};

export const loadLikes = (callback: (likes: Like[]) => void): () => void => {
  const q = query(collection(db, 'likes'), orderBy('createdAt', 'desc'));
  
  return onSnapshot(q, (snapshot) => {
    const likes: Like[] = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as Like));
    
    console.log(`❤️ Loaded ${likes.length} likes`);
    callback(likes);
    
  }, (error) => {
    console.error('❌ Error loading likes:', error);
    callback([]);
  });
};

export const toggleLike = async (
  mediaId: string,
  userName: string,
  deviceId: string
): Promise<void> => {
  // Check if user already liked this media
  const likesQuery = query(
    collection(db, 'likes'),
    where('mediaId', '==', mediaId),
    where('userName', '==', userName),
    where('deviceId', '==', deviceId)
  );
  
  const likesSnapshot = await getDocs(likesQuery);
  
  if (likesSnapshot.empty) {
    // Add like
    await addDoc(collection(db, 'likes'), {
      mediaId,
      userName,
      deviceId,
      createdAt: new Date().toISOString()
    });
  } else {
    // Remove like
    const likeDoc = likesSnapshot.docs[0];
    await deleteDoc(doc(db, 'likes', likeDoc.id));
  }
};

// Profile management functions
export const loadProfile = (callback: (profile: ProfileData | null) => void): () => void => {
  const q = query(collection(db, 'profile'), orderBy('updatedAt', 'desc'));
  
  return onSnapshot(q, (snapshot) => {
    if (!snapshot.empty) {
      const profileDoc = snapshot.docs[0];
      const profile: ProfileData = {
        id: profileDoc.id,
        ...profileDoc.data()
      } as ProfileData;
      
      console.log('👤 Profile loaded:', profile.name);
      callback(profile);
    } else {
      console.log('👤 No profile found');
      callback(null);
    }
  }, (error) => {
    console.error('❌ Error loading profile:', error);
    callback(null);
  });
};

export const updateProfile = async (
  profileData: {
    profilePicture?: File | string;
    name: string;
    bio: string;
    countdownDate?: string;
    countdownEndMessage?: string;
    countdownMessageDismissed?: boolean;
  },
  userName: string
): Promise<void> => {
  try {
    let profilePictureUrl = profileData.profilePicture;
    
    // Upload new profile picture if it's a File
    if (profileData.profilePicture instanceof File) {
      const fileName = `profile-${Date.now()}-${profileData.profilePicture.name}`;
      const storageRef = ref(storage, `uploads/${fileName}`); // Use uploads folder like other media
      await uploadBytes(storageRef, profileData.profilePicture);
      profilePictureUrl = await getDownloadURL(storageRef);
      console.log('📷 Profile picture uploaded:', fileName);
    }
    
    const profilePayload = {
      name: profileData.name,
      bio: profileData.bio,
      profilePicture: profilePictureUrl,
      countdownDate: profileData.countdownDate,
      countdownEndMessage: profileData.countdownEndMessage,
      countdownMessageDismissed: profileData.countdownMessageDismissed,
      updatedAt: new Date().toISOString(),
      updatedBy: userName
    };
    
    // Check if profile already exists
    const profileQuery = query(collection(db, 'profile'));
    const profileSnapshot = await getDocs(profileQuery);
    
    if (!profileSnapshot.empty) {
      // Update existing profile
      const profileDoc = profileSnapshot.docs[0];
      await updateDoc(doc(db, 'profile', profileDoc.id), profilePayload);
      console.log('✅ Profile updated');
    } else {
      // Create new profile
      await addDoc(collection(db, 'profile'), profilePayload);
      console.log('✅ Profile created');
    }
    
  } catch (error) {
    console.error('❌ Error updating profile:', error);
    throw error;
  }
};