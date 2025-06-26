import React, { useState, useEffect } from 'react';
import { Heart, MessageCircle, MoreHorizontal, Sun, Moon, UserPlus, Lock, Unlock, Settings } from 'lucide-react';
import { UserNamePrompt } from './components/UserNamePrompt';
import { UploadSection } from './components/UploadSection';
import { InstagramGallery } from './components/InstagramGallery';
import { MediaModal } from './components/MediaModal';
import { AdminPanel } from './components/AdminPanel';
import { ProfileHeader } from './components/ProfileHeader';
import { UnderConstructionPage } from './components/UnderConstructionPage';
import { StoriesBar } from './components/StoriesBar';
import { StoriesViewer } from './components/StoriesViewer';
import { StoryUploadModal } from './components/StoryUploadModal';
import { TabNavigation } from './components/TabNavigation';
import { LiveUserIndicator } from './components/LiveUserIndicator';
import { SpotifyCallback } from './components/SpotifyCallback';
import { MusicWishlist } from './components/MusicWishlist';
import { Timeline } from './components/Timeline';
import { PostWeddingRecap } from './components/PostWeddingRecap';
import { PublicRecapPage } from './components/PublicRecapPage';
import { AdminLoginModal } from './components/AdminLoginModal';
import { UserProfileModal } from './components/UserProfileModal';
import { BackToTopButton } from './components/BackToTopButton';
import { NotificationCenter } from './components/NotificationCenter';
import { useUser } from './hooks/useUser';
import { useDarkMode } from './hooks/useDarkMode';
import { MediaItem, Comment, Like } from './types';
import {
  uploadFiles,
  uploadVideoBlob,
  loadGallery,
  deleteMediaItem,
  loadComments,
  addComment,
  deleteComment,
  loadLikes,
  toggleLike,
  addNote,
  editNote,
  loadUserProfiles,
  getUserProfile,
  getAllUserProfiles,
  createOrUpdateUserProfile,
  uploadUserProfilePicture,
  UserProfile,
  createTestNotification
} from './services/firebaseService';
import { subscribeSiteStatus, SiteStatus } from './services/siteStatusService';
import { getUserName, getDeviceId } from './utils/deviceId';
import { notificationService, initializePushNotifications } from './services/notificationService';
import {
  subscribeStories,
  subscribeAllStories,
  addStory,
  markStoryAsViewed,
  deleteStory,
  cleanupExpiredStories,
  Story
} from './services/liveService';

function App() {
  // Check if user was deleted and prevent app initialization
  const isUserDeleted = localStorage.getItem('userDeleted') === 'true';
  
  const { userName, deviceId, showNamePrompt, setUserName } = useUser();
  const { isDarkMode, toggleDarkMode } = useDarkMode();
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [likes, setLikes] = useState<Like[]>([]);
  const [stories, setStories] = useState<Story[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [showUserProfileModal, setShowUserProfileModal] = useState(false);
  const [showProfileEditModal, setShowProfileEditModal] = useState(false);
  const [userProfiles, setUserProfiles] = useState<UserProfile[]>([]);
  const [currentUserProfile, setCurrentUserProfile] = useState<UserProfile | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [status, setStatus] = useState('');
  const [siteStatus, setSiteStatus] = useState<SiteStatus | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showStoriesViewer, setShowStoriesViewer] = useState(false);
  const [currentStoryIndex, setCurrentStoryIndex] = useState(0);
  const [showStoryUpload, setShowStoryUpload] = useState(false);
  const [activeTab, setActiveTab] = useState<'gallery' | 'music' | 'timeline'>('gallery');
  
  // Handle tab switching when features are disabled
  const handleTabChange = (tab: 'gallery' | 'music' | 'timeline') => {
    if (tab === 'gallery' && siteStatus && !siteStatus.galleryEnabled) {
      return; // Don't switch to gallery if disabled
    }
    if (tab === 'music' && siteStatus && !siteStatus.musicWishlistEnabled) {
      return; // Don't switch to music if disabled
    }
    setActiveTab(tab);
  };

  // Auto-switch away from disabled tabs
  useEffect(() => {
    if (siteStatus) {
      if (activeTab === 'gallery' && !siteStatus.galleryEnabled) {
        setActiveTab('timeline'); // Switch to timeline if gallery is disabled
      }
      if (activeTab === 'music' && !siteStatus.musicWishlistEnabled) {
        setActiveTab('timeline'); // Switch to timeline if music is disabled
      }
    }
  }, [siteStatus, activeTab]);
  const [showAdminLogin, setShowAdminLogin] = useState(false);

  // Check if we're on the Spotify callback page
  const isSpotifyCallback = () => {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.has('code') && urlParams.has('state');
  };

  // Check if we're on the Public Recap page
  const isPublicRecap = () => {
    return window.location.pathname === '/recap';
  };

  // Check if we're on the Post-Wedding Recap page (admin)
  const isPostWeddingRecap = () => {
    return window.location.pathname === '/admin/post-wedding-recap';
  };

  // Subscribe to site status changes
  useEffect(() => {
    const unsubscribe = subscribeSiteStatus((status) => {
      setSiteStatus(status);
    });

    return unsubscribe;
  }, []);

  // Initialize notification service when user is logged in
  useEffect(() => {
    if (!userName) return;

    const initNotifications = async () => {
      try {
        const initialized = await notificationService.init();
        if (initialized) {
          await notificationService.subscribeToPush(userName, deviceId);
          console.log('✅ Push notifications initialized');
        }
        
        // Initialize real push notifications for Android/iPhone
        await initializePushNotifications();
      } catch (error) {
        console.log('⚠️ Push notifications not available:', error);
      }
    };

    initNotifications();

    // Handle navigation events from service worker (real push notifications)
    const handleServiceWorkerNavigation = (event: any) => {
      const { mediaId } = event.detail;
      if (mediaId) {
        // Navigate to media and open modal
        setActiveTab('gallery');
        const mediaIndex = mediaItems.findIndex(item => item.id === mediaId);
        if (mediaIndex !== -1) {
          setCurrentImageIndex(mediaIndex);
          setModalOpen(true);
        }
      }
    };

    window.addEventListener('navigateToMedia', handleServiceWorkerNavigation);
    
    return () => {
      window.removeEventListener('navigateToMedia', handleServiceWorkerNavigation);
    };
  }, [userName, deviceId]);

  // Subscribe to stories when user is logged in
  useEffect(() => {
    if (!userName || !siteStatus || siteStatus.isUnderConstruction) return;

    // Subscribe to stories (admin sees all, users see only active)
    const unsubscribeStories = isAdmin 
      ? subscribeAllStories(setStories)
      : subscribeStories(setStories);

    // Cleanup expired stories periodically
    const cleanupInterval = setInterval(() => {
      cleanupExpiredStories();
    }, 60000); // Check every minute

    return () => {
      clearInterval(cleanupInterval);
      unsubscribeStories();
    };
  }, [userName, deviceId, siteStatus, isAdmin]);

  useEffect(() => {
    if (!userName || !siteStatus || siteStatus.isUnderConstruction) return;

    const unsubscribeGallery = loadGallery(setMediaItems);
    const unsubscribeComments = loadComments(setComments);
    const unsubscribeLikes = loadLikes(setLikes);
    const unsubscribeUserProfiles = loadUserProfiles(setUserProfiles);

    return () => {
      unsubscribeGallery();
      unsubscribeComments();
      unsubscribeLikes();
      unsubscribeUserProfiles();
    };
  }, [userName, siteStatus]);

  // Auto-logout when window/tab is closed
  useEffect(() => {
    const handleBeforeUnload = () => {
      // Clear admin status when page is closed
      if (isAdmin) {
        localStorage.removeItem('admin_status');
      }
    };

    // Check if admin status is stored in localStorage (for page refreshes)
    const storedAdminStatus = localStorage.getItem('admin_status');
    if (storedAdminStatus) {
      setIsAdmin(true);
    }

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [isAdmin]);

  const handleUpload = async (files: FileList) => {
    if (!userName) return;

    setIsUploading(true);
    setUploadProgress(0);
    setStatus('⏳ Lädt hoch...');

    try {
      await uploadFiles(files, userName, deviceId, setUploadProgress);
      
      // Ensure user profile exists for proper display name sync
      await createOrUpdateUserProfile(userName, deviceId, {});
      
      setStatus('✅ Bilder erfolgreich hochgeladen!');
      setTimeout(() => setStatus(''), 3000);
    } catch (error) {
      setStatus('❌ Fehler beim Hochladen. Bitte versuche es erneut.');
      console.error('Upload error:', error);
      setTimeout(() => setStatus(''), 5000);
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const handleVideoUpload = async (videoBlob: Blob) => {
    if (!userName) return;

    setIsUploading(true);
    setUploadProgress(0);
    setStatus('⏳ Video wird hochgeladen...');

    try {
      await uploadVideoBlob(videoBlob, userName, deviceId, setUploadProgress);
      
      // Ensure user profile exists for proper display name sync
      await createOrUpdateUserProfile(userName, deviceId, {});
      
      setStatus('✅ Video erfolgreich hochgeladen!');
      setTimeout(() => setStatus(''), 3000);
    } catch (error) {
      setStatus('❌ Fehler beim Hochladen des Videos. Bitte versuche es erneut.');
      console.error('Video upload error:', error);
      setTimeout(() => setStatus(''), 5000);
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const handleNoteSubmit = async (noteText: string) => {
    if (!userName) return;

    setIsUploading(true);
    setStatus('⏳ Notiz wird gespeichert...');

    try {
      await addNote(noteText, userName, deviceId);
      
      // Ensure user profile exists for proper display name sync
      await createOrUpdateUserProfile(userName, deviceId, {});
      
      setStatus('✅ Notiz erfolgreich hinterlassen!');
      setTimeout(() => setStatus(''), 3000);
    } catch (error) {
      setStatus('❌ Fehler beim Speichern der Notiz. Bitte versuche es erneut.');
      console.error('Note error:', error);
      setTimeout(() => setStatus(''), 5000);
    } finally {
      setIsUploading(false);
    }
  };

  const handleEditNote = async (item: MediaItem, newText: string) => {
    if (!userName || item.uploadedBy !== userName) {
      alert('Du kannst nur deine eigenen Notizen bearbeiten.');
      return;
    }

    setIsUploading(true);
    setStatus('⏳ Notiz wird aktualisiert...');

    try {
      await editNote(item.id, newText);
      setStatus('✅ Notiz erfolgreich aktualisiert!');
      setTimeout(() => setStatus(''), 3000);
    } catch (error) {
      setStatus('❌ Fehler beim Aktualisieren der Notiz. Bitte versuche es erneut.');
      console.error('Edit note error:', error);
      setTimeout(() => setStatus(''), 5000);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async (item: MediaItem) => {
    // Check permissions
    if (!isAdmin && item.uploadedBy !== userName) {
      alert('Du kannst nur deine eigenen Beiträge löschen.');
      return;
    }

    const itemType = item.type === 'note' ? 'Notiz' : item.type === 'video' ? 'Video' : 'Bild';
    const confirmMessage = isAdmin 
      ? `${itemType} von ${item.uploadedBy} wirklich löschen?`
      : `Dein${item.type === 'note' ? 'e' : ''} ${itemType} wirklich löschen?`;

    if (!window.confirm(confirmMessage)) return;

    try {
      await deleteMediaItem(item);
      setStatus(`✅ ${itemType} erfolgreich gelöscht!`);
      setTimeout(() => setStatus(''), 3000);
    } catch (error) {
      setStatus(`❌ Fehler beim Löschen des ${itemType}s.`);
      console.error('Delete error:', error);
      setTimeout(() => setStatus(''), 5000);
    }
  };

  const handleAddComment = async (mediaId: string, text: string) => {
    if (!userName) return;
    
    try {
      await addComment(mediaId, text, userName, deviceId);
      
      // Find the media owner to send notification
      const mediaItem = mediaItems.find(item => item.id === mediaId);
      if (mediaItem && mediaItem.uploadedBy !== userName) {
        await notificationService.sendCommentNotification(
          mediaItem.uploadedBy,
          mediaItem.deviceId,
          userName,
          deviceId,
          mediaId,
          text
        );
      }
      
      // Ensure user profile exists for proper display name sync
      await createOrUpdateUserProfile(userName, deviceId, {});
    } catch (error) {
      console.error('Error adding comment:', error);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    try {
      await deleteComment(commentId);
    } catch (error) {
      console.error('Error deleting comment:', error);
    }
  };

  const handleToggleLike = async (mediaId: string) => {
    if (!userName) return;
    
    try {
      await toggleLike(mediaId, userName, deviceId);
      
      // Send notification for likes (simplified approach)
      const mediaItem = mediaItems.find(item => item.id === mediaId);
      if (mediaItem && mediaItem.uploadedBy !== userName) {
        await notificationService.sendLikeNotification(
          mediaItem.uploadedBy,
          mediaItem.deviceId,
          userName,
          deviceId,
          mediaId
        );
      }
    } catch (error) {
      console.error('Error toggling like:', error);
    }
  };

  const handleStoryUpload = async (file: File) => {
    if (!userName) return;

    setIsUploading(true);
    setStatus('⏳ Story wird hochgeladen...');

    try {
      // Determine media type
      const mediaType = file.type.startsWith('video/') ? 'video' : 'image';
      
      // Add story using the service function
      await addStory(file, mediaType, userName, deviceId);
      
      setStatus('✅ Story erfolgreich hinzugefügt!');
      setTimeout(() => setStatus(''), 3000);
    } catch (error) {
      console.error('Story upload error:', error);
      setStatus('❌ Fehler beim Hochladen der Story. Bitte versuche es erneut.');
      setTimeout(() => setStatus(''), 5000);
    } finally {
      setIsUploading(false);
    }
  };

  const handleViewStory = (storyIndex: number) => {
    setCurrentStoryIndex(storyIndex);
    setShowStoriesViewer(true);
  };

  const handleStoryViewed = async (storyId: string) => {
    await markStoryAsViewed(storyId, deviceId);
  };

  const handleDeleteStory = async (storyId: string) => {
    try {
      await deleteStory(storyId);
      setStatus('✅ Story erfolgreich gelöscht!');
      setTimeout(() => setStatus(''), 3000);
    } catch (error) {
      console.error('Error deleting story:', error);
      setStatus('❌ Fehler beim Löschen der Story.');
      setTimeout(() => setStatus(''), 5000);
    }
  };

  const openModal = (index: number) => {
    setCurrentImageIndex(index);
    setModalOpen(true);
  };

  const nextImage = () => {
    setCurrentImageIndex((prev) => 
      prev === mediaItems.length - 1 ? 0 : prev + 1
    );
  };

  const prevImage = () => {
    setCurrentImageIndex((prev) => 
      prev === 0 ? mediaItems.length - 1 : prev - 1
    );
  };

  const handleAdminLogin = (username: string) => {
    setIsAdmin(true);
    localStorage.setItem('admin_status', 'true');
    setShowAdminLogin(false);
  };

  const handleAdminLogout = () => {
    setIsAdmin(false);
    localStorage.removeItem('admin_status');
  };

  const handleProfileUpdated = (profile: UserProfile) => {
    setCurrentUserProfile(profile);
    // Update the userProfiles array to sync display names
    setUserProfiles(prev => {
      const index = prev.findIndex(p => p.id === profile.id);
      if (index >= 0) {
        const updated = [...prev];
        updated[index] = profile;
        return updated;
      } else {
        return [...prev, profile];
      }
    });
  };

  const handleNavigateToMedia = (mediaId: string) => {
    // Find the media item in the current media list
    const mediaIndex = mediaItems.findIndex(item => item.id === mediaId);
    if (mediaIndex !== -1) {
      // Switch to gallery tab and open the media modal
      setActiveTab('gallery');
      setCurrentImageIndex(mediaIndex);
      setModalOpen(true);
    }
  };;

  // Real-time profile synchronization - polling for profile changes
  useEffect(() => {
    if (!userName || !deviceId) return;
    
    console.log(`🔄 Setting up profile sync for ${userName}`);
    
    const checkProfileUpdates = async () => {
      try {
        const latestProfile = await getUserProfile(userName, deviceId);
        if (latestProfile && JSON.stringify(latestProfile) !== JSON.stringify(currentUserProfile)) {
          console.log(`📸 Profile updated for ${userName}:`, latestProfile.profilePicture ? 'Has picture' : 'No picture');
          setCurrentUserProfile(latestProfile);
        }
      } catch (error) {
        console.error('Error checking profile updates:', error);
      }
    };
    
    // Check for profile updates every 3 seconds for live sync
    const interval = setInterval(checkProfileUpdates, 3000);
    
    return () => {
      console.log(`🔄 Cleaning up profile sync for ${userName}`);
      clearInterval(interval);
    };
  }, [userName, deviceId, currentUserProfile]);

  // Load current user profile when user changes (fallback)
  useEffect(() => {
    const loadCurrentUserProfile = async () => {
      if (userName && deviceId) {
        try {
          console.log(`🔍 Looking for profile: ${userName} with deviceId ${deviceId}`);
          const userProfile = await getUserProfile(userName, deviceId);
          setCurrentUserProfile(userProfile);
          
          if (userProfile) {
            console.log(`✅ Found profile for ${userName}: ${userProfile.displayName || 'No display name'}`);
          } else {
            console.log(`❌ No profile found for ${userName} (${deviceId})`);
            
            // Try to find any existing profile for this username or similar usernames
            console.log(`🔍 Checking for existing profiles for username: ${userName}`);
            const allProfiles = await getAllUserProfiles();
            
            // First try exact match
            let existingUserProfile = allProfiles.find(p => p.userName === userName);
            
            // If no exact match, try fuzzy matching for similar names (e.g., Maurizio -> Mauro)
            if (!existingUserProfile) {
              const lowerUserName = userName.toLowerCase();
              existingUserProfile = allProfiles.find(p => {
                const lowerProfileName = p.userName.toLowerCase();
                return lowerProfileName.includes(lowerUserName.slice(0, 4)) || 
                       lowerUserName.includes(lowerProfileName.slice(0, 4));
              });
              
              if (existingUserProfile) {
                console.log(`🔗 Found similar profile: ${existingUserProfile.userName} for ${userName}`);
              }
            }
            
            if (existingUserProfile) {
              console.log(`🔗 Found existing profile for ${userName}, linking to current device`);
              try {
                // Create a new profile entry for this device but use existing display name/picture
                await createOrUpdateUserProfile(userName, deviceId, {
                  displayName: existingUserProfile.displayName || userName,
                  profilePicture: existingUserProfile.profilePicture
                });
                
                const linkedProfile = await getUserProfile(userName, deviceId);
                setCurrentUserProfile(linkedProfile);
                console.log(`✅ Linked existing profile data to current device for ${userName}`);
              } catch (error) {
                console.error('Error linking profile:', error);
                // Fallback to basic profile
                setCurrentUserProfile(null);
              }
            } else {
              console.log(`🔧 No existing profile found, user will need to create one manually`);
              // Don't auto-create profile to avoid Firebase errors
              setCurrentUserProfile(null);
            }
          }
        } catch (error) {
          console.error('Error loading current user profile:', error);
        }
      }
    };

    // Only load initially, real-time updates handled by listener above
    loadCurrentUserProfile();
  }, [userName, deviceId]);

  // Sync all user profiles when app loads and when new users connect
  useEffect(() => {
    const syncAllUserProfiles = async () => {
      try {
        console.log('🔄 Syncing all user profiles for display name consistency...');
        const allProfiles = await getAllUserProfiles();
        setUserProfiles(allProfiles);
        console.log(`✅ Synced ${allProfiles.length} user profiles`);
      } catch (error) {
        console.error('Error syncing user profiles:', error);
      }
    };

    // Initial sync when app loads
    syncAllUserProfiles();

    // Listen for new user connections and resync profiles
    const handleUserConnected = async (event: CustomEvent) => {
      const { userName, deviceId, profilePicture } = event.detail;
      console.log(`🔄 New user connected (${userName}), resyncing all profiles...`);
      
      // If user provided a profile picture during registration, upload it first then save profile
      if (profilePicture && profilePicture instanceof File) {
        try {
          console.log('📷 Uploading profile picture for new user:', userName);
          
          // Upload the profile picture to Firebase Storage
          const profilePictureUrl = await uploadUserProfilePicture(profilePicture, userName, deviceId);
          
          console.log('✅ Profile picture uploaded, creating user profile...');
          
          // Create user profile with the uploaded picture URL
          await createOrUpdateUserProfile(userName, deviceId, {
            displayName: userName,
            profilePicture: profilePictureUrl
          });
          
          // Update current user profile if this is the current user
          const currentStoredName = getUserName();
          const currentStoredDeviceId = getDeviceId();
          if (userName === currentStoredName && deviceId === currentStoredDeviceId) {
            const updatedProfile = await getUserProfile(userName, deviceId);
            setCurrentUserProfile(updatedProfile);
          }
          console.log('✅ Profile picture saved for new user');
        } catch (error) {
          console.error('❌ Error saving profile picture:', error);
        }
      }
      
      // Delay the sync to ensure profile creation has completed
      setTimeout(() => {
        syncAllUserProfiles();
      }, 1000);
    };

    window.addEventListener('userConnected', handleUserConnected as any);
    
    return () => {
      window.removeEventListener('userConnected', handleUserConnected as any);
    };
  }, []);

  // Function to get user's profile picture or fallback to generated avatar
  const getUserAvatar = (targetUserName: string, targetDeviceId?: string) => {
    const userProfile = userProfiles.find(p => 
      p.userName === targetUserName && (!targetDeviceId || p.deviceId === targetDeviceId)
    );
    // Return custom profile picture if available, otherwise return null for generated avatar fallback
    return userProfile?.profilePicture || null;
  };

  // Function to get user's display name (display name overrides username)
  const getUserDisplayName = (targetUserName: string, targetDeviceId?: string) => {
    const userProfile = userProfiles.find(p => 
      p.userName === targetUserName && (!targetDeviceId || p.deviceId === targetDeviceId)
    );
    // Return display name if it exists and is different from username, otherwise return username
    return (userProfile?.displayName && userProfile.displayName !== targetUserName) 
      ? userProfile.displayName 
      : targetUserName;
  };

  // Show Spotify callback handler if on callback page
  if (isSpotifyCallback()) {
    return <SpotifyCallback isDarkMode={isDarkMode} />;
  }

  // Show Public Recap Page if on that route
  if (isPublicRecap()) {
    return <PublicRecapPage isDarkMode={isDarkMode} />;
  }

  // Show Post-Wedding Recap if on that route (admin only)
  if (isPostWeddingRecap()) {
    // Only allow access if admin
    if (!isAdmin) {
      return (
        <div className={`min-h-screen flex items-center justify-center transition-colors duration-300 ${
          isDarkMode ? 'bg-gray-900' : 'bg-gray-50'
        }`}>
          <div className="text-center">
            <div className="text-6xl mb-4">🔒</div>
            <h1 className={`text-2xl font-bold mb-2 transition-colors duration-300 ${
              isDarkMode ? 'text-white' : 'text-gray-900'
            }`}>
              Zugriff verweigert
            </h1>
            <p className={`transition-colors duration-300 ${
              isDarkMode ? 'text-gray-400' : 'text-gray-600'
            }`}>
              Diese Seite ist nur für Administratoren zugänglich.
            </p>
            <button
              onClick={() => setShowAdminLogin(true)}
              className="mt-4 px-6 py-3 bg-pink-600 hover:bg-pink-700 text-white rounded-xl transition-colors"
            >
              Anmelden
            </button>
          </div>
          
          <AdminLoginModal 
            isOpen={showAdminLogin}
            onClose={() => setShowAdminLogin(false)}
            onLogin={handleAdminLogin}
            isDarkMode={isDarkMode}
          />
        </div>
      );
    }

    return (
      <PostWeddingRecap
        isDarkMode={isDarkMode}
        mediaItems={mediaItems}
        isAdmin={isAdmin}
        userName={userName || ''}
      />
    );
  }

  // Show loading while site status is being fetched
  if (siteStatus === null) {
    return (
      <div className={`min-h-screen flex items-center justify-center transition-colors duration-300 ${
        isDarkMode ? 'bg-gray-900' : 'bg-gray-50'
      }`}>
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 border-4 border-pink-500 border-t-transparent rounded-full animate-spin"></div>
          <p className={`text-lg transition-colors duration-300 ${
            isDarkMode ? 'text-white' : 'text-gray-900'
          }`}>
            Lade Website...
          </p>
        </div>
      </div>
    );
  }

  // Show under construction page if site is under construction
  if (siteStatus.isUnderConstruction) {
    return (
      <UnderConstructionPage 
        isDarkMode={isDarkMode} 
        toggleDarkMode={toggleDarkMode}
        siteStatus={siteStatus}
        isAdmin={isAdmin}
        onToggleAdmin={setIsAdmin}
      />
    );
  }

  if (showNamePrompt) {
    return <UserNamePrompt onSubmit={(name: string, profilePicture?: File) => {
      setUserName(name, profilePicture);
    }} isDarkMode={isDarkMode} />;
  }

  return (
    <div className={`min-h-screen transition-all duration-500 ${
      isDarkMode 
        ? 'bg-gray-900' 
        : 'bg-gradient-to-br from-gray-50 via-pink-50/30 to-purple-50/20'
    }`}>
      {/* Modern Instagram 2.0 Header */}
      <div className={`sticky top-0 z-50 transition-all duration-300 ${
        isDarkMode 
          ? 'bg-gray-900/70 border-gray-700/30 backdrop-blur-xl shadow-xl shadow-purple-500/5' 
          : 'bg-white/70 border-gray-200/30 backdrop-blur-xl shadow-xl shadow-pink-500/5'
      } border-b`}>
        <div className="max-w-md mx-auto px-4 sm:px-6 py-3 sm:py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center relative bg-transparent">
                {/* Animated Wedding Rings */}
                <div className="relative w-full h-full flex items-center justify-center">
                  {/* Ring 1 */}
                  <div className={`absolute w-4 h-4 rounded-full border-2 transition-all duration-1000 ${
                    isDarkMode ? 'border-yellow-300' : 'border-yellow-400'
                  }`} style={{
                    animation: 'ring-float-1 4s ease-in-out infinite',
                    transform: 'translateX(-2px)'
                  }}></div>
                  
                  {/* Ring 2 */}
                  <div className={`absolute w-4 h-4 rounded-full border-2 transition-all duration-1000 ${
                    isDarkMode ? 'border-yellow-300' : 'border-yellow-400'
                  }`} style={{
                    animation: 'ring-float-2 4s ease-in-out infinite',
                    transform: 'translateX(2px)'
                  }}></div>
                  
                  {/* Diamond sparkle effect */}
                  <div className={`absolute w-1 h-1 rounded-full transition-all duration-500 ${
                    isDarkMode ? 'bg-yellow-200' : 'bg-yellow-300'
                  }`} style={{
                    animation: 'sparkle 2s ease-in-out infinite',
                    top: '20%',
                    right: '20%'
                  }}></div>
                </div>
              </div>
              <h1 className={`text-base sm:text-lg font-bold tracking-tight transition-colors duration-300 ${
                isDarkMode ? 'text-white' : 'text-gray-900'
              }`}>
                kristinundmauro
              </h1>
            </div>
            <div className="flex items-center gap-1 sm:gap-2">
              {/* Notification Center */}
              {userName && (
                <NotificationCenter
                  userName={userName}
                  deviceId={deviceId}
                  isDarkMode={isDarkMode}
                  onNavigateToMedia={handleNavigateToMedia}
                />
              )}
              
              {/* Temporary Test Notification Button - For debugging */}
              {userName && isAdmin && (
                <button
                  onClick={async () => {
                    try {
                      await createTestNotification(userName, deviceId);
                      console.log('🧪 Test notification created successfully!');
                    } catch (error) {
                      console.error('❌ Failed to create test notification:', error);
                    }
                  }}
                  className={`p-2 rounded-full text-xs transition-all duration-300 ${
                    isDarkMode 
                      ? 'bg-purple-600 hover:bg-purple-700 text-white' 
                      : 'bg-purple-500 hover:bg-purple-600 text-white'
                  }`}
                  title="Create Test Notification"
                >
                  TEST
                </button>
              )}
              
              {/* Pure Glassmorphism Profile Edit Button */}
              <button
                onClick={() => setShowUserProfileModal(true)}
                className={`flex items-center gap-2 px-3 py-2 rounded-2xl transition-all duration-300 hover:scale-105 backdrop-blur-sm shadow-lg min-w-0 h-[40px] ${
                  isDarkMode 
                    ? 'bg-white/10 hover:bg-white/15 text-white border border-white/20 shadow-black/20' 
                    : 'bg-white/20 hover:bg-white/30 text-gray-800 border border-white/30 shadow-gray-500/20'
                }`}
                title="Mein Profil bearbeiten"
              >
                {currentUserProfile?.profilePicture ? (
                  <img 
                    src={currentUserProfile?.profilePicture || ''} 
                    alt="My Profile"
                    className="w-6 h-6 rounded-full object-cover ring-2 ring-white/30 shadow-sm flex-shrink-0"
                  />
                ) : (
                  <UserPlus className={`w-4 h-4 transition-colors duration-300 flex-shrink-0 ${
                    isDarkMode ? 'text-white/80' : 'text-gray-700'
                  }`} />
                )}
                <span className="text-sm font-medium truncate hidden sm:block max-w-16">Profil</span>
              </button>
              
              {/* Live User Indicator - Moved to right side */}
              <LiveUserIndicator 
                currentUser={userName || ''}
                isDarkMode={isDarkMode}
              />
              
              <button
                onClick={toggleDarkMode}
                className={`p-2 sm:p-2.5 rounded-full transition-all duration-300 touch-manipulation ${
                  isDarkMode 
                    ? 'text-yellow-400 hover:bg-gray-800/50 hover:scale-110' 
                    : 'text-gray-600 hover:bg-gray-100/50 hover:scale-110'
                }`}
              >
                {isDarkMode ? <Sun className="w-4 h-4 sm:w-5 sm:h-5" /> : <Moon className="w-4 h-4 sm:w-5 sm:h-5" />}
              </button>
              
            </div>
          </div>
        </div>
      </div>



      <div className="max-w-md mx-auto px-2 sm:px-0">
        <ProfileHeader 
          isDarkMode={isDarkMode} 
          isAdmin={isAdmin}
          userName={userName ?? undefined}
          mediaItems={mediaItems}
          onToggleAdmin={(status) => {
            if (status) {
              setShowAdminLogin(true);
            } else {
              handleAdminLogout();
            }
          }}
          currentUserProfile={currentUserProfile}
          onOpenUserProfile={() => setShowUserProfileModal(true)}
          showTopBarControls={false}
          showProfileEditModal={showProfileEditModal}
          onCloseProfileEditModal={() => setShowProfileEditModal(false)}
        />
        
        {/* Stories Bar */}
        <StoriesBar
          stories={stories}
          currentUser={userName || ''}
          onAddStory={() => setShowStoryUpload(true)}
          onViewStory={handleViewStory}
          isDarkMode={isDarkMode}
          storiesEnabled={siteStatus?.storiesEnabled ?? true}
        />
        
        {/* Tab Navigation */}
        <TabNavigation 
          activeTab={activeTab}
          onTabChange={handleTabChange}
          isDarkMode={isDarkMode}
          galleryEnabled={siteStatus?.galleryEnabled ?? true}
          musicWishlistEnabled={siteStatus?.musicWishlistEnabled ?? true}
        />

        {/* Tab Content */}
        {activeTab === 'gallery' && siteStatus?.galleryEnabled ? (
          <>
            <UploadSection
              onUpload={handleUpload}
              onVideoUpload={handleVideoUpload}
              onNoteSubmit={handleNoteSubmit}
              onAddStory={() => setShowStoryUpload(true)}
              isUploading={isUploading}
              progress={uploadProgress}
              isDarkMode={isDarkMode}
              storiesEnabled={siteStatus?.storiesEnabled ?? true}
            />

            {status && (
              <div className="px-4 py-2">
                <p className={`text-sm text-center transition-colors duration-300 ${
                  isDarkMode ? 'text-gray-300' : 'text-gray-700'
                }`} dangerouslySetInnerHTML={{ __html: status }} />
              </div>
            )}

            <InstagramGallery
              items={mediaItems}
              onItemClick={openModal}
              onDelete={handleDelete}
              onEditNote={handleEditNote}
              isAdmin={isAdmin}
              comments={comments}
              likes={likes}
              onAddComment={handleAddComment}
              onDeleteComment={handleDeleteComment}
              onToggleLike={handleToggleLike}
              userName={userName || ''}
              isDarkMode={isDarkMode}
              getUserAvatar={getUserAvatar}
              getUserDisplayName={getUserDisplayName}
              deviceId={deviceId || ''}
            />
          </>
        ) : activeTab === 'timeline' ? (
          <Timeline 
            isDarkMode={isDarkMode}
            userName={userName || ''}
            isAdmin={isAdmin}
          />
        ) : activeTab === 'music' && siteStatus?.musicWishlistEnabled ? (
          <MusicWishlist isDarkMode={isDarkMode} isAdmin={isAdmin} />
        ) : (
          <div className={`p-8 text-center transition-colors duration-300 ${
            isDarkMode ? 'text-gray-400' : 'text-gray-600'
          }`}>
            <p>Diese Funktion ist derzeit deaktiviert.</p>
          </div>
        )}
      </div>

      <MediaModal
        isOpen={modalOpen}
        items={mediaItems}
        currentIndex={currentImageIndex}
        onClose={() => setModalOpen(false)}
        onNext={nextImage}
        onPrev={prevImage}
        comments={comments}
        likes={likes}
        onAddComment={handleAddComment}
        onDeleteComment={handleDeleteComment}
        onToggleLike={handleToggleLike}
        userName={userName || ''}
        isAdmin={isAdmin}
        isDarkMode={isDarkMode}
        getUserAvatar={getUserAvatar}
        getUserDisplayName={getUserDisplayName}
      />

      {/* Stories Viewer */}
      <StoriesViewer
        isOpen={showStoriesViewer}
        stories={stories}
        initialStoryIndex={currentStoryIndex}
        currentUser={userName || ''}
        onClose={() => setShowStoriesViewer(false)}
        onStoryViewed={handleStoryViewed}
        onDeleteStory={handleDeleteStory}
        isAdmin={isAdmin}
        isDarkMode={isDarkMode}
      />

      {/* Story Upload Modal */}
      <StoryUploadModal
        isOpen={showStoryUpload}
        onClose={() => setShowStoryUpload(false)}
        onUpload={handleStoryUpload}
        isDarkMode={isDarkMode}
      />

      {/* Admin Login Modal */}
      <AdminLoginModal
        isOpen={showAdminLogin}
        onClose={() => setShowAdminLogin(false)}
        onLogin={handleAdminLogin}
        isDarkMode={isDarkMode}
      />

      {/* User Profile Modal */}
      {userName && deviceId && (
        <UserProfileModal
          isOpen={showUserProfileModal}
          onClose={() => setShowUserProfileModal(false)}
          userName={userName}
          deviceId={deviceId}
          isDarkMode={isDarkMode}
          onProfileUpdated={handleProfileUpdated}
          isAdmin={isAdmin}
          currentUserName={userName}
          currentDeviceId={deviceId}
        />
      )}

      <AdminPanel 
        isDarkMode={isDarkMode} 
        isAdmin={isAdmin}
        onToggleAdmin={(status) => {
          if (status) {
            setShowAdminLogin(true);
          } else {
            handleAdminLogout();
          }
        }}
        mediaItems={mediaItems}
        siteStatus={siteStatus}
        getUserAvatar={getUserAvatar}
        getUserDisplayName={getUserDisplayName}
      />

      {/* Back to Top Button */}
      <BackToTopButton isDarkMode={isDarkMode} />

      {/* Floating Admin Button - Bottom Left Corner */}
      {userName && (
        <div className="fixed bottom-4 left-4 z-50 flex flex-col gap-2">
          {/* Admin Toggle Button */}
          <button
            onClick={() => {
              if (isAdmin) {
                handleAdminLogout();
              } else {
                setShowAdminLogin(true);
              }
            }}
            className={`w-12 h-12 rounded-full transition-all duration-300 hover:scale-110 flex items-center justify-center shadow-lg ring-2 ${
              isDarkMode 
                ? 'bg-gray-800/90 hover:bg-gray-700/90 backdrop-blur-sm ring-gray-600/40 hover:ring-gray-500/60' 
                : 'bg-white/90 hover:bg-gray-50/90 backdrop-blur-sm ring-gray-300/40 hover:ring-gray-400/60'
            }`}
            title={isAdmin ? "Admin-Modus verlassen" : "Admin-Modus"}
          >
            {isAdmin ? (
              <Unlock className={`w-5 h-5 transition-colors duration-300 ${
                isDarkMode ? 'text-gray-300' : 'text-gray-600'
              }`} />
            ) : (
              <Lock className={`w-5 h-5 transition-colors duration-300 ${
                isDarkMode ? 'text-gray-300' : 'text-gray-600'
              }`} />
            )}
          </button>

          {/* Admin Site Settings - Only visible in admin mode */}
          {isAdmin && (
            <button
              onClick={() => setShowProfileEditModal(true)}
              className={`w-12 h-12 rounded-full transition-all duration-300 hover:scale-110 flex items-center justify-center shadow-lg ring-2 ${
                isDarkMode 
                  ? 'bg-gray-800/90 hover:bg-gray-700/90 backdrop-blur-sm ring-gray-600/40 hover:ring-gray-500/60' 
                  : 'bg-white/90 hover:bg-gray-50/90 backdrop-blur-sm ring-gray-300/40 hover:ring-gray-400/60'
              }`}
              title="Website-Profil bearbeiten"
            >
              <Settings className={`w-5 h-5 transition-colors duration-300 ${
                isDarkMode ? 'text-gray-300' : 'text-gray-600'
              }`} />
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export default App;