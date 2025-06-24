import { 
  doc, 
  getDoc, 
  setDoc, 
  onSnapshot 
} from 'firebase/firestore';
import { db } from '../config/firebase';

export interface SiteStatus {
  isUnderConstruction: boolean;
  galleryEnabled: boolean;
  musicWishlistEnabled: boolean;
  storiesEnabled: boolean;
  lastUpdated: string;
  updatedBy: string;
}

const SITE_STATUS_DOC = 'site_status';

// Get current site status
export const getSiteStatus = async (): Promise<SiteStatus> => {
  try {
    const docRef = doc(db, 'settings', SITE_STATUS_DOC);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      const data = docSnap.data();
      // Ensure backward compatibility by providing defaults for new fields
      return {
        isUnderConstruction: data.isUnderConstruction ?? true,
        galleryEnabled: data.galleryEnabled ?? true,
        musicWishlistEnabled: data.musicWishlistEnabled ?? true,
        storiesEnabled: data.storiesEnabled ?? true,
        lastUpdated: data.lastUpdated ?? new Date().toISOString(),
        updatedBy: data.updatedBy ?? 'system'
      } as SiteStatus;
    } else {
      // Default: site is under construction with all features enabled
      const defaultStatus: SiteStatus = {
        isUnderConstruction: true,
        galleryEnabled: true,
        musicWishlistEnabled: true,
        lastUpdated: new Date().toISOString(),
        updatedBy: 'system'
      };
      
      // Create the document with default status
      await setDoc(docRef, defaultStatus);
      return defaultStatus;
    }
  } catch (error) {
    console.error('Error getting site status:', error);
    // Fallback to under construction if Firebase fails
    return {
      isUnderConstruction: true,
      galleryEnabled: true,
      musicWishlistEnabled: true,
      storiesEnabled: true,
      lastUpdated: new Date().toISOString(),
      updatedBy: 'system'
    };
  }
};

// Update site status (admin only)
export const updateSiteStatus = async (
  isUnderConstruction: boolean, 
  adminName: string
): Promise<void> => {
  try {
    const docRef = doc(db, 'settings', SITE_STATUS_DOC);
    const docSnap = await getDoc(docRef);
    
    let currentStatus: SiteStatus;
    if (docSnap.exists()) {
      const data = docSnap.data();
      currentStatus = {
        isUnderConstruction: data.isUnderConstruction ?? true,
        galleryEnabled: data.galleryEnabled ?? true,
        musicWishlistEnabled: data.musicWishlistEnabled ?? true,
        lastUpdated: data.lastUpdated ?? new Date().toISOString(),
        updatedBy: data.updatedBy ?? 'system'
      };
    } else {
      currentStatus = {
        isUnderConstruction: true,
        galleryEnabled: true,
        musicWishlistEnabled: true,
        lastUpdated: new Date().toISOString(),
        updatedBy: 'system'
      };
    }
    
    const newStatus: SiteStatus = {
      ...currentStatus,
      isUnderConstruction,
      lastUpdated: new Date().toISOString(),
      updatedBy: adminName
    };
    
    await setDoc(docRef, newStatus);
    console.log(`Site status updated: ${isUnderConstruction ? 'Under Construction' : 'Live'} by ${adminName}`);
  } catch (error) {
    console.error('Error updating site status:', error);
    throw new Error('Fehler beim Aktualisieren des Website-Status');
  }
};

// Update feature toggles (admin only)
export const updateFeatureToggles = async (
  galleryEnabled: boolean,
  musicWishlistEnabled: boolean,
  storiesEnabled: boolean,
  adminName: string
): Promise<void> => {
  try {
    const docRef = doc(db, 'settings', SITE_STATUS_DOC);
    const docSnap = await getDoc(docRef);
    
    let currentStatus: SiteStatus;
    if (docSnap.exists()) {
      const data = docSnap.data();
      currentStatus = {
        isUnderConstruction: data.isUnderConstruction ?? true,
        galleryEnabled: data.galleryEnabled ?? true,
        musicWishlistEnabled: data.musicWishlistEnabled ?? true,
        lastUpdated: data.lastUpdated ?? new Date().toISOString(),
        updatedBy: data.updatedBy ?? 'system'
      };
    } else {
      currentStatus = {
        isUnderConstruction: true,
        galleryEnabled: true,
        musicWishlistEnabled: true,
        lastUpdated: new Date().toISOString(),
        updatedBy: 'system'
      };
    }
    
    const newStatus: SiteStatus = {
      ...currentStatus,
      galleryEnabled,
      musicWishlistEnabled,
      storiesEnabled,
      lastUpdated: new Date().toISOString(),
      updatedBy: adminName
    };
    
    await setDoc(docRef, newStatus);
    console.log(`Features updated - Gallery: ${galleryEnabled ? 'ON' : 'OFF'}, Music: ${musicWishlistEnabled ? 'ON' : 'OFF'}, Stories: ${storiesEnabled ? 'ON' : 'OFF'} by ${adminName}`);
  } catch (error) {
    console.error('Error updating feature toggles:', error);
    throw new Error('Fehler beim Aktualisieren der Feature-Einstellungen');
  }
};

// Listen to site status changes in real-time
export const subscribeSiteStatus = (
  callback: (status: SiteStatus) => void
): (() => void) => {
  const docRef = doc(db, 'settings', SITE_STATUS_DOC);
  
  return onSnapshot(docRef, (doc) => {
    if (doc.exists()) {
      const data = doc.data();
      callback({
        isUnderConstruction: data.isUnderConstruction ?? true,
        galleryEnabled: data.galleryEnabled ?? true,
        musicWishlistEnabled: data.musicWishlistEnabled ?? true,
        storiesEnabled: data.storiesEnabled ?? true,
        lastUpdated: data.lastUpdated ?? new Date().toISOString(),
        updatedBy: data.updatedBy ?? 'system'
      } as SiteStatus);
    } else {
      // If document doesn't exist, create it with default status
      const defaultStatus: SiteStatus = {
        isUnderConstruction: true,
        galleryEnabled: true,
        musicWishlistEnabled: true,
        lastUpdated: new Date().toISOString(),
        updatedBy: 'system'
      };
      
      setDoc(docRef, defaultStatus).then(() => {
        callback(defaultStatus);
      });
    }
  }, (error) => {
    console.error('Error listening to site status:', error);
    // Fallback to under construction on error
    callback({
      isUnderConstruction: true,
      galleryEnabled: true,
      musicWishlistEnabled: true,
      storiesEnabled: true,
      lastUpdated: new Date().toISOString(),
      updatedBy: 'system'
    });
  });
};