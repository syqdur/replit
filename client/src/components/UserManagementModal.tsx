import React, { useState, useEffect } from 'react';
import { X, Users, Smartphone, Wifi, WifiOff, Clock, RefreshCw, XCircle, Eye, Trash2, AlertTriangle, CheckSquare, Square } from 'lucide-react';
import { 
  collection, 
  query, 
  onSnapshot, 
  orderBy,
  where,
  getDocs,
  doc,
  deleteDoc,
  writeBatch
} from 'firebase/firestore';
import { db } from '../config/firebase';

interface UserManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  isDarkMode: boolean;
  getUserAvatar?: (userName: string, deviceId?: string) => string | null;
  getUserDisplayName?: (userName: string, deviceId?: string) => string;
}

interface LiveUser {
  id: string;
  userName: string;
  deviceId: string;
  lastSeen: string;
  isActive: boolean;
}

interface UserInfo {
  userName: string;
  deviceId: string;
  lastSeen: string;
  isOnline: boolean;
  contributionCount: number;
  lastActivity: string;
}

export const UserManagementModal: React.FC<UserManagementModalProps> = ({
  isOpen,
  onClose,
  isDarkMode,
  getUserAvatar,
  getUserDisplayName
}) => {
  const [users, setUsers] = useState<UserInfo[]>([]);
  const [liveUsers, setLiveUsers] = useState<LiveUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [error, setError] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [deletingUser, setDeletingUser] = useState<string | null>(null);
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [showBulkConfirm, setShowBulkConfirm] = useState(false);

  // Generate avatar URL with custom profile picture support
  const getAvatarUrl = (username: string, deviceId?: string) => {
    // Try to get custom avatar first
    const customAvatar = getUserAvatar?.(username, deviceId);
    if (customAvatar) return customAvatar;
    
    // Fallback to generated avatar
    return `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(username)}&backgroundColor=b6e3f4,c0aede,d1d4f9,ffd5dc,ffdfbf`;
  };

  // Get display name with fallback to username
  const getDisplayName = (username: string, deviceId?: string) => {
    const displayName = getUserDisplayName?.(username, deviceId);
    return (displayName && displayName !== username) ? displayName : username;
  };

  // Auto-refresh every 30 seconds
  useEffect(() => {
    if (!isOpen) return;

    const interval = setInterval(() => {
      setLastUpdate(new Date());
      loadUserData();
    }, 30000);

    return () => clearInterval(interval);
  }, [isOpen]);

  // Load user data when modal opens
  useEffect(() => {
    if (isOpen) {
      loadUserData();
    }
  }, [isOpen]);

  // Subscribe to live users with error handling
  useEffect(() => {
    if (!isOpen) return;

    console.log('👥 Subscribing to live users...');
    
    try {
      const q = query(
        collection(db, 'live_users'),
        orderBy('lastSeen', 'desc')
      );
      
      const unsubscribe = onSnapshot(q, (snapshot) => {
        try {
          const now = new Date();
          const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);
          const activeUsers: LiveUser[] = [];
          
          snapshot.docs.forEach(doc => {
            try {
              const data = doc.data();
              if (data && data.lastSeen && data.userName && data.deviceId) {
                const lastSeen = new Date(data.lastSeen);
                const isActive = lastSeen > fiveMinutesAgo;
                
                if (isActive) {
                  activeUsers.push({
                    id: doc.id,
                    userName: data.userName,
                    deviceId: data.deviceId,
                    lastSeen: data.lastSeen,
                    isActive: true
                  });
                }
              }
            } catch (docError) {
              console.warn('Error processing live user document:', docError);
            }
          });
          
          console.log(`👥 Found ${activeUsers.length} active users`);
          setLiveUsers(activeUsers);
          setError(null);
          
        } catch (snapshotError) {
          console.error('Error processing live users snapshot:', snapshotError);
          setError('Fehler beim Laden der Live-Benutzer');
        }
      }, (error) => {
        console.error('❌ Error loading live users:', error);
        setError('Fehler beim Laden der Live-Benutzer');
        setLiveUsers([]);
      });

      return unsubscribe;
    } catch (subscriptionError) {
      console.error('❌ Error setting up live users subscription:', subscriptionError);
      setError('Fehler beim Einrichten der Live-Benutzer-Überwachung');
      return () => {};
    }
  }, [isOpen]);

  const loadUserData = async () => {
    if (!isOpen) return;

    setIsLoading(true);
    setError(null);
    console.log('👥 === LOADING USER MANAGEMENT DATA ===');

    try {
      // Get all users from live_users collection (this has all visitors)
      const liveUsersQuery = query(collection(db, 'live_users'));
      const liveUsersSnapshot = await getDocs(liveUsersQuery);
      
      console.log(`📊 Found ${liveUsersSnapshot.docs.length} documents in live_users collection`);
      
      // Get all media items to count contributions
      const mediaQuery = query(collection(db, 'media'), orderBy('uploadedAt', 'desc'));
      const mediaSnapshot = await getDocs(mediaQuery);
      
      // Aggregate user data from live_users (all visitors)
      const userMap = new Map<string, UserInfo>();
      
      // First, add all visitors from live_users
      liveUsersSnapshot.docs.forEach((doc, index) => {
        try {
          const data = doc.data();
          console.log(`📋 Processing user ${index + 1}:`, {
            userName: data.userName,
            deviceId: data.deviceId?.substring(0, 8) + '...',
            lastSeen: data.lastSeen
          });
          
          if (data && data.userName && data.deviceId && data.lastSeen) {
            const key = `${data.userName}-${data.deviceId}`;
            
            if (!userMap.has(key)) {
              userMap.set(key, {
                userName: data.userName,
                deviceId: data.deviceId,
                lastSeen: data.lastSeen,
                isOnline: false,
                contributionCount: 0,
                lastActivity: data.lastSeen
              });
              console.log(`✅ Added user: ${data.userName}`);
            }
          } else {
            console.log(`❌ Invalid user data:`, data);
          }
        } catch (docError) {
          console.warn('Error processing live user document:', docError);
        }
      });
      
      // Then add contribution counts from media
      mediaSnapshot.docs.forEach(doc => {
        try {
          const data = doc.data();
          if (data && data.userName && data.deviceId && data.uploadedAt) {
            const key = `${data.userName}-${data.deviceId}`;
            
            if (!userMap.has(key)) {
              userMap.set(key, {
                userName: data.userName,
                deviceId: data.deviceId,
                lastSeen: data.uploadedAt,
                isOnline: false,
                contributionCount: 0,
                lastActivity: data.uploadedAt
              });
            }
            
            const user = userMap.get(key)!;
            user.contributionCount++;
            
            // Update last activity if this is more recent
            if (new Date(data.uploadedAt) > new Date(user.lastActivity)) {
              user.lastActivity = data.uploadedAt;
            }
          }
        } catch (docError) {
          console.warn('Error processing media document:', docError);
        }
      });
      
      // Convert to array and update with live status
      const allUsers = Array.from(userMap.values());
      
      // Update online status based on current liveUsers state
      const now = new Date();
      const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);
      
      allUsers.forEach(user => {
        try {
          // Check if user is currently online (last seen within 5 minutes)
          const lastSeenDate = new Date(user.lastSeen);
          user.isOnline = lastSeenDate > fiveMinutesAgo;
        } catch (userError) {
          console.warn('Error processing user data:', userError);
        }
      });
      
      // Sort by online status, then by last activity
      allUsers.sort((a, b) => {
        if (a.isOnline !== b.isOnline) {
          return a.isOnline ? -1 : 1; // Online users first
        }
        return new Date(b.lastActivity).getTime() - new Date(a.lastActivity).getTime();
      });
      
      console.log(`👥 Loaded ${allUsers.length} total users from live_users collection`);
      console.log(`🟢 ${allUsers.filter(u => u.isOnline).length} currently online`);
      
      setUsers(allUsers);
      
    } catch (error) {
      console.error('❌ Error loading user data:', error);
      setError('Fehler beim Laden der Benutzerdaten');
    } finally {
      setIsLoading(false);
    }
  };

  const bulkDeleteUsers = async () => {
    if (!showBulkConfirm) {
      setShowBulkConfirm(true);
      return;
    }

    setBulkDeleting(true);
    setShowBulkConfirm(false);

    try {
      console.log(`🗑️ Testing simple delete of ${selectedUsers.size} users`);
      
      // Just delete from live_users collection first to test
      const batch = writeBatch(db);
      let deletedCount = 0;

      for (const userKey of selectedUsers) {
        console.log(`🗑️ Processing: ${userKey}`);
        
        // Device IDs are 36 characters long with hyphens (UUID format)
        // So we take the last 36 characters as deviceId, everything before as userName
        const deviceId = userKey.slice(-36);
        const userName = userKey.slice(0, -37); // -36 for deviceId, -1 for the dash
        
        console.log(`  👤 User: "${userName}", Device: "${deviceId}"`);
        
        // Get all live_users docs to find the right one
        const liveUsersSnapshot = await getDocs(collection(db, 'live_users'));
        console.log(`  📊 Total live_users docs: ${liveUsersSnapshot.docs.length}`);
        
        liveUsersSnapshot.docs.forEach(doc => {
          const data = doc.data();
          console.log(`    🔍 Checking: ${data.userName} (${data.deviceId?.substring(0, 8)}...)`);
          
          if (data.deviceId === deviceId) {
            console.log(`    ✅ MATCH! Marking ${data.userName} for deletion`);
            batch.delete(doc.ref);
            deletedCount++;
          }
        });
      }

      if (deletedCount > 0) {
        console.log(`🗑️ Committing deletion of ${deletedCount} users...`);
        await batch.commit();
        console.log(`✅ Successfully deleted ${deletedCount} users`);
      } else {
        console.log(`⚠️ No users found to delete`);
      }
      
      // Clear selection and reload data
      setSelectedUsers(new Set());
      await loadUserData();
      
    } catch (error) {
      console.error('❌ Error in bulk delete:', error);
      setError('Fehler beim Löschen der Benutzer');
    } finally {
      setBulkDeleting(false);
    }
  };

  const toggleUserSelection = (userName: string, deviceId: string) => {
    const userKey = `${userName}-${deviceId}`;
    const newSelection = new Set(selectedUsers);
    
    if (newSelection.has(userKey)) {
      newSelection.delete(userKey);
    } else {
      newSelection.add(userKey);
    }
    
    setSelectedUsers(newSelection);
  };

  const selectAllUsers = () => {
    if (selectedUsers.size === users.length) {
      setSelectedUsers(new Set());
    } else {
      const allUserKeys = users.map(user => `${user.userName}-${user.deviceId}`);
      setSelectedUsers(new Set(allUserKeys));
    }
  };

  const deleteUser = async (userName: string, deviceId: string) => {
    const userKey = `${userName}-${deviceId}`;
    
    if (deleteConfirm !== userKey) {
      setDeleteConfirm(userKey);
      return;
    }

    setDeletingUser(userKey);
    setDeleteConfirm(null);

    try {
      console.log(`🗑️ Deleting user: ${userName} (${deviceId})`);
      
      const batch = writeBatch(db);
      
      // Delete from live_users collection
      const liveUsersQuery = query(
        collection(db, 'live_users'),
        where('deviceId', '==', deviceId)
      );
      const liveUsersSnapshot = await getDocs(liveUsersQuery);
      liveUsersSnapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
      });
      
      // Delete all media uploaded by this user
      const mediaQuery = query(
        collection(db, 'media'),
        where('deviceId', '==', deviceId)
      );
      const mediaSnapshot = await getDocs(mediaQuery);
      mediaSnapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
      });
      
      // Delete all comments by this user
      const commentsQuery = query(
        collection(db, 'comments'),
        where('deviceId', '==', deviceId)
      );
      const commentsSnapshot = await getDocs(commentsQuery);
      commentsSnapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
      });
      
      // Delete all likes by this user
      const likesQuery = query(
        collection(db, 'likes'),
        where('deviceId', '==', deviceId)
      );
      const likesSnapshot = await getDocs(likesQuery);
      likesSnapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
      });
      
      // Delete all stories by this user
      const storiesQuery = query(
        collection(db, 'stories'),
        where('deviceId', '==', deviceId)
      );
      const storiesSnapshot = await getDocs(storiesQuery);
      storiesSnapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
      });
      
      await batch.commit();
      
      console.log(`✅ Successfully deleted user: ${userName}`);
      
      // Reload user data
      await loadUserData();
      
    } catch (error) {
      console.error('❌ Error deleting user:', error);
      setError('Fehler beim Löschen des Benutzers');
    } finally {
      setDeletingUser(null);
    }
  };

  const formatTimeAgo = (dateString: string) => {
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
      
      if (diffInMinutes < 1) return 'gerade eben';
      if (diffInMinutes < 60) return `vor ${diffInMinutes}m`;
      
      const diffInHours = Math.floor(diffInMinutes / 60);
      if (diffInHours < 24) return `vor ${diffInHours}h`;
      
      const diffInDays = Math.floor(diffInHours / 24);
      return `vor ${diffInDays}d`;
    } catch (error) {
      console.warn('Error formatting time:', error);
      return 'unbekannt';
    }
  };

  const stats = {
    totalUsers: users.length,
    onlineUsers: users.filter(u => u.isOnline).length,
    totalContributions: users.reduce((sum, u) => sum + u.contributionCount, 0)
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className={`rounded-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden transition-colors duration-300 ${
        isDarkMode ? 'bg-gray-800' : 'bg-white'
      }`}>
        {/* Header */}
        <div className={`flex items-center justify-between p-6 border-b transition-colors duration-300 ${
          isDarkMode ? 'border-gray-700' : 'border-gray-200'
        }`}>
          <div className="flex items-center gap-3">
            <div className={`p-3 rounded-full transition-colors duration-300 ${
              isDarkMode ? 'bg-cyan-600' : 'bg-cyan-500'
            }`}>
              <Users className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className={`text-xl font-semibold transition-colors duration-300 ${
                isDarkMode ? 'text-white' : 'text-gray-900'
              }`}>
                👥 User Management
              </h3>
              <p className={`text-sm transition-colors duration-300 ${
                isDarkMode ? 'text-gray-400' : 'text-gray-600'
              }`}>
                Alle Benutzer und deren Status im Überblick
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {selectedUsers.size > 0 && (
              <div className="flex items-center gap-2">
                <span className={`text-sm font-medium transition-colors duration-300 ${
                  isDarkMode ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  {selectedUsers.size} ausgewählt
                </span>
                {bulkDeleting ? (
                  <div className="flex items-center gap-2 px-3 py-1 rounded-lg bg-red-500 text-white">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span className="text-sm">Löschen...</span>
                  </div>
                ) : showBulkConfirm ? (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={bulkDeleteUsers}
                      className="px-3 py-1 rounded-lg bg-red-500 hover:bg-red-600 text-white text-sm transition-colors duration-200"
                      title="Löschen bestätigen"
                    >
                      <AlertTriangle className="w-4 h-4 inline mr-1" />
                      Bestätigen
                    </button>
                    <button
                      onClick={() => setShowBulkConfirm(false)}
                      className={`px-3 py-1 rounded-lg text-sm transition-colors duration-200 ${
                        isDarkMode 
                          ? 'bg-gray-600 hover:bg-gray-500 text-gray-300' 
                          : 'bg-gray-300 hover:bg-gray-400 text-gray-700'
                      }`}
                    >
                      Abbrechen
                    </button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        console.log('🧪 TESTING SELECTION:');
                        console.log('Selected users:', Array.from(selectedUsers));
                        selectedUsers.forEach(userKey => {
                          const deviceId = userKey.slice(-36);
                          const userName = userKey.slice(0, -37);
                          console.log(`  "${userName}" -> "${deviceId}"`);
                        });
                      }}
                      className="px-2 py-1 rounded bg-blue-500 hover:bg-blue-600 text-white text-xs"
                    >
                      Test
                    </button>
                    <button
                      onClick={bulkDeleteUsers}
                      className="px-3 py-1 rounded-lg bg-red-500 hover:bg-red-600 text-white text-sm transition-colors duration-200"
                      title="Ausgewählte Benutzer löschen"
                    >
                      <Trash2 className="w-4 h-4 inline mr-1" />
                      Löschen
                    </button>
                  </div>
                )}
              </div>
            )}
            <button
              onClick={loadUserData}
              disabled={isLoading}
              className={`p-2 rounded-full transition-colors duration-300 ${
                isLoading
                  ? 'cursor-not-allowed opacity-50'
                  : isDarkMode 
                    ? 'hover:bg-gray-700 text-gray-400' 
                    : 'hover:bg-gray-100 text-gray-600'
              }`}
              title="Daten aktualisieren"
            >
              <RefreshCw className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className={`p-2 rounded-full transition-colors duration-300 ${
                isDarkMode ? 'hover:bg-gray-700 text-gray-400' : 'hover:bg-gray-100 text-gray-600'
              }`}
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
          {/* Error Display */}
          {error && (
            <div className={`mb-6 p-4 rounded-xl border transition-colors duration-300 ${
              isDarkMode 
                ? 'bg-red-900/20 border-red-700/30 text-red-300' 
                : 'bg-red-50 border-red-200 text-red-700'
            }`}>
              <div className="flex items-center gap-2">
                <XCircle className="w-5 h-5" />
                <div>
                  <div className="font-semibold">Fehler beim Laden der Daten</div>
                  <div className="text-sm mt-1">{error}</div>
                </div>
              </div>
            </div>
          )}

          {/* Statistics Cards */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className={`p-4 rounded-xl transition-colors duration-300 ${
              isDarkMode ? 'bg-gray-700/50 border border-gray-600' : 'bg-gray-50 border border-gray-200'
            }`}>
              <div className="flex items-center gap-2 mb-2">
                <Users className={`w-4 h-4 transition-colors duration-300 ${
                  isDarkMode ? 'text-blue-400' : 'text-blue-600'
                }`} />
                <span className={`text-sm font-medium transition-colors duration-300 ${
                  isDarkMode ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  Gesamt
                </span>
              </div>
              <div className={`text-2xl font-bold transition-colors duration-300 ${
                isDarkMode ? 'text-white' : 'text-gray-900'
              }`}>
                {stats.totalUsers}
              </div>
              <div className={`text-xs transition-colors duration-300 ${
                isDarkMode ? 'text-gray-500' : 'text-gray-500'
              }`}>
                Benutzer
              </div>
            </div>

            <div className={`p-4 rounded-xl transition-colors duration-300 ${
              isDarkMode ? 'bg-gray-700/50 border border-gray-600' : 'bg-gray-50 border border-gray-200'
            }`}>
              <div className="flex items-center gap-2 mb-2">
                <Wifi className={`w-4 h-4 transition-colors duration-300 ${
                  isDarkMode ? 'text-green-400' : 'text-green-600'
                }`} />
                <span className={`text-sm font-medium transition-colors duration-300 ${
                  isDarkMode ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  Online
                </span>
              </div>
              <div className={`text-2xl font-bold transition-colors duration-300 ${
                isDarkMode ? 'text-green-400' : 'text-green-600'
              }`}>
                {stats.onlineUsers}
              </div>
              <div className={`text-xs transition-colors duration-300 ${
                isDarkMode ? 'text-gray-500' : 'text-gray-500'
              }`}>
                Aktiv (5min)
              </div>
            </div>

            <div className={`p-4 rounded-xl transition-colors duration-300 ${
              isDarkMode ? 'bg-gray-700/50 border border-gray-600' : 'bg-gray-50 border border-gray-200'
            }`}>
              <div className="flex items-center gap-2 mb-2">
                <Eye className={`w-4 h-4 transition-colors duration-300 ${
                  isDarkMode ? 'text-pink-400' : 'text-pink-600'
                }`} />
                <span className={`text-sm font-medium transition-colors duration-300 ${
                  isDarkMode ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  Beiträge
                </span>
              </div>
              <div className={`text-2xl font-bold transition-colors duration-300 ${
                isDarkMode ? 'text-pink-400' : 'text-pink-600'
              }`}>
                {stats.totalContributions}
              </div>
              <div className={`text-xs transition-colors duration-300 ${
                isDarkMode ? 'text-gray-500' : 'text-gray-500'
              }`}>
                Gesamt
              </div>
            </div>
          </div>

          {/* Last Update Info */}
          <div className={`flex items-center justify-between mb-4 text-sm transition-colors duration-300 ${
            isDarkMode ? 'text-gray-400' : 'text-gray-600'
          }`}>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              <span>Letztes Update: {lastUpdate.toLocaleTimeString('de-DE')}</span>
            </div>
            <div className="flex items-center gap-2">
              <RefreshCw className="w-4 h-4" />
              <span>Auto-Refresh: 30s</span>
            </div>
          </div>

          {/* Loading State */}
          {isLoading && (
            <div className="flex items-center justify-center py-8">
              <div className="flex items-center gap-3">
                <div className="w-6 h-6 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin"></div>
                <span className={`transition-colors duration-300 ${
                  isDarkMode ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  Lade Benutzerdaten...
                </span>
              </div>
            </div>
          )}

          {/* Users Table */}
          {!isLoading && users.length > 0 && (
            <div className={`rounded-xl border overflow-hidden transition-colors duration-300 ${
              isDarkMode ? 'border-gray-700' : 'border-gray-200'
            }`}>
              <div className={`overflow-x-auto transition-colors duration-300 ${
                isDarkMode ? 'bg-gray-800' : 'bg-white'
              }`}>
                <table className="w-full">
                  <thead className={`transition-colors duration-300 ${
                    isDarkMode ? 'bg-gray-700' : 'bg-gray-50'
                  }`}>
                    <tr>
                      <th className={`px-4 py-3 text-left text-xs font-medium uppercase tracking-wider transition-colors duration-300 ${
                        isDarkMode ? 'text-gray-300' : 'text-gray-500'
                      }`}>
                        <button
                          onClick={selectAllUsers}
                          className={`flex items-center gap-2 hover:opacity-75 transition-opacity duration-200`}
                          title={selectedUsers.size === users.length ? "Alle abwählen" : "Alle auswählen"}
                        >
                          {selectedUsers.size === users.length ? (
                            <CheckSquare className="w-4 h-4" />
                          ) : (
                            <Square className="w-4 h-4" />
                          )}
                          Auswahl
                        </button>
                      </th>
                      <th className={`px-4 py-3 text-left text-xs font-medium uppercase tracking-wider transition-colors duration-300 ${
                        isDarkMode ? 'text-gray-300' : 'text-gray-500'
                      }`}>
                        Benutzer
                      </th>
                      <th className={`px-4 py-3 text-left text-xs font-medium uppercase tracking-wider transition-colors duration-300 ${
                        isDarkMode ? 'text-gray-300' : 'text-gray-500'
                      }`}>
                        Status
                      </th>
                      <th className={`px-4 py-3 text-left text-xs font-medium uppercase tracking-wider transition-colors duration-300 ${
                        isDarkMode ? 'text-gray-300' : 'text-gray-500'
                      }`}>
                        Aktivität
                      </th>
                      <th className={`px-4 py-3 text-left text-xs font-medium uppercase tracking-wider transition-colors duration-300 ${
                        isDarkMode ? 'text-gray-300' : 'text-gray-500'
                      }`}>
                        Beiträge
                      </th>
                      <th className={`px-4 py-3 text-left text-xs font-medium uppercase tracking-wider transition-colors duration-300 ${
                        isDarkMode ? 'text-gray-300' : 'text-gray-500'
                      }`}>
                        Aktionen
                      </th>
                    </tr>
                  </thead>
                  <tbody className={`divide-y transition-colors duration-300 ${
                    isDarkMode ? 'divide-gray-700' : 'divide-gray-200'
                  }`}>
                    {users.map((user, index) => {
                      const userKey = `${user.userName}-${user.deviceId}`;
                      const isSelected = selectedUsers.has(userKey);
                      
                      return (
                        <tr key={userKey} className={`transition-colors duration-300 ${
                          isSelected 
                            ? isDarkMode ? 'bg-blue-900/30' : 'bg-blue-50'
                            : isDarkMode ? 'hover:bg-gray-700/50' : 'hover:bg-gray-50'
                        }`}>
                          {/* Selection Checkbox */}
                          <td className="px-4 py-4">
                            <button
                              onClick={() => toggleUserSelection(user.userName, user.deviceId)}
                              className={`p-1 rounded transition-colors duration-200 ${
                                isSelected
                                  ? 'text-blue-500'
                                  : isDarkMode ? 'text-gray-400 hover:text-gray-300' : 'text-gray-500 hover:text-gray-700'
                              }`}
                            >
                              {isSelected ? (
                                <CheckSquare className="w-5 h-5" />
                              ) : (
                                <Square className="w-5 h-5" />
                              )}
                            </button>
                          </td>
                          
                          {/* User Info */}
                          <td className="px-4 py-4">
                            <div className="flex items-center gap-3">
                              <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold transition-colors duration-300 ${
                                user.isOnline
                                  ? isDarkMode ? 'bg-green-600 text-white' : 'bg-green-500 text-white'
                                  : isDarkMode ? 'bg-gray-600 text-gray-300' : 'bg-gray-300 text-gray-700'
                              }`}>
                                <img 
                                  src={getAvatarUrl(user.userName, user.deviceId)}
                                  alt={user.userName}
                                  className="w-full h-full object-cover"
                                />
                              </div>
                              <div>
                                <div className={`font-medium transition-colors duration-300 ${
                                  isDarkMode ? 'text-white' : 'text-gray-900'
                                }`}>
                                  {getDisplayName(user.userName, user.deviceId)}
                                </div>
                                <div className={`text-xs font-mono transition-colors duration-300 ${
                                  isDarkMode ? 'text-gray-400' : 'text-gray-500'
                                }`}>
                                  {user.deviceId.substring(0, 8)}...
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* Online Status */}
                          <td className="px-4 py-4">
                            <div className="flex items-center gap-2">
                              {user.isOnline ? (
                                <>
                                  <Wifi className="w-4 h-4 text-green-500" />
                                  <span className={`text-sm font-medium transition-colors duration-300 ${
                                    isDarkMode ? 'text-green-400' : 'text-green-600'
                                  }`}>
                                    Online
                                  </span>
                                </>
                              ) : (
                                <>
                                  <WifiOff className="w-4 h-4 text-gray-500" />
                                  <span className={`text-sm transition-colors duration-300 ${
                                    isDarkMode ? 'text-gray-400' : 'text-gray-600'
                                  }`}>
                                    Offline
                                  </span>
                                </>
                              )}
                            </div>
                            <div className={`text-xs mt-1 transition-colors duration-300 ${
                              isDarkMode ? 'text-gray-500' : 'text-gray-500'
                            }`}>
                              {formatTimeAgo(user.lastSeen)}
                            </div>
                          </td>

                          {/* Last Activity */}
                          <td className="px-4 py-4">
                            <div className={`text-sm transition-colors duration-300 ${
                              isDarkMode ? 'text-gray-300' : 'text-gray-700'
                            }`}>
                              {formatTimeAgo(user.lastActivity)}
                            </div>
                            <div className={`text-xs transition-colors duration-300 ${
                              isDarkMode ? 'text-gray-500' : 'text-gray-500'
                            }`}>
                              Letzte Aktivität
                            </div>
                          </td>

                          {/* Contributions */}
                          <td className="px-4 py-4">
                            <div className={`text-sm font-medium transition-colors duration-300 ${
                              isDarkMode ? 'text-white' : 'text-gray-900'
                            }`}>
                              {user.contributionCount}
                            </div>
                            <div className={`text-xs transition-colors duration-300 ${
                              isDarkMode ? 'text-gray-500' : 'text-gray-500'
                            }`}>
                              Beiträge
                            </div>
                          </td>

                          {/* Actions */}
                          <td className="px-4 py-4">
                            <div className="flex items-center gap-2">
                              {deletingUser === `${user.userName}-${user.deviceId}` ? (
                                <div className="flex items-center gap-2">
                                  <div className="w-4 h-4 border-2 border-red-500 border-t-transparent rounded-full animate-spin"></div>
                                  <span className={`text-xs transition-colors duration-300 ${
                                    isDarkMode ? 'text-gray-400' : 'text-gray-600'
                                  }`}>
                                    Löschen...
                                  </span>
                                </div>
                              ) : deleteConfirm === `${user.userName}-${user.deviceId}` ? (
                                <div className="flex items-center gap-2">
                                  <button
                                    onClick={() => deleteUser(user.userName, user.deviceId)}
                                    className="p-1 rounded bg-red-500 hover:bg-red-600 text-white transition-colors duration-200"
                                    title="Löschen bestätigen"
                                  >
                                    <AlertTriangle className="w-3 h-3" />
                                  </button>
                                  <button
                                    onClick={() => setDeleteConfirm(null)}
                                    className={`p-1 rounded transition-colors duration-200 ${
                                      isDarkMode 
                                        ? 'bg-gray-600 hover:bg-gray-500 text-gray-300' 
                                        : 'bg-gray-300 hover:bg-gray-400 text-gray-700'
                                    }`}
                                    title="Abbrechen"
                                  >
                                    <X className="w-3 h-3" />
                                  </button>
                                </div>
                              ) : (
                                <button
                                  onClick={() => deleteUser(user.userName, user.deviceId)}
                                  className={`p-2 rounded-full transition-colors duration-200 ${
                                    isDarkMode 
                                      ? 'hover:bg-red-900/30 text-red-400 hover:text-red-300' 
                                      : 'hover:bg-red-50 text-red-500 hover:text-red-600'
                                  }`}
                                  title="Benutzer löschen"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Empty State */}
          {!isLoading && users.length === 0 && !error && (
            <div className="text-center py-12">
              <Users className={`w-16 h-16 mx-auto mb-4 transition-colors duration-300 ${
                isDarkMode ? 'text-gray-600' : 'text-gray-400'
              }`} />
              <h3 className={`text-lg font-medium mb-2 transition-colors duration-300 ${
                isDarkMode ? 'text-white' : 'text-gray-900'
              }`}>
                Keine Benutzer gefunden
              </h3>
              <p className={`text-sm transition-colors duration-300 ${
                isDarkMode ? 'text-gray-400' : 'text-gray-600'
              }`}>
                Es wurden noch keine Benutzeraktivitäten aufgezeichnet.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className={`p-4 border-t text-center transition-colors duration-300 ${
          isDarkMode ? 'border-gray-700' : 'border-gray-200'
        }`}>
          <button
            onClick={onClose}
            className={`py-2 px-6 rounded-xl transition-colors duration-300 ${
              isDarkMode 
                ? 'bg-gray-600 hover:bg-gray-500 text-gray-200' 
                : 'bg-gray-300 hover:bg-gray-400 text-gray-700'
            }`}
          >
            Schließen
          </button>
        </div>
      </div>
    </div>
  );
};