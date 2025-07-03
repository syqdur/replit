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
        isUnderConstruction: data.isUnderConstruction ?? false,
        galleryEnabled: data.galleryEnabled ?? true,
        musicWishlistEnabled: data.musicWishlistEnabled ?? true,
        storiesEnabled: data.storiesEnabled ?? true,
        lastUpdated: data.lastUpdated ?? new Date().toISOString(),
        updatedBy: data.updatedBy ?? 'system'
      } as SiteStatus;
    } else {
      // Default: site is LIVE with all features enabled (migration from Agent to Replit)
      const defaultStatus: SiteStatus = {
        isUnderConstruction: false,
        galleryEnabled: true,
        musicWishlistEnabled: true,
        storiesEnabled: true,
        lastUpdated: new Date().toISOString(),
        updatedBy: 'migration'
      };
      
      // Create the document with default status
      await setDoc(docRef, defaultStatus);
      return defaultStatus;
    }
  } catch (error) {
    console.error('Error getting site status:', error);
    
    // Return safe defaults on error
    return {
      isUnderConstruction: false,
      galleryEnabled: true,
      musicWishlistEnabled: true,
      storiesEnabled: true,
      lastUpdated: new Date().toISOString(),
      updatedBy: 'error-fallback'
    };
  }
};

// Subscribe to site status changes
export const subscribeSiteStatus = (
  callback: (status: SiteStatus) => void,
  onError?: (error: Error) => void
): (() => void) => {
  const docRef = doc(db, 'settings', SITE_STATUS_DOC);
  
  return onSnapshot(
    docRef,
    (doc) => {
      if (doc.exists()) {
        const data = doc.data();
        const status: SiteStatus = {
          isUnderConstruction: data.isUnderConstruction ?? false,
          galleryEnabled: data.galleryEnabled ?? true,
          musicWishlistEnabled: data.musicWishlistEnabled ?? true,
          storiesEnabled: data.storiesEnabled ?? true,
          lastUpdated: data.lastUpdated ?? new Date().toISOString(),
          updatedBy: data.updatedBy ?? 'system'
        };
        callback(status);
      } else {
        // Document doesn't exist, create default
        getSiteStatus().then(callback);
      }
    },
    (error) => {
      console.error('Error listening to site status:', error);
      if (onError) {
        onError(error);
      } else {
        // Fallback to safe defaults
        callback({
          isUnderConstruction: false,
          galleryEnabled: true,
          musicWishlistEnabled: true,
          storiesEnabled: true,
          lastUpdated: new Date().toISOString(),
          updatedBy: 'listener-error'
        });
      }
    }
  );
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
        isUnderConstruction: data.isUnderConstruction ?? false,
        galleryEnabled: data.galleryEnabled ?? true,
        musicWishlistEnabled: data.musicWishlistEnabled ?? true,
        storiesEnabled: data.storiesEnabled ?? true,
        lastUpdated: data.lastUpdated ?? new Date().toISOString(),
        updatedBy: data.updatedBy ?? 'system'
      };
    } else {
      currentStatus = {
        isUnderConstruction: false,
        galleryEnabled: true,
        musicWishlistEnabled: true,
        storiesEnabled: true,
        lastUpdated: new Date().toISOString(),
        updatedBy: 'migration'
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
  updates: Partial<Pick<SiteStatus, 'galleryEnabled' | 'musicWishlistEnabled' | 'storiesEnabled'>>,
  adminName: string
): Promise<void> => {
  try {
    const docRef = doc(db, 'settings', SITE_STATUS_DOC);
    const docSnap = await getDoc(docRef);
    
    let currentStatus: SiteStatus;
    if (docSnap.exists()) {
      const data = docSnap.data();
      currentStatus = {
        isUnderConstruction: data.isUnderConstruction ?? false,
        galleryEnabled: data.galleryEnabled ?? true,
        musicWishlistEnabled: data.musicWishlistEnabled ?? true,
        storiesEnabled: data.storiesEnabled ?? true,
        lastUpdated: data.lastUpdated ?? new Date().toISOString(),
        updatedBy: data.updatedBy ?? 'system'
      };
    } else {
      currentStatus = {
        isUnderConstruction: false,
        galleryEnabled: true,
        musicWishlistEnabled: true,
        storiesEnabled: true,
        lastUpdated: new Date().toISOString(),
        updatedBy: 'migration'
      };
    }
    
    const newStatus: SiteStatus = {
      ...currentStatus,
      ...updates,
      lastUpdated: new Date().toISOString(),
      updatedBy: adminName
    };
    
    await setDoc(docRef, newStatus);
    console.log(`Feature toggles updated by ${adminName}:`, updates);
  } catch (error) {
    console.error('Error updating feature toggles:', error);
    throw new Error('Fehler beim Aktualisieren der Features');
  }
};

// Force site to be live (migration utility)
export const forceSiteLive = async (): Promise<void> => {
  try {
    const docRef = doc(db, 'settings', SITE_STATUS_DOC);
    const liveStatus: SiteStatus = {
      isUnderConstruction: false,
      galleryEnabled: true,
      musicWishlistEnabled: true,
      storiesEnabled: true,
      lastUpdated: new Date().toISOString(),
      updatedBy: 'migration-force-live'
    };
    
    await setDoc(docRef, liveStatus);
    console.log('Site forced to live status for migration');
  } catch (error) {
    console.error('Error forcing site live:', error);
    throw new Error('Migration error: Could not force site live');
  }
};